# Research Summary: v1.3 Prospection

**Project:** Next-ESN
**Domain:** Signal-based B2B prospecting pipeline for ESN (Entreprises de Services Numériques)
**Researched:** 2026-07-03
**Confidence:** HIGH

---

## Executive Summary

v1.3 Prospection adds a signal-based B2B lead pipeline to an existing Next.js/Supabase/Vercel AI SDK SaaS. The approach is to build a server-side automation engine that ingests signals from French public APIs (INSEE SIRENE, France Travail, Pappers, BOAMP/DECP), computes a deterministic heat score with recency decay, generates an LLM-synthesized call pitch grounded in real signals, and gates expensive contact enrichment (Dropcontact for email, Kaspr for phone) behind the heat threshold. The architecture is a new domain under `/prospection` that reuses all existing infrastructure — `@workflow/next` workflows, React Query, Supabase RLS, cron routes — without touching any existing table or API route.

The single most important constraint is that **Proxycurl is permanently dead** (shut down July 2025 after a LinkedIn lawsuit). Any `lib/radar/` code that references Proxycurl is broken at runtime and must not be copied or extended. The replacement for LinkedIn headcount signals is ScrapIn (same API shape, same legal zone — use defensively, low volume, heat-gated). For email enrichment the replacement is Dropcontact, the only CNIL-audited, zero-database FR enrichment provider. This Proxycurl migration must be resolved in Phase 1 before any collector code is written.

The main execution risk is cost explosion from unconstrained cron + per-credit enrichment. Mitigation is structural: TTL columns on all signal and contact rows must be in the DB schema from day one (not retrofitted), the enrichment gate must be enforced in code not just documented, and a per-org credit cap must be designed in. RGPD obligations on contact data are non-negotiable in France — `gdpr_retention_expires_at` and `contact_source` columns on the contacts table, plus a 3-year cleanup job, are hard requirements at schema creation time.

---

## Key Findings

### Recommended Stack

No new npm packages are required. All signal providers expose REST APIs consumed via native `fetch` from Next.js API routes or `@workflow/next` workflow steps.

**Signal provider stack (resolved):**

- **INSEE SIRENE API** — free; company identity + SIREN (canonical reconciliation key)
- **Pappers API** — ~€50-200/mo credits; revenue trends, directors, BODACC legal notices
- **France Travail API** — free (OAuth2); official French job postings, primary hiring intent signal
- **BOAMP + DECP** — free (open data); public tender awards, high ESN relevance
- **ScrapIn** — ~$49-149/mo; LinkedIn headcount + job changes; replaces Proxycurl; heat-gated only
- **Crunchbase Basic** — $49/mo; Series A+ fundraising (Dealroom at €12.5k/year is deferred)
- **Dropcontact** — ~€99/mo (API tier); primary email enrichment; CNIL-audited, zero-database, 94% FR coverage
- **Kaspr** — ~€45-79/mo; phone enrichment only; CNIL compliance closure confirmed March 2026

**Explicitly excluded:** Proxycurl (dead), Apollo.io (GDPR risk), Dealroom (prohibitive price), Pharow (not API-first), Nomination.fr (deferred to v1.4)

**Reconciled conflict — FEATURES.md references Proxycurl:** Any Proxycurl reference in FEATURES.md must be read as ScrapIn (headcount/job-changes, heat-gated) + Dropcontact (email enrichment). This is authoritative per STACK.md and PITFALLS.md.

### Expected Features

**Must have (table stakes):**
- Hot company list ranked by heat score (0-100)
- Human-readable signal justification per company
- LLM-generated call pitch tailored to ESN context (profiles to place)
- Decision-maker contact reveal — one DRH/CTO per company, gated by heat score threshold
- Actionable status per company (to call / called / dismissed)
- Automation CRUD (sector/size/geo/profiles criteria)
- Manual run trigger ("Run now")
- Signal source badges per company (score must be explainable without reading LLM text)
- Deduplication by SIREN across automations

**Should have (competitive differentiators):**
- Contact reveal gated by configurable heat threshold — more cost-effective than enriching all records
- Multiple automations per org — one per vertical (fintech, healthcare, public sector)
- Profiles-to-place field in automation config, injected into LLM pitch
- Heat score recency decay — prevents stale signals keeping companies hot indefinitely

**Defer (v1.3.x / v2+):**
- Email notification digest
- BOAMP/public tender signals (v1.3.x if France Travail + funding prove insufficient)
- Candidate → hot company matching
- Snooze, multi-user assignment, CRM pipeline

### Architecture Approach

The prospection domain is a net-new vertical that reuses all existing infrastructure without modifying any existing table or route. The pipeline follows the existing `lib/radar/` workflow pattern — but with three improvements: dedicated `prospection_contacts` table (not JSONB blob), scoring and collection as separate workflow steps, and a single workflow per automation run.

**Major components:**

1. **7 new Supabase tables** — `prospection_automations`, `prospection_companies` (SIREN-keyed, UNIQUE(org_id, siren)), `prospection_signals` (TTL 90d), `prospection_scores`, `prospection_contacts` (with `gdpr_retention_expires_at`), `prospection_run_logs`, `prospection_actions`; all org-scoped with RLS
2. **`lib/prospection/collectors/`** — one file per signal source; each wraps in try-catch and returns partial results so one unavailable source does not abort the full pipeline
3. **`app/api/prospection/workflows/collect-signals.workflow.ts`** — single workflow per automation run: fetchConfig → runCollectors (parallel Promise.all in one step) → reconcileSignals → scoreCompanies → enrichHotContacts (gated) → logRun
4. **`lib/prospection/scoring.ts`** (deterministic rule engine) + **`lib/prospection/scoring-llm.ts`** (LLM synthesis from structured signal list only, never raw text)
5. **Dual-trigger cron route** — GET (Vercel cron, CRON_SECRET check, 200 immediate) + POST (manual trigger, returns runId); Supabase advisory lock for idempotency

### Critical Pitfalls

1. **Proxycurl is gone** — audit `lib/radar/` before using as template; replace with ScrapIn + Dropcontact; must be resolved in Phase 1 before any collector is written
2. **RGPD contact data** — `gdpr_retention_expires_at`, `contact_source`, `contact_sourced_at` are schema requirements at table creation; 3-year cleanup job; data provenance notice in UI; CNIL enforcement is active (900K€ fine in 2025)
3. **API cost explosion** — `signal_last_fetched_at` + TTL gating on all API calls; 7-day cache on contact enrichment; hard limit of 20 enrichments per run; must be in schema from day one
4. **Entity resolution** — `UNIQUE(org_id, siren)` constraint enforced; SIRENE lookup at ingestion for all sources lacking SIREN; never merge on company name alone
5. **`@workflow/next` has no native idempotency** — Supabase advisory lock or `cron_runs` running-row check before each automation run; cron route returns 200 immediately without blocking
6. **LLM scoring opacity** — score must come from rule engine; LLM receives structured signal list only; `signal_snapshot` stored with every score; monitor 20 pitches for hallucination before shipping

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: DB + Schema Foundation + Proxycurl Audit

**Rationale:** Every subsequent phase depends on the schema being correct. SIREN uniqueness, TTL columns, and RGPD columns cannot be added cheaply after data exists. The Proxycurl audit must also close here — no collector phase should begin without confirmed provider replacements.
**Delivers:** 7 new tables (migration), Zod schemas for all entities, SIREN reconciliation query (`findOrCreateProspectCompany`), basic CRUD. Proxycurl audit complete; `lib/radar/` reviewed for dead references; ScrapIn + Dropcontact confirmed as drop-ins.
**Addresses:** SIREN deduplication, RGPD contact schema, API cost TTL structure
**Avoids:** Entity resolution failures, RGPD retrofit, API cost explosion

### Phase 2: First Collector + Deterministic Scoring + Cron Infrastructure

**Rationale:** France Travail is free with no credit risk — the safest first end-to-end pipeline validation. Deterministic scoring must be proven before LLM is layered on. Cron idempotency must ship with the first cron-enabled code.
**Delivers:** France Travail collector, `computeProspectScore()` rule engine, `collectSignalsWorkflow` skeleton, dual-trigger cron route, Vercel cron entry, Supabase advisory lock. End-to-end: trigger → signals → scores in DB.
**Uses:** France Travail OAuth2 (free), existing workflow step pattern, existing dual-trigger cron pattern
**Avoids:** LLM scoring opacity (baseline scoring verified first), `@workflow/next` duplicate run issues

### Phase 3: Additional Collectors + SIREN Resolution

**Rationale:** Multi-source signals are required for a meaningful heat score. SIREN resolution must be exercised with real multi-source conflicts. ScrapIn (legally sensitive) validated at low volume before LLM or enrichment phases.
**Delivers:** SIRENE/INSEE collector, Pappers collector (financial signals), ScrapIn collector (headcount + job changes, gated). SIREN reconciliation tested with multi-source conflicts.
**Avoids:** Entity resolution failures under real conditions; ScrapIn legal risk mitigated by low volume + heat gating

### Phase 4: LLM Score Synthesis

**Rationale:** Deterministic scoring is verified (Phases 2-3) before LLM is added on top. The LLM receives only a structured signal list — never raw text or news headlines — to prevent hallucination.
**Delivers:** `scoring-llm.ts` with `generateScoreSynthesis()`, `PROSPECTION_SCORE_SYNTHESIS` DB task key + prompt row, `justification` and `call_pitch` persisted to `prospection_scores`. Human review of 20 pitches before enabling in production.
**Uses:** existing `resolveLlmTask`, `generateText` (not `streamText`), `logAiUsage`
**Avoids:** LLM scoring opacity (score is deterministic at this point), hallucinated pitches

### Phase 5: Contact Enrichment (Heat-Gated)

**Rationale:** The most expensive operation per-credit. Gate enforcement (score >= threshold, 7-day cache, 20/run hard limit) and RGPD retention cleanup must be validated in staging before production cron is enabled.
**Delivers:** `enrichHotProspectContacts()` with all gates enforced, `prospection_contacts` wired, Dropcontact integration, contacts visible in company detail. RGPD cleanup job verified in staging.
**Avoids:** API cost explosion, RGPD non-compliance

### Phase 6: Automation UI + Company List + Actions

**Rationale:** UI is built last, on top of a verified pipeline. Status tracking (`to_call / called / dismissed`) must ship with the list — a list without status is unusable after day 2.
**Delivers:** `/prospection/settings` (automation CRUD), `/prospection` (ranked list with signal badges, status filter, manual run button), `/prospection/[companyId]` (detail: signals timeline, contacts, call pitch, action buttons), sidebar nav entry.
**Implements:** React Query hooks, run status polling (2s while running, invalidate on completion), `prospection_actions` route
**Avoids:** UX pitfalls — signal timestamps, score explainability via badges, and status tracking all present at launch

### Phase Ordering Rationale

- Schema before collectors: TTL and SIREN uniqueness constraints are prohibitively expensive to add after signal data accumulates
- Deterministic scoring before LLM: LLM grounding cannot be validated if the score baseline is unknown
- Collectors before LLM: LLM synthesis requires real signals to synthesize (not mock data)
- Contact enrichment before UI: the "Voir le contact" CTA must be backed by a validated gate, not a UI assumption
- UI last: prevents building on an unverified pipeline; guarantees status tracking ships with the list, not after

### Research Flags

Phases needing careful implementation or monitoring:
- **Phase 3 (ScrapIn):** LinkedIn scraping legal status should be rechecked before launch. Monitor ScrapIn announcements. Low volume + heat-gating is the mitigation, not a guarantee. Have a fallback plan: Pappers effectif trends + France Travail job-posting frequency as a headcount-growth proxy.
- **Phase 4 (LLM synthesis):** Prompt engineering for structured-grounded pitches in French needs iteration; plan for a manual review cycle (20 pitches) before enabling in production cron.
- **Phase 5 (Dropcontact async):** Dropcontact uses an async batch API (POST job + poll/webhook). The webhook vs. polling strategy needs a test integration before the enrichment step is production-ready. Confirm Kaspr API availability at Starter tier (listed as "on request").

Phases with standard patterns (no additional research needed):
- **Phase 1 (DB + schema):** Direct SQL migration following existing codebase conventions; no novel patterns
- **Phase 2 (France Travail + cron):** Free API, well-documented; existing dual-trigger cron pattern maps directly
- **Phase 6 (UI):** Follows existing React Query + shadcn component patterns throughout the codebase

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All provider decisions based on official docs and confirmed legal events (Proxycurl shutdown via founder; Kaspr CNIL closure via official CNIL page) |
| Features | HIGH | Competitor feature matrix grounded in official sites; ESN market gap well-supported |
| Architecture | HIGH | Directly mirrors existing radar domain patterns; integration points verified against actual codebase files |
| Pitfalls | HIGH | Legal pitfalls verified via CNIL and founder statements; technical pitfalls from confirmed `@workflow/next` GitHub issues |

**Overall confidence:** HIGH

### Gaps to Address

- **ScrapIn rate limits:** Volume limits not publicly documented. Validate in staging with a representative company list before enabling cron. Define a pure-fallback signal set (Pappers effectif + France Travail frequency) if ScrapIn becomes legally untenable.
- **Dropcontact webhook reliability:** Async enrichment (POST + poll/webhook) needs a test integration before Phase 5 production deployment.
- **France Travail token refresh in cron:** OAuth2 token expiry causes silent cron failures. Token refresh strategy (separate step + retry on 401) must be prototyped in Phase 2 before cron is enabled.
- **`@workflow/next` advisory lock behavior:** `pg_try_advisory_lock` + `@workflow/next` concurrent run interaction needs staging validation before production cron is turned on.
- **Pappers `dirigeants` tier access:** Confirm whether the commercially available tier exposes enough director data to seed the enrichment pipeline before Dropcontact is called.

---

## Sources

### Primary (HIGH confidence)
- INSEE SIRENE API — portail-api.insee.fr — company identity, rate limits
- Pappers API documentation v3 — pappers.fr/api/documentation — endpoints, credit model
- France Travail API — francetravail.io — job postings, OAuth2, rate limits
- BOAMP API — boamp.fr — public procurement notices
- DECP — data.gouv.fr — attributed contracts open data
- Dropcontact pricing + CNIL audit — dropcontact.com/pricing + support.dropcontact.com
- Kaspr CNIL fine — cnil.fr/en/data-scraping-kaspr-fined-eu240000
- CNIL closure order for Kaspr — cnil.fr/en/closure-order-issued-against-kaspr
- Proxycurl shutdown (founder) — nubela.co/blog/what-is-proxycurl-api-now-in-2026
- Kaspr pricing 2026 — help.kaspr.io
- Pharow tarifs — pharow.com/tarifs
- Dealroom pricing — dealroom.co/pricing-2025
- Tekos.io — tekos.io (official)
- Recruit Signals — recruitsignals.com (official)
- `@workflow/next` idempotency gap — github.com/vercel/workflow/issues/85

### Secondary (MEDIUM confidence)
- ScrapIn as Proxycurl replacement — linkedapi.io/guides/proxycurl-alternatives (multi-source agreement)
- Crunchbase free tier removal — dev.to/agenthustler (third-party analysis)
- Adzuna free tier limits — developer.adzuna.com (not formally documented)
- LoneScale, Mantiks — official sites (marketing content)
- Signal-based prospecting anti-patterns — factors.ai/blog

### Tertiary (LOW confidence)
- Apollo.io GDPR concerns — cognism.com/blog (competitor source; LinkedIn page removal independently verifiable)
- Prosperian ESN prospecting — prosperian.co (marketing only)

---

*Research completed: 2026-07-03*
*Ready for roadmap: yes*

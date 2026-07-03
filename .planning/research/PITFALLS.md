# Pitfalls Research

**Domain:** B2B prospecting signal aggregation + contact enrichment SaaS (French market, ESN)
**Researched:** 2026-07-03
**Confidence:** HIGH (legal claims verified via multiple sources, Proxycurl shutdown confirmed by founder)

---

## Critical Pitfalls

### Pitfall 1: Proxycurl Is Gone — The Entire LinkedIn Signal Layer Is Broken

**What goes wrong:**
The project scope lists Proxycurl as the primary source for LinkedIn signals (headcount growth, job changes, CTO arrivals) and decision-maker contact enrichment. Proxycurl shut down in mid-2025 after LinkedIn filed a lawsuit in January 2025 alleging the creation of "hundreds of thousands of fake accounts" to scrape millions of profiles. The founder confirmed the shutdown publicly: "Proxycurl is shut down. Old docs, old blog posts, and old code samples still exist. Treat them as historical reference only." Any code already wired to Proxycurl in `lib/radar/` will fail at runtime.

**Why it happens:**
Proxycurl was the dominant LinkedIn API proxy for several years and was treated as stable infrastructure. The enforcement shift in 2025 was abrupt — the service reached ~$10M ARR before legal risk became existential. Teams that had integrated it assumed LinkedIn enforcement would remain limited to C&D letters, not direct litigation.

**How to avoid:**
- Do not build any signal or enrichment layer on Proxycurl. Treat all existing `lib/radar/` code referencing it as dead.
- For company-level LinkedIn signals (headcount growth), evaluate the founder's replacement product **NinjaPear** (uses company websites, not LinkedIn URLs) or alternative approaches: SIRENE for headcount, Pappers for financial growth signals.
- For decision-maker enrichment, use **Dropcontact** (CNIL-audited, RGPD-native, French market) for email discovery. Dropcontact does not use stored databases — it generates emails algorithmically — which eliminates the database-as-liability problem.
- Accept the absence of LinkedIn-sourced headcount growth as a signal. Replace it with Pappers effectif trends + France Travail job posting frequency as a proxy for hiring intent.
- Audit `lib/radar/` before touching it — confirm which parts are dead (Proxycurl-dependent) vs. reusable.

**Warning signs:**
- Any import of `proxycurl` in the codebase
- API calls to `nubela.co` endpoints
- `PROXYCURL_API_KEY` in `.env` files

**Phase to address:**
Signal source architecture phase (earliest phase) — do not let any subsequent phase assume Proxycurl availability. Source selection must be resolved before schema design.

---

### Pitfall 2: RGPD/CNIL — Storing Decision-Maker Contact Data Without Compliant Basis

**What goes wrong:**
Enriching and storing personal data (name, email, LinkedIn URL, phone) for identified individuals — even in a B2B context — is subject to full RGPD obligations. The common trap is treating "it's B2B data" as a blanket exemption. It is not. RGPD applies to any data that identifies a natural person, regardless of professional context.

Storing a DRH's personal email address, enriching their phone number, and displaying it in a list without their knowledge violates:
- **Article 6.1.f RGPD** (legitimate interest): requires a balancing test — the legitimate interest must outweigh the individual's fundamental rights. B2B cold prospecting can qualify, but only when the outreach is relevant to the person's professional role.
- **Article 14 RGPD** (information duty when data is not collected from the data subject): on first contact, you must disclose the data origin, processing purpose, legal basis, and right to object. Silence violates this regardless of whether you ever make contact.
- **Retention**: the CNIL recommends a maximum of 3 years for inactive prospects. The timer resets only on a voluntary action (a response, not an email open). Beyond 3 years with no interaction, the data must be deleted or anonymized.

The SOLOCAL case (900K€ fine in 2025) and ongoing CNIL enforcement demonstrate active prosecution of non-compliant B2B prospecting.

**Why it happens:**
Developers build the enrichment and storage layer first, then plan "to add RGPD stuff later." The compliance obligation is not a UI feature — it is a data architecture constraint. Retrofit is much more expensive than design-in.

**How to avoid:**
- Use **Dropcontact** as the primary enrichment source — it is the only enrichment tool to have passed a full CNIL audit and explicitly stores no personal data itself.
- Avoid storing raw phone numbers or personal email addresses in Supabase unless they are professional contact details and you have a documented legitimate interest.
- Add a `contact_source` and `contact_sourced_at` column on the prospect contact table at DB schema design time.
- Add a `gdpr_retention_expires_at` column computed as `NOW() + INTERVAL '3 years'`, with a scheduled cleanup job.
- When the feature exposes contacts in the UI, include a data notice in the product (not just in a privacy policy link).
- **Phone prospecting** is entering stricter territory: from August 2026, unsolicited B2B phone outreach will require explicit consent or an existing contractual relationship in France. Do not design the contact layer to prioritize mobile numbers.

**Warning signs:**
- No `sourced_at` or `expires_at` on the contact table
- Storing personal email addresses (Gmail, Hotmail) for decision-makers — requires consent, not just legitimate interest
- No logging of when and how a contact was obtained

**Phase to address:**
DB schema phase (contact enrichment table design) and UI phase (information notice on first display of a contact).

---

### Pitfall 3: API Cost Explosion from Unconstrained Cron + Per-Credit Enrichment

**What goes wrong:**
The enrichment gate (enrich contact only above heat score threshold) is correct in principle but easily bypassed in practice. Patterns that blow up costs:

1. **Cron multiplier**: each automation runs its full signal sweep on every execution. If 50 automations each refresh 200 companies, every cron tick costs 10,000 API calls. At Pappers credit pricing, this scales quadratically with the number of automations and tracked companies.
2. **Re-enrichment on re-run**: without an idempotency check, a company that was already enriched gets enriched again on the next cron cycle. Contact APIs (Dropcontact, Kaspr) charge per enrichment request, not per unique contact.
3. **No per-org budget cap**: a power user creates 20 automations targeting large sectors — their cron triggers consume credits intended for the whole multi-tenant pool.

**Why it happens:**
The threshold gate is implemented at the contact-reveal step, but not at the signal-collection step. Signal collection (SIRENE, BOAMP, France Travail) feels "free" because individual calls are cheap. The aggregated cost at cron scale is not.

**How to avoid:**
- Track `signal_last_fetched_at` per company per source. Only re-fetch if `NOW() - signal_last_fetched_at > TTL` (e.g., 24h for job postings, 7 days for headcount, 30 days for financial data). This turns O(n × cron_frequency) into O(n × 1/TTL).
- Track `contact_enriched_at` per prospect contact. If enriched within the TTL window, skip the enrichment call entirely.
- Add a per-org `api_credits_used_this_month` counter with a configurable `api_credits_cap`. Cron jobs check the cap before running.
- On the Pappers billing model: 45€/company for digital register data (actes) — reserve this for high-scoring targets only, not bulk enrichment.

**Warning signs:**
- No `fetched_at` or `enriched_at` columns on signal/contact tables
- Cron that calls enrichment APIs unconditionally on every run
- No per-org usage tracking in `ai_usage_log` or equivalent

**Phase to address:**
Signal collection architecture phase — TTL columns in DB schema must be present before any cron code is written.

---

### Pitfall 4: Entity Resolution Failures — Company Name vs. SIREN Mismatches

**What goes wrong:**
Signals arrive from multiple sources with different company name representations:
- France Travail job postings: free-text employer name, often a subsidiary or brand name, no SIREN
- BOAMP: legal entity name from the procurement notice
- News/press (Maddyness, FrenchWeb): brand name or shortened name
- SIRENE: official legal name (can differ significantly from commercial name)

Without a reliable SIREN as the join key, the same company appears as multiple records. Conversely, a corporate group with 10 SIREN numbers (holding + subsidiaries + regional entities) appears as 10 unrelated companies, and their signals are never aggregated.

Fuzzy name matching alone performs poorly on French company names — abbreviations (SA, SAS, SARL), legal suffixes, and subsidiaries named identically except for a city suffix cause false positives and false negatives. The research confirms: "due to lack of semantics in company name abbreviations, fuzzy distance matching performs poorly."

**Why it happens:**
Developers start with name-based matching because it is the cheapest to implement. SIREN-based resolution requires a lookup against SIRENE for every incoming company name, which adds latency and API calls.

**How to avoid:**
- **SIREN is the canonical key** — the company table's primary identifier must be SIREN, not company name. This is not optional.
- For France Travail job postings that lack SIREN: perform a SIRENE lookup by name + postal code at ingestion time. Cache the result. Accept ~15% unresolvable (subsidiaries with unusual names).
- For news/press signals: these are lowest-confidence signals. Do not attempt to link them unless a SIREN can be resolved from context. Flag them as `unresolved_signal` rather than forcing a fuzzy match.
- Consider Pappers as the normalization oracle: given a company name + location, Pappers can return the SIREN and official legal name.
- Never merge two company records based on name alone without SIREN confirmation.

**Warning signs:**
- Company table uses `name` as the primary key or a unique index
- JOIN operations between signal tables use company name as the join column
- No `siren` column on the company table (or nullable SIREN)

**Phase to address:**
DB schema phase — SIREN as primary company identifier must be enforced at schema creation, not retrofitted.

---

### Pitfall 5: LLM Scoring Opacity — Unjustifiable Scores and Hallucinated Pitches

**What goes wrong:**
A recruiter sees a company scored 87/100 and a pitch: "Société Dupont vient de lever 5M€ et recrute activement des profils data." If the LLM generated that pitch from stale or partial signals, the recruiter calls the company and is immediately embarrassed. Worse: the LLM may have hallucinated the fundraise from a partial news headline or confused two companies with similar names.

The second failure mode: because the scoring is a black box, recruiters cannot calibrate trust. A score of 87 vs. 84 is meaningless if there is no signal breakdown. Users quickly stop trusting the list entirely — leading to list abandonment rather than list fatigue.

**Why it happens:**
It is tempting to pass raw signal text to an LLM and ask it to produce a score + narrative. This produces fluent text but conflates real signals with LLM confabulation. The model is not grounded in which signals are present vs. absent.

**How to avoid:**
- Separate deterministic scoring from LLM narrative generation. The score must come from a rule-based weighted formula over verified, timestamped signals. The LLM only generates the human-readable justification, grounded in a structured context.
- Pass the LLM a structured signal list with timestamps: `{ type: 'job_posting', source: 'France Travail', count: 3, recency_days: 14 }`. Instruct it to only reference signals present in the list.
- Display the signal breakdown alongside the score in the UI ("3 annonces récentes · Levée de fonds confirmée via Pappers"). The score must be explainable without reading the LLM text.
- Add a prompt instruction: "Ne mentionne pas d'information que tu n'as pas reçue dans le contexte. Si un signal est absent, ne le suppose pas."
- Monitor pitch quality during development by having a human read 20 generated pitches and flag hallucinations before shipping.

**Warning signs:**
- LLM prompt passes raw HTML/text from news sources
- Score returned directly from LLM output rather than computed from weighted signal counts
- No `signal_sources` field stored alongside the score for audit

**Phase to address:**
Scoring engine phase — the deterministic rule layer must be built and tested before LLM narrative is added on top.

---

### Pitfall 6: `@workflow/next` Beta — Duplicate Cron Runs and No Native Idempotency

**What goes wrong:**
The project already relies on `@workflow/next` (beta) and its known limitations. For the prospecting cron, three failure modes are specific to this setup:

1. **Duplicate runs**: Vercel cron jobs do not guarantee exactly-once delivery. If a cron-triggered Next.js route takes longer than the Vercel function timeout (60s on Pro, 10s on free), the next cron tick fires before the previous one completes. Two automation runs process the same companies simultaneously, doubling enrichment API calls and creating duplicate rows.
2. **No native idempotency in `@workflow/next`**: GitHub issue #85 (opened Oct 2025, still open as of July 2026) confirms there is no `runId` deduplication support. Workflow creation is not idempotent — triggering the same workflow twice creates two independent runs.
3. **Cron does not follow redirects**: Vercel's cron executor stops at a 3xx response. If the automation route uses middleware-level auth redirects, the cron silently does nothing.

**Why it happens:**
The beta workflow runtime was chosen for the existing AI pipeline where workflows are triggered by user actions (one at a time, manually). Periodic batch automation has different semantics — it requires idempotency and concurrency control that the runtime does not yet provide.

**How to avoid:**
- Implement an advisory lock in Supabase before any automation run: `SELECT pg_try_advisory_lock(automation_id)`. If the lock is already held, the cron skips silently. Release on completion.
- Use a `cron_runs` table with a `(automation_id, started_at)` index. Before running, insert a row with status `running`. If a row with status `running` and `started_at > NOW() - INTERVAL '10 minutes'` already exists, abort.
- The cron trigger route must return 200 immediately and kick off work asynchronously (use `after()` in Next.js 15.1+, or a background task approach). Never let the cron route block until work completes.
- Ensure the cron route URL is not behind auth middleware — use a secret header check instead (e.g., `Authorization: Bearer <CRON_SECRET>`).

**Warning signs:**
- Automation run logs showing duplicate company enrichments within the same hour
- `cron_runs` table missing or not checked before execution
- Cron route returning a redirect rather than a 200

**Phase to address:**
Cron + automation infrastructure phase — concurrency guard and idempotency must be in place before any live cron is enabled in production.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `signal_last_fetched_at` TTL tracking | Simpler code, always-fresh data | API cost explosion at scale; SIRENE quota exhaustion | Never — add from day one |
| Use company name as join key instead of SIREN | Faster to implement | 20-30% entity resolution errors; duplicate company records accumulate | Only in a throw-away prototype |
| Let LLM compute the score directly | Single LLM call produces score + narrative | Unjustifiable, non-auditable scores; hallucination risk in pitch | Never in production |
| Store Kaspr/Apollo phone numbers without consent check | Richer contact data | CNIL liability; Kaspr was sanctioned in France | Never — use Dropcontact instead |
| Run enrichment on all companies above 0 instead of threshold | More data available for debugging | Unbounded enrichment cost | Only in local dev with test SIREN list |
| Build LinkedIn signal scraping in-house | Avoids Proxycurl dependency | Direct LinkedIn ToS violation; existential legal risk (see Proxycurl fate) | Never |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SIRENE/INSEE API | Querying by company name returns multiple results; picking `result[0]` without disambiguation | Filter by `etatAdministratifUniteLegale = 'A'` (active), then by postal code + NAF code to disambiguate; if still multiple, surface for human review |
| BOAMP API | Assuming awarded contracts = buying intent; many awards are framework contracts with no near-term execution | Weight BOAMP signals by contract type: `Marché ordinaire` > `Accord-cadre`. Recency matters more than value. |
| France Travail API | Treating employer names as stable; the same company posts under different spellings | Always attempt SIREN resolution at ingestion; store raw employer name alongside resolved SIREN |
| Pappers API | Using actes/documents endpoint for all companies (billed at 45€/company since Feb 2026) | Reserve detailed document fetch for high-score targets only; use the free entreprise endpoint for basic firmographic data |
| Dropcontact | Sending enrichment requests for every signal collected | Only trigger Dropcontact after a company crosses the heat score threshold; batch requests when possible |
| France Travail OAuth | Access token expires; uncaught 401 in cron causes silent failure for the entire run | Store token refresh in a separate step; retry on 401 before failing the automation |
| DECP/data.gouv JSONL feed | Feed is updated irregularly; polling too frequently wastes bandwidth | Use `Last-Modified` header check before downloading; cache the last processed award ID |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 signal fetches per company per cron run | API quota exhaustion; slow cron completion | TTL-based fetch gating; bulk SIRENE lookups | ~100 tracked companies |
| Full-table company scan to find companies needing refresh | Cron query takes 30+ seconds | Index on `signal_last_fetched_at`; partial index for `WHERE signal_last_fetched_at IS NULL OR signal_last_fetched_at < NOW() - INTERVAL '24h'` | ~1000 company rows |
| Generating LLM pitch for every company on every list load | High latency, high token cost | Generate pitch once when score changes; cache in `generated_pitch` column with `pitch_generated_at` | ~50 companies in a single org |
| Per-company LLM call sequentially in cron | Cron run time exceeds Vercel timeout | Batch companies and use parallel LLM calls; or defer pitch generation to a background step | ~20 companies per automation |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing enrichment API keys (Dropcontact, Pappers) in client-side code | API credit theft | All enrichment calls go through Next.js API routes; keys are server-only env vars |
| Cron endpoint accessible without authentication | Malicious actor triggers unlimited enrichment runs | Validate `Authorization: Bearer <CRON_SECRET>` header in cron route; CRON_SECRET must be a long random string in env |
| Storing decision-maker personal emails in plaintext without retention policy | CNIL sanction exposure | Implement `gdpr_retention_expires_at`; scheduled cleanup; log data provenance in `contact_source` |
| Cross-tenant prospect data leakage — missing `org_id` filter on company/signal queries | One org sees another's prospecting data | All prospect queries must include `WHERE org_id = $orgId`; RLS policies on prospect tables |
| Logging enriched contact details (phone, email) in server-side logs | Personal data in logs violates RGPD | Never log contact personal details; log only SIREN + enrichment status |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Displaying a raw score without signal breakdown | Recruiters cannot assess why a company scored high; trust evaporates after one bad call | Show signal badges inline: "3 annonces · Croissance effectifs · AO public" alongside the score |
| List with 50+ companies with no status tracking | Recruiter cannot remember what they've already done; list becomes unusable after 2 days | Ship `à appeler / appelé / écarté` status from day one — a list without status is a to-do list without checkboxes |
| Enriching and displaying contact data proactively for all companies | Feels like surveillance to some users; also wastes enrichment credits | Gate contact display behind a "Voir le contact" CTA that triggers enrichment on demand and costs a credit per reveal |
| Showing stale signals without a timestamp | Recruiter calls about a fundraise that happened 18 months ago; embarrassing | Every signal must display its source date: "Levée confirmée via Pappers il y a 14 jours" |
| Automations with no last-run status or result summary | Recruiter cannot tell if automations are working or silently failing | Show last run time, number of companies found, and error status per automation in the automation list |
| Pitch text that reads like generated marketing copy | Recruiters won't read it; they'll call with their own script | Pitch should be a structured bullet list of facts, not a paragraph. Recruiters want: what happened, when, why it's relevant |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Signal collection**: Each signal source has `fetched_at` and TTL logic — verify that re-runs skip already-fresh signals
- [ ] **Contact enrichment**: Gate is enforced in code, not just documented — verify that a company below threshold cannot be enriched even via direct API call
- [ ] **SIREN resolution**: Every company row has a non-null SIREN — verify by querying `WHERE siren IS NULL` before launch
- [ ] **RGPD retention**: `gdpr_retention_expires_at` exists on contact rows and a cleanup job is scheduled — verify the job runs in staging
- [ ] **Cron idempotency**: Advisory lock or `cron_runs` check is tested by running two cron invocations simultaneously in staging
- [ ] **Scoring audit trail**: Every score has a linked `signal_snapshot` JSON stored at scoring time — verify you can reproduce a score from history
- [ ] **Multi-tenant isolation**: All prospecting queries use `org_id` — verify with a cross-org data access test
- [ ] **Information notice**: First-contact RGPD notice text is written and reviewed, not "to be added later"

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Proxycurl integration discovered in production code | LOW (no live traffic) | Audit `lib/radar/` for Proxycurl references; replace with Dropcontact for contact enrichment, SIRENE/Pappers for firmographic signals; do not attempt to restore Proxycurl |
| Duplicate company rows from name-based matching | MEDIUM | Write a deduplication migration: identify rows with matching SIREN, merge signals, delete duplicates; add SIREN unique index going forward |
| CNIL compliance gap discovered post-launch | HIGH | Engage a DPO or RGPD counsel; notify affected users per Article 14; delete data beyond retention limit; implement consent/opposition mechanism immediately |
| LLM pitch hallucination reported by user | LOW (per-incident) | Add source-grounding to prompt; regenerate affected pitches; display signal breakdown to users so they can verify before calling |
| Cron run cost spike from missing TTL | MEDIUM | Immediately add TTL gate in code; analyze billing for duplicate enrichment charges; request refund from vendor if applicable |
| `@workflow/next` duplicate automation runs | LOW-MEDIUM | Add advisory lock retroactively; deduplicate signal rows using `(company_id, source, fetched_date)` unique constraint |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Proxycurl shutdown — LinkedIn signals missing | Phase 1: Signal source selection | No Proxycurl references in codebase; alternative sources documented |
| RGPD contact data storage | Phase 2: DB schema (contact table) | `contact_source`, `gdpr_retention_expires_at` columns present; cleanup job scheduled |
| API cost explosion | Phase 2: DB schema (signal tables) | `signal_last_fetched_at` columns on all signal tables; TTL logic in cron |
| Entity resolution / SIREN as primary key | Phase 2: DB schema (company table) | `siren VARCHAR(9) NOT NULL UNIQUE` as company primary identifier |
| LLM score opacity and hallucination | Phase 3: Scoring engine | Score computed by rule engine; LLM receives only structured signal list; `signal_snapshot` stored |
| Cron duplicate runs / no idempotency | Phase 4: Cron + automation | Advisory lock tested; concurrent runs rejected; cron route returns 200 immediately |
| UX — missing signal timestamps | Phase 5: Prospection UI | Every signal card shows source + date |
| UX — list fatigue, no status | Phase 5: Prospection UI | Status column (`à_appeler`, `appelé`, `écarté`) present and functional at launch |

---

## Sources

- Proxycurl shutdown (founder statement): https://nubela.co/blog/what-is-proxycurl-api-now-in-2026-im-the-founder/
- LinkedIn v. Proxycurl case: https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down
- LinkedIn scraping legal landscape 2026: https://dev.to/zackrag/linkedin-scraping-is-dead-5-legal-tos-safe-alternatives-that-actually-work-in-2026-3f36
- CNIL RGPD prospection B2B cadre légal: https://www.fichierentreprise.fr/content/160-rgpd-prospection-b2b-legal
- CNIL durée conservation données B2B: https://silexo.fr/article/113/rgpd-les-durees-de-conservation-prospection-commerciale-et-marketing
- RGPD Article 14 information duty: https://datapult.ai/guides/rgpd-prospection-b2b/
- Dropcontact CNIL audit confirmation: https://support.dropcontact.com/article/54-dropcontact-seule-solution-conforme-au-rgpd
- Kaspr CNIL sanction context: https://foxeet.fr/contenu/top-enrichissement-b2b-fullenrich-kaspr
- Pappers API pricing (45€/company since Feb 2026): https://www.pappers.fr/api/documentation
- `@workflow/next` idempotency gap (issue #85, open): https://github.com/vercel/workflow/issues/85
- Vercel cron best practices 2026: https://zenn.dev/asoventure/articles/2026-05-03-vercel-cron-best-practices
- Company entity resolution SIREN pitfalls: https://www.globaldatabase.com/company-entity-resolution-how-to-match-legal-entities-globally-200-countries
- LLM lead scoring explainability: https://vadim.blog/llm-lead-conversion-propensity-scoring-for-b2b-lead-prioritization
- B2B contact data decay statistics: https://www.cleanlist.ai/blog/2026-02-15-best-sales-prospecting-tools

---
*Pitfalls research for: v1.3 Prospection — B2B signal aggregation + contact enrichment (French market, ESN)*
*Researched: 2026-07-03*

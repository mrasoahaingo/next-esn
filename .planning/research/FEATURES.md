# Feature Research: Signal-Based B2B Prospecting (ESN)

**Domain:** Signal-based B2B sales/recruiting prospecting tool for ESN (Entreprises de Services Numériques)
**Researched:** 2026-07-03
**Milestone:** v1.3 Prospection
**Overall confidence:** HIGH (competitor behavior, signal types, UX patterns) / MEDIUM (French market specifics, scoring methodology)

---

## Competitor Landscape (Quick Reference)

| Tool | Focus | Key Differentiator | Target User |
|------|-------|--------------------|-------------|
| **Pharow** | FR company database + signals | 1,300+ filters, SIREN-based, 40+ sources (INSEE, LinkedIn, funding, hiring) | FR sales teams, ESN |
| **Nomination.fr** | FR decision-maker database | Manually verified, 460k execs, 100k companies, org charts | FR enterprise sales |
| **Tekos.io** | ESN-specific prospecting | Project detection, consultant-to-project matching, contextual pitch | ESN BDs specifically |
| **Mantiks** | Job posting aggregation | 290+ sources, daily refresh, hiring manager identification | Recruiters, ESN |
| **LoneScale** | Job change + hiring signals | CRM-native, no separate UI, signal injection into HubSpot/Salesforce | SDR teams with CRM |
| **Recruit Signals** | Recruiting-specific heat score | Morning briefing, Hiring Heat Score 0-100, Company 360 view | Recruitment agencies |
| **UserGems** | 700+ buying signals | Champion tracking, AI agent Gem-E, relationship context | Enterprise sales |
| **Apollo.io** | Full-stack sales intelligence | Contact database + intent + sequencing | Mid-market SDR |
| **HG Insights** | Technographic + intent | Normalized 1-100 intent score, weekly update, saved searches | Enterprise GTM |

**Key finding:** No competitor targets ESN recruiters with a lightweight, automation-centric, CRM-free workflow combining French signal sources (SIREN, BOAMP, France Travail) with actionable list management. Tekos is the closest but has no automation, scoring, or contact reveal gating.

---

## Table Stakes

Features users expect. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Hot company list sorted by heat score** | Every signal tool surfaces a ranked list; without it there is no entry point | LOW | Score 0-100, sort descending by default, secondary sort by recency of last signal |
| **Human-readable justification per company** | Raw signal data is noise; recruiters need "why now" to call confidently | MEDIUM | LLM synthesis of top 2-3 signals, 2-3 sentences max; e.g. "Levée Série B (12M€, mai 2026) + 3 offres dev cloud ouvertes depuis 3 semaines" |
| **Call pitch per company** | Pharow, Tekos, and Recruit Signals all generate contextual outreach angles | MEDIUM | Short (4-6 lines) LLM-generated pitch tailored to ESN angle: "vous placez des devs cloud" + company signals |
| **Decision-maker contact (name + role)** | The entire workflow ends with a call — without a name, the list is decorative | MEDIUM | One decision-maker per company (DRH, CTO, or hiring manager); Proxycurl/Dropcontact/Kaspr; display name + LinkedIn URL + phone/email if available |
| **Actionable status per company (to call / called / dismissed)** | Every sales prospecting tool has this — it distinguishes a lead list from a database | LOW | Three states only (matching PROJECT.md scope); persisted per org + automation |
| **At least one automation (criteria-based saved search)** | Users expect to configure who they want to target, not browse all companies | MEDIUM | Sector (NAF/proprietary), company size range, geography; stored as a saved automation that drives signal collection |
| **Manual run trigger** | Cron-only feels like a black box; users need to validate the automation works | LOW | "Run now" button on the automation card; fires the same pipeline as cron |
| **Signal sources visible per company** | Pharow, HG Insights all show source attribution; users need to trust the score | LOW | Chip/badge per signal type (funding, hiring, LinkedIn growth, public tender); links to source if possible |
| **Deduplication within a list** | Same company from two automations must not appear twice on the radar screen | LOW | Dedup by SIREN at query/display time; merge signals from both automations |

---

## Differentiators

Features that set the product apart from generic B2B tools. These are where Next-ESN can win for ESN recruiters specifically.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Contact reveal gated by heat score threshold** | Controls API costs (Proxycurl/Dropcontact are per-credit); smart UX that signals "this company is worth a call" | MEDIUM | Only trigger contact enrichment when score >= configurable threshold (e.g. 60/100); reveal button below threshold is disabled with explanation. Pharow/Apollo enrich all — this is more cost-effective. |
| **Multiple automations per org (criteria stacking)** | ESNs work multiple verticals (fintech devs, healthcare infra, public sector) — one saved search per vertical | MEDIUM | Each automation = sector filters + size + geo + profile tags; recruiter runs all or one; results tagged by automation source |
| **ESN-specific signal mix (SIREN + BOAMP + France Travail)** | French public tender wins (BOAMP/DECP) and job postings (France Travail) are free signals not in Pharow/Apollo | HIGH | BOAMP API (DILA) + DECP data.gouv for tender attribution; France Travail API (free, rate-limited); these signal types are exclusive to French public companies and mid-market — ESN sweet spot |
| **Pitch tailored to ESN context (profiles to place)** | Generic outreach angles ("you raised funding") are weak; "we have 3 devs cloud with AWS certs available now" is direct | MEDIUM | Automation config includes "profiles to place" (text field or tag picker); injected into LLM pitch prompt; differentiates from Tekos which is static |
| **Heat score decay over time** | Without decay, a 3-month-old funding round keeps a company "hot" indefinitely; fresh signals should dominate | MEDIUM | Weighted score: signal_weight * recency_decay (exponential, half-life configurable per signal type); prevents stale lists |
| **Notification digest for new hot companies** | Recruit Signals' "morning briefing" is a key retention mechanic — pull users back to the tool | LOW | Email digest (daily or weekly, configurable per automation); lists newly appeared companies above threshold since last run; no need for push notifications in v1.3 |
| **Link hot companies to existing candidates** | ESN has consultants on the bench — showing "2 of your available candidates match this company's open roles" is high-value | HIGH | Requires joining `prospection_companies` with `candidates` (existing feature); depends on candidate profiles and mission matching logic already built; flag for v2 |

---

## Anti-Features

Features to explicitly avoid in v1.3.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Full CRM pipeline (RDV, won/lost, follow-up cadences)** | Natural extension once you have a contact list | Scope explosion — requires meeting booking, multi-step sequences, outcome tracking; doubles the build; PROJECT.md explicitly excludes this | Three statuses (to call / called / dismissed) cover the actual recruiter need at this stage |
| **Email sequencing / automated outreach** | Apollo, LoneScale all do this | Sends communications on behalf of recruiter without review; legal risk (RGPD), deliverability risk, reputation risk; changes product from intelligence to outreach tool | Provide a copyable call pitch; recruiter initiates contact manually |
| **Real-time signal monitoring (websocket/sub-second)** | "Live" feels powerful | Job market and firmographic data changes at best daily — real-time is theater; Pharow refreshes hiring signals every 15 days; BOAMP/SIREN are T+24h at best | Cron refresh (daily or weekly per automation) with "last updated" timestamp displayed |
| **Building our own contact database** | Cheaper than per-credit APIs long-term | Requires ongoing RGPD compliance, data verification team, coverage gaps, legal exposure; Nomination.fr employs 60 people to maintain 460k verified contacts | Use best-in-class enrichment API (Dropcontact for RGPD-safe FR email discovery) at gated threshold |
| **Tracking ALL signal types at launch** | More signals = better scores | Stack of 3-4 complementary signals already gives strong coverage; more signals add ingestion complexity, maintenance burden, and noise. Industry research: "signal volume without signal quality degrades GTM performance" | Launch with: funding + hiring activity + LinkedIn headcount growth; add public tenders (BOAMP) in v1.4 as a clear differentiator |
| **Per-company analytics / closed-loop attribution** | "Which signals convert to meetings?" is a legitimate question | Requires meeting outcomes tracked back to the source signal; no CRM = no outcome data; can't close the loop in v1.3 | Add "called → result" status update in a future CRM-lite phase; for now, dismissed/called covers it |
| **Snooze / remind-me-later** | Salespeople routinely want to defer | Adds a scheduling layer (reminders, notification queue, cooldown periods) with minimal v1.3 ROI | "Dismissed" status is sufficient; add snooze in v2 if users request it repeatedly |
| **Multi-user assignment (assign a company to a colleague)** | Natural in team contexts | Requires user management within a list, notification to assignee, ownership conflicts; Clerk orgs give us the multi-tenant shell but list assignment is a CRM feature | All org members see the same shared list; assignment is v2 |

---

## Feature Dependencies

```
[Automation (criteria config)]
    └──drives──> [Signal ingestion pipeline]
                     └──produces──> [Raw company signals]
                                        └──feeds──> [Heat score calculation]
                                                        └──renders──> [Hot company list]
                                                                          └──triggers──> [LLM justification + pitch]
                                                                                             └──gates──> [Contact reveal]
                                                                                                             └──enables──> [Status update (to call / called / dismissed)]

[Heat score threshold (org setting)]
    └──gates──> [Contact reveal API call]

[Automation "profiles to place" field]
    └──enhances──> [LLM pitch generation]

[Existing: missions / candidates]
    └──future-link──> [Hot company → available consultant matching] (v2)
```

### Dependency Notes

- **Signal ingestion requires automation config:** The pipeline needs targeting criteria (sector, size, geo) to scope API calls to relevant companies; unbounded ingestion is too expensive and slow.
- **Heat score requires signal ingestion:** Scoring runs post-ingestion, not real-time; scores are persisted and refreshed on cron/manual run.
- **Contact reveal requires heat score threshold:** This is a hard architectural dependency (cost control); the contact enrichment API is called only when score >= threshold. This must be decided at DB schema design time (not retrofittable cheaply).
- **LLM pitch is enhanced by "profiles to place":** The pitch prompt needs the recruiter's context to generate an ESN-relevant outreach angle, not a generic "you raised money" message.
- **Status management requires company list identity:** Statuses are stored per company + automation + org; deduplication by SIREN is a prerequisite.

---

## MVP Definition (v1.3)

### Launch With

- [x] **Automation CRUD** — Create/edit/delete criteria-based automations (sector, size, geo, profiles to place) — the entry point to the entire feature
- [x] **Signal ingestion** — Funding (Pappers/Crunchbase), hiring activity (France Travail job postings), LinkedIn headcount growth (Proxycurl headcount) — 3 signals is enough for an initial score
- [x] **Heat score calculation** — Deterministic weighted scoring with recency decay; score 0-100; persisted to DB
- [x] **Hot company list UI** — Ranked by score, signal badges, "last updated" timestamp; sorted descending by default
- [x] **LLM justification + call pitch** — Generated at ingestion time (not on-demand); short, ESN-contextualized; uses "profiles to place" from automation config
- [x] **Decision-maker contact reveal (gated)** — Single decision maker per company; contact enrichment API called only at score >= threshold; disabled button with explanation below threshold
- [x] **Actionable status (to call / called / dismissed)** — Three states, persisted per company + org; filter by status in the list
- [x] **Deduplication by SIREN** — Companies appearing in multiple automations merged in the list view
- [x] **Manual run trigger** — "Run now" per automation; same pipeline as cron

### Add After Validation (v1.3.x)

- [ ] **Email notification digest** — New hot companies since last run; daily/weekly toggle; add when retention data shows users not returning organically
- [ ] **BOAMP / public tender signals** — High ESN relevance (public sector contracts); add when France Travail + funding prove insufficient for target companies
- [ ] **Heat score decay tuning UI** — Let org admins adjust signal weights; add when recruiters complain about stale companies staying high

### Future Consideration (v2+)

- [ ] **Candidate → hot company matching** — "2 available consultants match this company's open roles"; requires deeper mission/candidate cross-referencing
- [ ] **Snooze / remind-me-later** — Deferred follow-up; add only if dismissed status proves insufficient
- [ ] **Multi-user assignment** — Assign a company card to a colleague; full team workflow
- [ ] **CRM pipeline integration (won/lost)** — Close the loop; requires meeting outcome tracking

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hot company list (ranked) | HIGH | LOW | P1 |
| Human-readable justification | HIGH | MEDIUM | P1 |
| Call pitch | HIGH | MEDIUM | P1 |
| Status management (3 states) | HIGH | LOW | P1 |
| Automation CRUD | HIGH | MEDIUM | P1 |
| Manual run trigger | MEDIUM | LOW | P1 |
| Signal ingestion (funding + hiring + LinkedIn) | HIGH | HIGH | P1 |
| Heat score calculation with decay | HIGH | MEDIUM | P1 |
| Contact reveal (gated by threshold) | HIGH | MEDIUM | P1 |
| Deduplication by SIREN | MEDIUM | LOW | P1 |
| BOAMP / public tender signals | HIGH (ESN-specific) | HIGH | P2 |
| Email notification digest | MEDIUM | LOW | P2 |
| Score weight tuning UI | LOW | LOW | P3 |
| Candidate → company matching | HIGH | HIGH | P3 |
| Multi-user assignment | MEDIUM | HIGH | P3 |

---

## Recruiter Workflow (Expected)

Based on Tekos, Recruit Signals, and Mantiks patterns applied to ESN context:

1. **Setup (once):** Recruiter creates 1-3 automations — one per vertical (e.g. "Fintech devs", "Healthcare infra", "Public sector IT"). Each automation specifies sector (NAF codes or proprietary labels), company size range (50-500 employees), region (Île-de-France, Lyon), and profiles to place (free text: "développeurs React + Node.js senior").

2. **Daily habit:** Recruiter opens `/prospection` tab. Sees hot company list sorted by score. Scans the top 5-10. Reads justification ("levée de fonds + 4 offres dev ouvertes") and pitch. Decides whether to call.

3. **Before calling:** Clicks "Voir le contact" button (enabled if score >= threshold). Gets name + role + phone/LinkedIn. If below threshold, sees "Score insuffisant — enrichissement désactivé" explanation.

4. **After call:** Updates status to "Appelé" or "Écarté". Card moves visually (fade, filter-able). List auto-refreshes to surface next actionable company.

5. **New batch (automatic):** Cron fires (nightly or weekly per automation). New companies appear in the list. Optional: email digest "3 nouvelles entreprises chaudes dans votre automation Fintech".

---

## Competitor Feature Comparison

| Feature | Pharow | Tekos | Recruit Signals | Next-ESN v1.3 |
|---------|--------|-------|-----------------|---------------|
| Signal types | Funding, hiring, growth, techno | Project detection (proprietary) | Funding, headcount, job velocity, exec moves | Funding + hiring + LinkedIn growth (+ BOAMP v1.4) |
| Heat score | No explicit score | No | Yes (0-100, Hiring Heat) | Yes (0-100, weighted + decay) |
| FR-specific data (SIREN/INSEE) | Yes | Partial | No | Yes (SIREN as dedup key, Pappers/Societeinfo) |
| Call pitch | No | Yes (contextual per project) | No | Yes (ESN-contextualized via LLM) |
| Contact reveal | Yes (credit-based, all records) | Yes (decision maker per project) | Yes (hiring manager identified) | Yes (gated by heat score threshold) |
| Automation / saved search | Yes (static filter presets) | No | "Tell us your patch" (1 profile) | Yes (multiple automations, cron + manual) |
| Status management | No | No | No | Yes (to call / called / dismissed) |
| CRM-free workflow | Partial (exports to HubSpot/Pipedrive) | Yes | Yes | Yes (standalone, no CRM required) |
| ESN profiles-to-place context | No | Yes (manual profile matching) | No | Yes (automation config field, injected in pitch) |
| BOAMP / public tenders | No | No | No | Planned v1.4 |

---

## Sources

- [Pharow features page](https://www.pharow.com/fonctionnalites) — HIGH confidence (official)
- [Pharow vs Nomination comparison](https://www.pharow.com/blog/comparatif-pharow-nomination) — MEDIUM confidence
- [Tekos.io ESN prospecting tool](https://tekos.io/) — HIGH confidence (official)
- [Mantiks — finding tech-recruiting companies](https://blog.mantiks.io/trouver-les-entreprises-qui-recrutent-des-tech/) — HIGH confidence (official)
- [Recruit Signals features](https://recruitsignals.com/) — HIGH confidence (official)
- [LoneScale review 2026 — SyncGTM](https://syncgtm.com/blog/lonescale-review) — MEDIUM confidence
- [LoneScale buying signals explained](https://www.lonescale.com/blog/buying-signals-explained) — MEDIUM confidence
- [UserGems B2B intent data providers](https://www.usergems.com/blog/b2b-intent-data-providers) — MEDIUM confidence
- [HG Insights intent scoring](https://support.hginsights.com/hc/en-us/articles/18854213968525-HG-Intent-Scoring) — HIGH confidence (official)
- [Signal-based prospecting anti-patterns — Factors.ai](https://www.factors.ai/blog/signal-based-outbound-workflows) — MEDIUM confidence
- [Best contact enrichment APIs 2026 — Crustdata](https://crustdata.com/blog/best-contact-enrichment-apis-in-2026-for-builders-and-revops-engineers) — MEDIUM confidence
- [Prosperian ESN prospecting](https://www.prosperian.co/secteurs/esn) — LOW confidence (marketing)
- [Lonescale pricing](https://www.lonescale.com/pricing) — HIGH confidence (official)

---

*Feature research for: Signal-based B2B prospecting, ESN context (v1.3 Prospection)*
*Researched: 2026-07-03*

# Stack Research: v1.3 Prospection — External Data & API Providers

**Project:** Next-ESN — v1.3 Prospection milestone
**Researched:** 2026-07-03
**Confidence:** MEDIUM (providers verified via public docs and multi-source WebSearch; pricing is order-of-magnitude, not contractual)

---

## Context

This research covers only net-new additions for the Prospection feature. The existing stack (Next.js 16, Supabase, Clerk, Vercel AI SDK, `@workflow/next`, Browserbase/Stagehand, cron routes) is already wired and validated — not re-researched here.

The feature needs three capability layers:
1. **Company targeting base** — French companies by sector/size/geo, reconciled by SIREN
2. **Hot hiring signals** — fundraising, LinkedIn activity, job-posting history, public tenders
3. **Decision-maker contact enrichment** — DRH/CTO/hiring manager, triggered only above the heat score threshold

---

## CRITICAL: Proxycurl is dead

Proxycurl (already wired in `lib/radar/`) shut down permanently on 4 July 2025 after a LinkedIn lawsuit (filed January 2025, settled mid-2025 with permanent injunction). The repo likely has dead calls to Proxycurl. **Any `lib/radar/` or other code importing Proxycurl must be replaced.** Do not copy patterns from the old Radar module.

---

## Layer 1 — Company Targeting Base

### INSEE SIRENE API

| Attribute | Detail |
|-----------|--------|
| What | Official French company register — SIREN, SIRET, NAF code, legal form, headcount bracket, address |
| Coverage | All 12M+ French enterprises and establishments |
| Pricing | **Free** — public data service, no authentication required for basic queries |
| Auth | OAuth2 token via portail-api.insee.fr for higher-volume access; anonymous for basic |
| Rate limits | Authenticated: ~7 req/s; anonymous: ~3 req/s |
| GDPR | Source of truth — government data, not personal data |
| Fit | Excellent. SIREN is the canonical reconciliation key for all other providers |

**Use for:** Building the company targeting table, seeding company records with official identity (sector via NAF code, size bracket, address/geo). First call for any new company in the pipeline.

**Integration:** REST API — direct `fetch` from Next.js API route or workflow step. No npm package needed.

**Source:** [INSEE Developer Portal](https://portail-api.insee.fr/catalog/api/2ba0e549-5587-3ef1-9082-99cd865de66f)

---

### Pappers API

| Attribute | Detail |
|-----------|--------|
| What | French company data aggregator — SIREN, accounts filed at INPI, BODACC legal notices, directors, beneficial owners, documents |
| Coverage | 12M+ companies, data from INSEE + INPI + BODACC, updated daily |
| Pricing | Credit system. 100 free credits on signup (pro email). Pay-as-you-go and monthly subscriptions available. Exact tier pricing not public — contact [api@pappers.fr](mailto:api@pappers.fr). Order of magnitude: ~€50–200/mo for moderate volume |
| Auth | API key (header) |
| Rate limits | Not publicly documented; support available on paid tiers |
| GDPR | Public registry data (government sources); directors are public by law (RCS) |
| Fit | Excellent for French market. Covers accounts + revenue trends + directors (DRH/CTO as named officiers) |

**Use for:** Enriching company profiles with filed accounts (revenue growth signal), director names/titles (seeding decision-maker data before contact enrichment), legal notices (restructuring events as hiring signal). BODACC data reveals capital increases, mergers, and management changes.

**Key endpoints:**
- `/entreprise/{siren}` — full company profile
- `/entreprise/{siren}/dirigeants` — named directors (free to query, count and names only on lower tiers)
- `/entreprise/{siren}/comptes` — filed annual accounts (revenue, headcount)
- `/recherche` — search by criteria (NAF, location, size)

**Source:** [Pappers API documentation](https://www.pappers.fr/api/documentation)

---

### Societeinfo API

| Attribute | Detail |
|-----------|--------|
| What | B2B data enrichment platform built on INSEE + BODACC + INPI; API-first |
| Coverage | 4M+ active French companies |
| Pricing | 1 credit per company/contact retrieved. Subscriptions: ~€69/mo (1,000 credits), ~€79/mo (3,000 credits). 25 free credits/mo on free plan |
| Auth | API key |
| Rate limits | Not documented publicly |
| GDPR | Public registry data — same posture as Pappers |
| Fit | MEDIUM. Primarily legal/structural signals. Explicitly lacks commercial signals (hiring, fundraising, technology stack) |

**Use for:** Secondary enrichment of company identity when Pappers data is incomplete. Lower priority than Pappers given the explicit gap in commercial signals.

**Important limitation:** Societeinfo does not provide fundraising data, hiring intent, or technology signals. It is a legal-data provider, not a commercial signal provider. Do not use it as a signal source.

**Source:** [Societeinfo API docs](https://societeinfo.com/api-doc/)

---

## Layer 2 — Hot Hiring Signals

### France Travail API (job-posting history)

| Attribute | Detail |
|-----------|--------|
| What | Official French job posting database — current active offers, searchable by company, sector, location, job type |
| Coverage | All active offers published via France Travail + partnered job boards |
| Pricing | **Free** — open access, account required (francetravail.io) |
| Auth | OAuth2 client credentials (francetravail.io developer account) |
| Rate limits | 4 req/s per application; HTTP 429 with `Retry-After` on excess |
| GDPR | Public job offers — no personal data concern |
| Fit | Excellent for recurring job posting signal. A company that publishes tech roles repeatedly is a warm target |

**Use for:** Detecting recurring job postings as a hiring signal. Query by company SIRET or name + sector filters. A company posting >3 IT roles in 90 days is a strong signal.

**Limitation:** Results capped at 1,150 offers per query window (range 0–1149). No historical archive beyond active offers — use for current + near-term signal only.

**Integration:** REST + OAuth2. One Supabase function or Next.js API route polling on cron schedule. Token cached in environment variable or Supabase secrets.

**Source:** [France Travail API — Offres d'emploi](https://francetravail.io/data/api/offres-emploi)

---

### BOAMP / DECP APIs (public tender awards)

| Attribute | Detail |
|-----------|--------|
| What | BOAMP (Bulletin Officiel des Annonces des Marchés Publics): public procurement notices + award results for French state, local government, and public bodies. DECP (Données Essentielles Commande Publique): mandatory open data of attributed contracts since 2024 |
| Coverage | All public contracts above EU thresholds (~€140k for services) |
| Pricing | **Free** — open data, Licence Ouverte v2.0 |
| Auth | None — fully open |
| Rate limits | Not restrictive (standard open-data API) |
| GDPR | Company data only, no personal data |
| Fit | Good for public-sector-facing ESN clients. A company winning a public tech contract predicts near-term IT hiring |

**Use for:** Detecting companies that recently won public IT contracts (BOAMP result notices with NAF code filtering). Maps well to ESN prospects in defence, local government, and healthcare sectors.

**DECP note:** Since January 2024, all attribution data is mandatory on data.gouv.fr — fully machine-readable JSON feed. Highly useful as a structured, daily-updated signal source.

**Integration:** REST. BOAMP OpenDataSoft endpoint is queryable directly. DECP available as bulk JSON download or streaming API on data.gouv.fr.

**Source:** [BOAMP API](https://www.boamp.fr/pages/api-boamp/), [DECP data.gouv.fr](https://www.data.gouv.fr/datasets/api-decp)

---

### ScrapIn (LinkedIn company headcount + job changes — replaces Proxycurl)

| Attribute | Detail |
|-----------|--------|
| What | Real-time LinkedIn scraping API — company profiles, headcount, employee listings, job changes, job postings |
| Coverage | Full LinkedIn public + Sales Navigator data; real-time (not cached snapshots) |
| Pricing | Credit-based: ~$49/mo (1,000 credits), ~$149/mo (5,000 credits), ~$299/mo (15,000 credits). 1 credit = 1 profile/company lookup |
| Auth | API key (Bearer token) |
| Rate limits | Tier-dependent; real-time scraping means higher latency than cached providers |
| GDPR | Legally grey — scrapes public LinkedIn data. LinkedIn ToS prohibits scraping. ScrapIn (like Proxycurl) operates in this grey zone. Post-Proxycurl lawsuit, risk is real. See GDPR/Legal section below |
| Fit | HIGH for headcount growth signal. Merged with Reverse Contact (March 2026) — adds email reverse lookup |

**Use for:** Pulling quarterly headcount snapshots per target company to compute growth %. Detecting recent C-level/manager arrivals (job change signal). Scanning company job postings on LinkedIn (complementary to France Travail).

**Proxycurl migration note:** ScrapIn's API structure mirrors Proxycurl (JSON response schema is similar). Drop-in replacement is feasible with adapter layer.

**LEGAL RISK FLAG:** ScrapIn operates in the same legal space Proxycurl was sued in. LinkedIn actively pursues scrapers. Use defensively: low volume, gated behind heat score threshold, not bulk-scraped on every company. The heat-gating architecture already designed in PROJECT.md mitigates exposure. See PITFALLS.md for more.

**Source:** [ScrapIn.io](https://www.scrapin.io/), [Proxycurl alternatives comparison](https://linkedapi.io/guides/proxycurl-alternatives)

---

### Crunchbase API (fundraising signals)

| Attribute | Detail |
|-----------|--------|
| What | Global startup funding database — funding rounds, investors, company stage |
| Coverage | Global but weakest on small/mid French companies vs. Dealroom |
| Pricing | No more free tier as of 2025. Basic: $49/mo, Pro: $99/mo, Enterprise API: custom (~$20k/year median contract). API requires at least the Basic plan |
| Auth | API key |
| Rate limits | Tier-dependent; Basic is restrictive |
| GDPR | Company data only; funding is public information |
| Fit | MEDIUM for France. Coverage of sub-series-A French companies is spotty |

**Decision: Use only as fallback.** Dealroom has stronger French/European coverage for early-stage rounds. Crunchbase is acceptable for series A+ companies already visible internationally.

**Source:** [Crunchbase API](https://about.crunchbase.com/products/crunchbase-api)

---

### Dealroom (fundraising signals — preferred over Crunchbase for France)

| Attribute | Detail |
|-----------|--------|
| What | European startup intelligence — funding rounds, investors, headcount, growth analytics |
| Coverage | Strongest European coverage, used by 100+ government agencies across 40+ countries |
| Pricing | Enterprise only. Minimum ~€12,500/year (3-seat minimum). API access requires Enterprise plan. No self-serve pricing |
| Auth | API key (custom contract) |
| Rate limits | Enterprise SLA |
| GDPR | Company-level data; funding is public |
| Fit | Excellent coverage, prohibitive price for a v1.3 milestone |

**Decision: Do NOT add in v1.3.** Price is prohibitive at this stage (~€12.5k/year minimum). Use Crunchbase Basic ($49/mo) for international rounds, and Pappers/Societeinfo BODACC for French capital increase notices (which appear as legal notices and serve as a fundraising proxy for non-VC-backed companies).

**Source:** [Dealroom pricing](https://dealroom.co/pricing-2025)

---

### Adzuna API (job-posting history — secondary to France Travail)

| Attribute | Detail |
|-----------|--------|
| What | Job aggregator API — real-time job listings across 19 countries including France |
| Coverage | Aggregates WTTJ, Indeed, and other French job boards |
| Pricing | Free developer tier with daily/monthly rate limits. Aggressively rate-limited on free tier |
| Auth | App ID + App Key (free developer account) |
| Rate limits | Low on free tier — exact limits not publicly documented, but sources describe aggressive throttling |
| GDPR | Public job postings; no personal data |
| Fit | MEDIUM. Complements France Travail by covering jobs posted on boards that don't syndicate to France Travail |

**Decision: Use as complement, not primary.** France Travail is the reliable, well-documented primary. Add Adzuna only if France Travail coverage gaps are confirmed in testing.

**Source:** [Adzuna Developer Portal](https://developer.adzuna.com/)

---

## Layer 3 — Decision-Maker Contact Enrichment

**Architecture rule from PROJECT.md:** Contact enrichment fires only when a company crosses the heat score threshold. This is the most expensive API call — budget-gating is mandatory.

---

### Dropcontact (recommended primary for email enrichment)

| Attribute | Detail |
|-----------|--------|
| What | French B2B email enrichment — generates and verifies professional emails in real-time via proprietary algorithm. No database — emails computed, not retrieved |
| Coverage | 94% success rate on French contacts (vs. 62% for US) |
| Pricing | Credit-based: ~€29/mo (500 credits/Starter), ~€49/mo (Growth), ~€99/mo (Business with API access). ~2–5 centimes per credit at volume. **API access requires Business tier (~€74–99/mo)** |
| Auth | API key |
| Rate limits | Not a hard concern — enrichment is async (batch queue) |
| GDPR | Structural GDPR compliance. Zero database — generates on-the-fly. No data resale. French company (France-based CNIL jurisdiction). Explicitly compliant posture |
| Fit | Best GDPR fit in the market. 94% FR coverage is industry-leading |

**Use for:** Email enrichment for all decision-maker contacts. Input: first name + last name + company domain. Output: professional email + verification status + company enrichment.

**Limitation:** Returns email only — no phone number, no LinkedIn URL, no direct dial. Combine with Kaspr or Pharow for phone when needed.

**Integration:** Async batch API. POST enrichment job, poll or webhook for result. Fits cleanly into a `@workflow/next` workflow step.

**Source:** [Dropcontact pricing](https://www.dropcontact.com/pricing), [GDPR analysis](https://salesdorado.com/en/automation/review-dropcontact/)

---

### Kaspr (phone + direct email enrichment — secondary)

| Attribute | Detail |
|-----------|--------|
| What | LinkedIn-based phone and email enrichment — cross-references LinkedIn profiles with Cognism data assets |
| Coverage | Strong EU/France coverage; powered by Cognism verified data |
| Pricing | Free: 5 phones + 15 emails/mo. Starter: €45/mo (1,200 phones/year). Business: €79/mo (2,400 phones/year). API available from Starter (on request) |
| Auth | API key |
| Rate limits | Credit-based per plan |
| GDPR | CNIL fined €240,000 in December 2024 for scraping LinkedIn contacts of restricted-visibility users and excessive 5-year retention. **CNIL closed the order in March 2026** after Kaspr deleted its database, ceased LinkedIn collection, and overhauled retention + transparency. Risk is materially reduced post-compliance, but operational history is concerning |
| Fit | Good for phone numbers in France — still among the strongest providers for mobile/direct numbers |

**Use for:** Phone number enrichment when a decision-maker email is known (Dropcontact sourced) but phone is needed for cold calling. Use selectively above the heat threshold.

**Risk posture:** The CNIL compliance closure is positive, but Kaspr's new data sourcing (post-LinkedIn ban) needs monitoring. Use for phone enrichment only, not as primary email source.

**Source:** [Kaspr pricing](https://help.kaspr.io/en/articles/8800588-kaspr-pricing-and-subscription-plans), [CNIL sanction](https://www.cnil.fr/en/data-scraping-kaspr-fined-eu240000), [CNIL closure](https://www.cnil.fr/en/closure-order-issued-against-kaspr)

---

### Pharow (recommended aggregator — build vs buy evaluation)

| Attribute | Detail |
|-----------|--------|
| What | French B2B prospecting platform — 4M companies, 10M prospects, 1,300+ filters. Aggregates Dropcontact + FullEnrich for email, Kaspr/BetterContact for phones. Detects hiring, funding, and growth signals. Magic filters: "Recrutements", "Levées de fonds", technology stack |
| Coverage | France-only; 78.7% email coverage, 76% phone coverage |
| Pricing | Essential: €105–139/mo (500 searches, 1,000 credits). Advanced: €169–229/mo (1,000 searches, 1,000 credits). Custom: 5+ users. Annual saves 25% |
| Auth | CRM sync (HubSpot, Pipedrive, Salesforce, Lemlist, Make) + webhook export. API in beta/limited — not a developer-first API product |
| Rate limits | N/A — platform-based, not API-first |
| GDPR | Relies on Dropcontact + FullEnrich for email (both GDPR-compliant); phone via Kaspr/BetterContact |
| Fit | High fit for the ESN sales team as a manual prospecting tool. Low fit as a programmatic backend data provider |

**Build vs Buy decision:**

Pharow is excellent for a human-operated prospecting workflow. However, it is **not designed for programmatic API integration** — it is a SaaS prospecting platform, not a data API. The `/prospection` feature requires server-side automation (cron + scoring + workflow), not a platform login.

**Recommendation: Do NOT use Pharow as the data backend.** Use it for reference/competitive analysis only. Build the signal pipeline directly from the source APIs (SIRENE + Pappers + France Travail + Dropcontact + ScrapIn).

**Use Pharow instead:** If the team wants a manual fallback for recruiters to do ad-hoc prospecting in parallel with the automated pipeline. Two-tier approach: auto-pipeline via API stack + Pharow for manual exploration.

**Source:** [Pharow tarifs](https://www.pharow.com/tarifs), [Pharow fonctionnalités](https://www.pharow.com/fonctionnalites)

---

### Apollo.io (not recommended — GDPR risk)

| Attribute | Detail |
|-----------|--------|
| What | US-based B2B intelligence platform — 275M contacts, 60M companies. Strong global coverage |
| Pricing | Enrichment: $0.20/credit. API available on paid plans. Plans start at $49/mo |
| GDPR | HIGH RISK. LinkedIn removed Apollo's page in early 2025 due to data policy violations. French contacts sourced from pre-scraped database — opaque legal basis for processing. CNIL could cite Apollo under French data protection enforcement. Cognism (parent of Kaspr) explicitly positions against Apollo on GDPR compliance |
| Fit | Low for French market. Coverage of French SMBs (typical ESN prospects) weaker than Dropcontact for emails, weaker than Kaspr for phones |

**Decision: Do NOT use Apollo.io.** GDPR exposure is real, French coverage is inferior to native FR providers, and the data sourcing opacity creates compliance risk for the ESN's clients' data.

**Source:** [Apollo.io GDPR concerns](https://www.cognism.com/blog/apollo-io-pricing)

---

### Nomination.fr (niche enrichment — optional)

| Attribute | Detail |
|-----------|--------|
| What | French B2B database specialized in decision-makers — 200,000 influencers in 50,000 companies. Human-verified by 60 Paris-based experts. Org charts, assistants, direct contacts |
| Pricing | Custom pricing — not publicly listed. Multiple tiers (Sales Intelligence, Pro, Enterprise). Quote required |
| Auth | API (CRM integration available) |
| GDPR | Human-verified, France-based. Strong compliance posture for C-level data |
| Fit | Excellent fit for large-account DRH/CTO contacts. Overkill for the typical SMB ESN prospect volume |

**Decision: Defer to v1.4.** Nomination covers only large companies (50k companies) and requires a sales call for pricing. Not worth the procurement overhead for v1.3 where the contact enrichment pipeline is being established with simpler providers first. Revisit when ESN clients need boardroom-level contacts.

**Source:** [Nomination.fr](https://www.nomination.fr/)

---

## Recommended Provider Stack per Signal

| Signal | Primary Provider | Secondary/Fallback | Cost Model |
|--------|-----------------|-------------------|------------|
| Company base (SIREN/sector/size/geo) | INSEE SIRENE API | Pappers `/recherche` | Free + credits |
| Company financial signals (revenue, headcount brackets) | Pappers `/comptes` | Societeinfo | Credits (~€0.05–0.10/co) |
| Director names (pre-enrichment) | Pappers `/dirigeants` | Nomination (deferred) | Credits |
| Fundraising — large rounds (Series A+) | Crunchbase Basic | Pappers BODACC | $49/mo |
| Fundraising — all French rounds | Pappers BODACC capital increases | Crunchbase | Credits |
| LinkedIn headcount growth | ScrapIn | Apify LinkedIn actors | ~$49–149/mo |
| LinkedIn management arrivals | ScrapIn | — | Credits |
| Job posting history | France Travail API | Adzuna (complement) | Free |
| Public tender awards | BOAMP + DECP | — | Free |
| Contact email enrichment | Dropcontact | FullEnrich | ~€99/mo (API tier) |
| Contact phone enrichment | Kaspr | BetterContact | ~€45–79/mo |

---

## npm Package Additions

**No new npm packages required for data providers.** All providers use REST APIs consumed via native `fetch` in Next.js API routes or workflow steps. No SDK available (or needed) for any of the above providers.

The only potential addition is a utility for OAuth2 token management:

```bash
# Only if implementing token caching abstraction (optional — can use Supabase secrets directly)
# No new package — use existing Supabase client for token storage
```

Store API keys and OAuth tokens in environment variables:
- `SIRENE_API_TOKEN` (INSEE OAuth2, refreshed every hour)
- `PAPPERS_API_KEY`
- `SOCIETEINFO_API_KEY`
- `SCRAPIN_API_KEY`
- `CRUNCHBASE_API_KEY`
- `FRANCE_TRAVAIL_CLIENT_ID` + `FRANCE_TRAVAIL_CLIENT_SECRET`
- `DROPCONTACT_API_KEY`
- `KASPR_API_KEY`

---

## Integration with Existing Stack

### Supabase
- New `prospection_companies` table keyed on SIREN. All signal data stored as JSONB columns per signal type.
- `prospection_signals` table with `company_siren`, `signal_type`, `signal_date`, `payload JSONB`, `score_contribution`.
- Contact enrichment results cached in `prospection_contacts` — do not re-enrich until stale (>30 days).

### `@workflow/next` Workflows
- Each automation run is a workflow: company discovery → signal collection (parallel steps per source) → scoring → contact enrichment (gated) → persist results.
- Signal collection steps per source run as parallel workflow branches (BOAMP, France Travail, Pappers, ScrapIn) to maximize throughput.
- Contact enrichment step fires only when `heat_score >= threshold`.

### Cron Routes
- Vercel cron route (`/api/cron/prospection`) triggers automation runs. Existing cron pattern already present in codebase.
- Manual "live" trigger via POST from UI maps to same workflow entry point.

### React Query
- `/api/prospection/companies` returns paginated list sorted by heat score.
- `/api/prospection/automation` CRUD for automation configurations.
- Results page uses existing React Query + Supabase Realtime pattern for live updates during workflow execution.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Proxycurl (already in repo) | Shut down permanently July 2025. Dead API | ScrapIn (drop-in replacement) |
| Apollo.io | GDPR exposure, weak French coverage, data sourcing opacity | Dropcontact + Kaspr |
| Dealroom API | €12,500/year minimum — prohibitive for v1.3 | Crunchbase Basic + Pappers BODACC |
| Nomination.fr (v1.3) | Custom pricing, only 50k large-company coverage, sales process overhead | Pappers `/dirigeants` for now |
| Kaspr as email primary | CNIL history, post-compliance data sourcing uncertain | Dropcontact for email |
| Pharow as backend API | Not API-first; SaaS prospecting platform, not programmable data provider | Direct provider stack |
| Societeinfo as signal source | Explicitly lacks commercial signals (hiring, funding, tech) | Pappers + France Travail |
| LinkedIn official API | Does not expose headcount, job changes, or employee data to non-partners | ScrapIn (with legal awareness) |
| Adzuna as primary | Free tier is aggressively rate-limited; coverage overlaps with France Travail | France Travail API |
| Any web scraping of WTTJ/Indeed | ToS violations, fragile, maintenance burden | France Travail API + Adzuna if needed |

---

## GDPR & Legal Notes

**Structural risk: LinkedIn data via ScrapIn**
ScrapIn operates in the same legal zone that destroyed Proxycurl. LinkedIn sued Proxycurl for scraping non-public data via fake accounts. The risk mitigation is: (1) scrape only public profiles, (2) use low volume (per-company, not bulk), (3) gate behind heat score threshold so only ~top 10% of pipeline touches ScrapIn. This is exactly the architecture already specified in PROJECT.md. Monitor ScrapIn's legal status actively.

**Dropcontact GDPR posture: strongest available**
Zero database, real-time generation, no resale, French company, CNIL jurisdiction. Best-in-class GDPR posture for email enrichment. Prefer over Apollo, Lusha, or any US-domiciled database provider.

**Kaspr post-CNIL compliance**
The CNIL order was formally closed in March 2026. Kaspr deleted its LinkedIn-sourced database and rebuilt data sourcing on Cognism assets. The immediate regulatory risk is resolved. Use for phone enrichment with awareness that data sourcing practices should be monitored. Kaspr is now backed by Cognism, a UK-based company with strong EU compliance track record.

**SIRENE / BODACC / BOAMP / DECP**
All French government open data. No GDPR concerns for company-level data. Director names in Pappers are derived from public RCS filings — legal basis is legitimate interest under RGPD for B2B prospecting of company representatives.

**Email outreach / cold calling**
The feature produces a contact list — not automated outreach. The ESN recruiter places the call manually. RGPD Article 6(1)(f) legitimate interest applies to B2B prospecting. No automated processing of personal data at decision-making level. Include in product documentation.

---

## Version Compatibility

No new npm packages means no compatibility matrix to manage. All providers are REST APIs. Token management can be implemented with the existing `@supabase/supabase-js` client for secret storage, and existing `fetch`/`NextResponse` patterns for API route integration.

---

## Sources

- [INSEE SIRENE API — portail-api.insee.fr](https://portail-api.insee.fr/catalog/api/2ba0e549-5587-3ef1-9082-99cd865de66f) — HIGH confidence (official government portal)
- [Pappers API documentation v3](https://www.pappers.fr/api/documentation/v3) — HIGH confidence (official docs)
- [Societeinfo API docs + credit pricing](https://tutoriels.societeinfo.com/knowledge/combien-co%C3%BBte-lutilisation-de-lapi-1) — HIGH confidence (official help center)
- [France Travail API Offres d'emploi — francetravail.io](https://francetravail.io/data/api/offres-emploi) — HIGH confidence (official portal)
- [BOAMP API — boamp.fr](https://www.boamp.fr/pages/api-boamp/) — HIGH confidence (official DILA portal)
- [DECP — data.gouv.fr](https://www.data.gouv.fr/datasets/api-decp) — HIGH confidence (official)
- [Proxycurl shutdown — StartupHub.ai](https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down) — HIGH confidence (confirmed via multiple sources)
- [ScrapIn.io — Proxycurl alternative](https://linkedapi.io/guides/proxycurl-alternatives) — MEDIUM confidence (WebSearch, multiple sources agree)
- [Dropcontact pricing](https://www.dropcontact.com/pricing) — HIGH confidence (official pricing page)
- [Kaspr CNIL fine](https://www.cnil.fr/en/data-scraping-kaspr-fined-eu240000) — HIGH confidence (official CNIL)
- [CNIL order closure for Kaspr](https://www.cnil.fr/en/closure-order-issued-against-kaspr) — HIGH confidence (official CNIL)
- [Kaspr pricing 2026](https://help.kaspr.io/en/articles/8800588-kaspr-pricing-and-subscription-plans) — HIGH confidence (official help center)
- [Pharow tarifs](https://www.pharow.com/tarifs) — HIGH confidence (official pricing page)
- [Crunchbase API free tier gone](https://dev.to/agenthustler/crunchbase-api-in-2026-free-tier-gone-what-startup-data-hunters-do-now-1177) — MEDIUM confidence (WebSearch, third-party analysis)
- [Dealroom pricing](https://dealroom.co/pricing-2025) — HIGH confidence (official pricing page)
- [Adzuna developer portal](https://developer.adzuna.com/) — MEDIUM confidence (free tier limits not formally documented)
- [Apollo.io GDPR concerns](https://www.cognism.com/blog/apollo-io-pricing) — LOW confidence (competitor source — but LinkedIn page removal is independently verifiable)

---

*Stack research for: v1.3 Prospection — French company targeting + hiring signals + decision-maker enrichment*
*Researched: 2026-07-03*

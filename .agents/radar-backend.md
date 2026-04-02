# Radar Prospect — Module de prospection intelligente pour ESN

## Contexte projet

Ce document est le contexte de développement du module "Radar Prospect" à intégrer dans une app Next.js existante. Il sert de référence pour implémenter chaque brique du module.

Radar Prospect détecte automatiquement les entreprises ayant un besoin de consultants IT, en croisant des signaux provenant de sources multiples (offres d'emploi, marchés publics, données LinkedIn, presse). Un moteur IA attribue un score de "chaleur" à chaque prospect, matche les profils disponibles dans le vivier de consultants, et génère un brief actionnable pour le recruteur.

Le concept central est le **Signal Graph** : chaque entreprise est un nœud, chaque signal une arête pondérée. Quand plusieurs arêtes convergent sur le même nœud dans une fenêtre de temps courte, le score explose — c'est un "prospect chaud".

## Stack existante (ne pas changer)

- **Framework** : Next.js App Router (`app/` directory)
- **Auth** : Clerk (organizations = tenants ESN)
- **Base de données** : Supabase (PostgreSQL)
- **Jobs async** : Vercel Workflow
- **Scheduling** : Vercel Cron
- **Hébergement** : Vercel
- **Langage** : TypeScript (strict)

## Stack à ajouter (module Radar)

- **Scraping offres emploi** : Cloudflare Browser Rendering `/json` endpoint (extraction IA structurée)
- **Scraping marchés publics** : Cloudflare Browser Rendering `/scrape` endpoint (sélecteurs CSS sur BOAMP)
- **Scraping presse** : Firecrawl `scrape` endpoint (conversion articles → markdown LLM-ready)
- **Enrichissement LinkedIn** : Proxycurl REST API (profils entreprises, détection externes)
- **Embeddings** : OpenAI `text-embedding-3-small` pour le matching vivier via pgvector
- **Briefs IA** : Anthropic Claude API via Vercel AI SDK (streaming natif React)
- **Recherche vectorielle** : pgvector (extension Supabase à activer)

## Variables d'environnement à ajouter

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=       # Permission: Browser Rendering - Edit
FIRECRAWL_API_KEY=          # https://firecrawl.dev
PROXYCURL_API_KEY=          # https://nubela.co/proxycurl
ANTHROPIC_API_KEY=          # Pour les briefs IA
OPENAI_API_KEY=             # Pour les embeddings text-embedding-3-small
```

---

## Structure de fichiers à créer

Tous les fichiers ci-dessous sont NOUVEAUX. Ne modifier aucun fichier existant sauf `vercel.json` (ajout crons) et `.env.local` (ajout clés).

```
app/(dashboard)/radar/
├── page.tsx                        # Dashboard prospects scorés
├── [companyId]/page.tsx            # Fiche prospect détaillée
├── settings/page.tsx               # Config sources, seuils, filtres
└── components/
    ├── prospect-list.tsx           # Liste scorée avec filtres
    ├── prospect-card.tsx           # Carte prospect (score, pills signaux)
    ├── signal-timeline.tsx         # Timeline des signaux détectés
    ├── consultant-matches.tsx      # Matchs vivier avec % pertinence
    ├── ai-brief.tsx                # Brief streamé via Vercel AI SDK
    ├── score-breakdown.tsx         # Barres de décomposition du score
    └── sector-filters.tsx          # Filtres secteur/chaleur/techno/ville

app/api/radar/
├── prospects/route.ts              # GET liste scorée, POST action/feedback
├── prospects/[id]/route.ts         # GET fiche détaillée + signaux + matchs
├── brief/route.ts                  # POST générer brief (streaming response)
└── cron/
    ├── collect-signals/route.ts    # Déclenche les workflows de collecte
    └── compute-scores/route.ts     # Recalcule tous les scores

app/api/radar/workflows/
├── collect-jobs.workflow.ts        # Workflow collector offres d'emploi
├── collect-boamp.workflow.ts       # Workflow collector marchés publics
├── collect-press.workflow.ts       # Workflow collector presse
├── collect-linkedin.workflow.ts    # Workflow collector LinkedIn
└── score-prospects.workflow.ts     # Workflow scoring + convergence

lib/radar/
├── schemas.ts                      # Schemas Zod pour tous les types
├── scoring.ts                      # Calcul score + bonus convergence
├── collectors/
│   ├── jobs.ts                     # Collecte via Cloudflare /json
│   ├── boamp.ts                    # Collecte via Cloudflare /scrape
│   ├── press.ts                    # Collecte via Firecrawl
│   └── linkedin.ts                 # Collecte via Proxycurl
├── matching.ts                     # Matching vivier pgvector
├── brief.ts                        # Prompt engineering Claude + streaming
├── embeddings.ts                   # Génération embeddings OpenAI
└── queries.ts                      # Toutes les queries Supabase du module

supabase/migrations/
├── 20260329_001_enable_pgvector.sql
└── 20260329_002_radar_tables.sql
```

---

## Migration Supabase

### 20260329_001_enable_pgvector.sql

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 20260329_002_radar_tables.sql

```sql
-- Entreprises prospectées
CREATE TABLE radar_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,                           -- Clerk organization ID = tenant
  name TEXT NOT NULL,
  siren TEXT,
  sector TEXT,
  city TEXT,
  headcount INTEGER,
  website TEXT,
  linkedin_url TEXT,
  enrichment_data JSONB DEFAULT '{}',
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, siren)
);

-- Signaux détectés
CREATE TYPE signal_source AS ENUM ('job_offer', 'public_market', 'linkedin', 'press');

CREATE TABLE radar_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  source signal_source NOT NULL,
  title TEXT NOT NULL,
  raw_content TEXT,
  weight INTEGER NOT NULL DEFAULT 0,              -- 0-25
  metadata JSONB DEFAULT '{}',                    -- url_source, technos, etc.
  embedding vector(1536),                         -- text-embedding-3-small
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days')
);

-- Scores prospects (recalculés par le workflow)
CREATE TYPE heat_level AS ENUM ('cold', 'warm', 'hot', 'burning');

CREATE TABLE radar_prospect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,               -- 0-100
  signal_count INTEGER NOT NULL DEFAULT 0,
  convergence_bonus INTEGER NOT NULL DEFAULT 0,
  heat heat_level NOT NULL DEFAULT 'cold',
  breakdown JSONB DEFAULT '{}',                   -- {job_offer: 25, linkedin: 20, ...}
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- Consultants du vivier
CREATE TYPE availability_status AS ENUM ('available', 'on_mission', 'unavailable');

CREATE TABLE radar_consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  skills JSONB DEFAULT '[]',                      -- ["Java", "Spring Boot", "Angular"]
  skills_embedding vector(1536),                  -- embedding des compétences
  experience_years INTEGER,
  tjm INTEGER,                                    -- taux journalier moyen en euros
  availability availability_status DEFAULT 'available',
  available_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Matchs prospect ↔ consultant
CREATE TABLE radar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES radar_consultants(id) ON DELETE CASCADE,
  match_score REAL NOT NULL,                      -- 0.0 - 1.0 cosine similarity
  match_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, consultant_id)
);

-- Actions du recruteur (feedback loop)
CREATE TYPE action_type AS ENUM ('email_sent', 'call_made', 'linkedin_message', 'meeting', 'brief_generated', 'dismissed', 'feedback');
CREATE TYPE action_outcome AS ENUM ('pending', 'positive', 'negative', 'no_response');

CREATE TABLE radar_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,                          -- Clerk user ID
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  action action_type NOT NULL,
  outcome action_outcome DEFAULT 'pending',
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- Index performance
CREATE INDEX idx_signals_company ON radar_signals(company_id);
CREATE INDEX idx_signals_source ON radar_signals(source);
CREATE INDEX idx_signals_detected ON radar_signals(detected_at DESC);
CREATE INDEX idx_signals_expires ON radar_signals(expires_at);
CREATE INDEX idx_scores_org ON radar_prospect_scores(org_id);
CREATE INDEX idx_scores_heat ON radar_prospect_scores(heat);
CREATE INDEX idx_scores_score ON radar_prospect_scores(score DESC);
CREATE INDEX idx_companies_org ON radar_companies(org_id);
CREATE INDEX idx_companies_sector ON radar_companies(sector);
CREATE INDEX idx_consultants_org ON radar_consultants(org_id);
CREATE INDEX idx_actions_company ON radar_actions(company_id);

-- RLS (Row Level Security) — isolation multi-tenant via Clerk org_id
ALTER TABLE radar_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_prospect_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_actions ENABLE ROW LEVEL SECURITY;

-- Les policies RLS utilisent le org_id passé par le client Supabase.
-- À adapter selon ton setup Clerk + Supabase existant.
```

---

## Schemas Zod (lib/radar/schemas.ts)

Ces schemas sont la source de vérité pour tous les types du module. Ils servent à la validation des réponses API et au typage frontend.

```typescript
import { z } from "zod";

// --- Enums ---
export const SignalSource = z.enum(["job_offer", "public_market", "linkedin", "press"]);
export const HeatLevel = z.enum(["cold", "warm", "hot", "burning"]);
export const ActionType = z.enum(["email_sent", "call_made", "linkedin_message", "meeting", "brief_generated", "dismissed", "feedback"]);
export const ActionOutcome = z.enum(["pending", "positive", "negative", "no_response"]);

// --- Signal brut (sortie collector) ---
export const RawSignalSchema = z.object({
  source: SignalSource,
  title: z.string().min(1),
  rawContent: z.string().optional(),
  weight: z.number().int().min(0).max(25),
  metadata: z.record(z.unknown()).default({}),
  companyName: z.string(),
  companySiren: z.string().optional(),
  detectedAt: z.string().datetime().optional(),
});
export type RawSignal = z.infer<typeof RawSignalSchema>;

// --- Extraction offres emploi (schema pour Cloudflare /json) ---
export const JobOfferExtractionSchema = z.object({
  offers: z.array(z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    contractType: z.string(),          // CDI, CDD, freelance
    technologies: z.array(z.string()), // ["Java", "Angular", "Spring"]
    seniorityLevel: z.string(),
    salaryRange: z.string().optional(),
    postedDate: z.string().optional(),
    url: z.string().url().optional(),
  }))
});

// --- Extraction marchés publics (BOAMP) ---
export const PublicMarketSchema = z.object({
  reference: z.string(),
  title: z.string(),
  organization: z.string(),
  lots: z.array(z.object({
    number: z.string(),
    description: z.string(),
  })),
  estimatedBudget: z.string().optional(),
  deadline: z.string().optional(),
  url: z.string().optional(),
});

// --- Score prospect ---
export const ProspectScoreSchema = z.object({
  companyId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  signalCount: z.number().int(),
  convergenceBonus: z.number().int(),
  heat: HeatLevel,
  breakdown: z.record(z.number()),     // { job_offer: 25, linkedin: 20, ... }
});
export type ProspectScore = z.infer<typeof ProspectScoreSchema>;

// --- Match consultant ---
export const MatchSchema = z.object({
  consultantId: z.string().uuid(),
  consultantName: z.string(),
  matchScore: z.number().min(0).max(1),
  matchReason: z.string(),
  skills: z.array(z.string()),
  tjm: z.number().optional(),
  availability: z.string(),
});
```

---

## Logique de scoring (lib/radar/scoring.ts)

```typescript
import type { ProspectScore } from "./schemas";

// Poids de base par source
const SOURCE_WEIGHTS: Record<string, number> = {
  job_offer: 25,
  public_market: 25,
  linkedin: 20,
  press: 15,
  vivier_match: 15,
};

// Bonus de convergence (nombre de sources distinctes → bonus)
const CONVERGENCE_BONUS: Record<number, number> = {
  3: 15,
  4: 25,
  5: 35,
};

export function computeScore(signals: { source: string; weight: number }[], hasVivierMatch: boolean): ProspectScore {
  // Score de base : somme des poids
  const breakdown: Record<string, number> = {};
  for (const sig of signals) {
    breakdown[sig.source] = Math.max(breakdown[sig.source] ?? 0, sig.weight);
  }
  if (hasVivierMatch) {
    breakdown.vivier_match = SOURCE_WEIGHTS.vivier_match;
  }

  const baseScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Compter les sources distinctes actives
  const distinctSources = Object.keys(breakdown).length;
  const convergenceBonus = CONVERGENCE_BONUS[Math.min(distinctSources, 5)] ?? 0;

  const finalScore = Math.min(100, baseScore + convergenceBonus);

  // Niveau de chaleur
  let heat: "cold" | "warm" | "hot" | "burning" = "cold";
  if (finalScore >= 80) heat = "burning";
  else if (finalScore >= 60) heat = "hot";
  else if (finalScore >= 30) heat = "warm";

  return {
    companyId: "",  // à remplir par l'appelant
    score: finalScore,
    signalCount: signals.length,
    convergenceBonus,
    heat,
    breakdown,
  };
}
```

---

## Collectors — pattern commun

Chaque collector suit le même pattern : fetch une API externe → valider avec Zod → retourner des `RawSignal[]`. Les collectors sont des fonctions pures appelées par les Vercel Workflows.

### Collector offres d'emploi (lib/radar/collectors/jobs.ts)

Utilise Cloudflare Browser Rendering endpoint `/json` qui extrait des données structurées via IA.

```typescript
import { z } from "zod";
import { JobOfferExtractionSchema, type RawSignal } from "../schemas";

const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering`;

export async function collectJobOffers(searchQueries: string[]): Promise<RawSignal[]> {
  const allSignals: RawSignal[] = [];

  for (const query of searchQueries) {
    const url = `https://www.indeed.fr/jobs?q=${encodeURIComponent(query)}&l=France`;

    // Cloudflare /json : extraction IA structurée
    const res = await fetch(`${CF_BASE}/json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        prompt: "Extract all job offers from this page. For each offer, extract title, company, location, contract type, technologies mentioned, seniority level, salary range if visible, posting date, and URL.",
        schema: JobOfferExtractionSchema.shape.offers.element,
        waitForSelector: ".job_seen_beacon",
      }),
    });

    const data = await res.json();
    // data.result contient le JSON extrait par l'IA

    if (data.success && data.result) {
      const parsed = JobOfferExtractionSchema.safeParse({ offers: data.result });
      if (parsed.success) {
        // Grouper par entreprise et créer les signaux
        const byCompany = Object.groupBy(parsed.data.offers, (o) => o.company);

        for (const [company, offers] of Object.entries(byCompany)) {
          if (!offers || offers.length < 2) continue; // ignorer si < 2 offres

          allSignals.push({
            source: "job_offer",
            title: `${offers.length} offres ${offers[0].technologies.slice(0, 3).join("/")}`,
            rawContent: JSON.stringify(offers),
            weight: offers.length >= 5 ? 25 : offers.length >= 3 ? 20 : 15,
            metadata: {
              offerCount: offers.length,
              technologies: [...new Set(offers.flatMap((o) => o.technologies))],
              contractTypes: [...new Set(offers.map((o) => o.contractType))],
              urls: offers.map((o) => o.url).filter(Boolean),
            },
            companyName: company,
          });
        }
      }
    }
  }

  return allSignals;
}
```

### Collector marchés publics (lib/radar/collectors/boamp.ts)

Utilise Cloudflare `/scrape` avec sélecteurs CSS sur le BOAMP.

```typescript
import { PublicMarketSchema, type RawSignal } from "../schemas";

const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering`;

export async function collectPublicMarkets(): Promise<RawSignal[]> {
  const res = await fetch(`${CF_BASE}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: "https://www.boamp.fr/pages/recherche/?nature=appel-offre&rubrique=informatique",
      elements: [
        { selector: ".result-item", fields: {
          reference: { selector: ".ref", type: "text" },
          title: { selector: ".title", type: "text" },
          organization: { selector: ".org", type: "text" },
          deadline: { selector: ".date-limit", type: "text" },
          url: { selector: "a", type: "attribute", attribute: "href" },
        }}
      ],
    }),
  });

  const data = await res.json();
  if (!data.success) return [];

  const signals: RawSignal[] = [];

  for (const item of data.result ?? []) {
    const parsed = PublicMarketSchema.safeParse(item);
    if (!parsed.success) continue;

    // Filtrer les lots IT
    const itLots = parsed.data.lots.filter((l) =>
      /java|angular|cloud|devops|numérique|développement|informatique/i.test(l.description)
    );
    if (itLots.length === 0) continue;

    signals.push({
      source: "public_market",
      title: `AO: ${parsed.data.title}`,
      rawContent: JSON.stringify(parsed.data),
      weight: 25,
      metadata: {
        reference: parsed.data.reference,
        organization: parsed.data.organization,
        itLots: itLots,
        deadline: parsed.data.deadline,
        url: parsed.data.url,
      },
      companyName: parsed.data.organization,
    });
  }

  return signals;
}
```

### Collector presse (lib/radar/collectors/press.ts)

Utilise Firecrawl pour convertir des articles en markdown, puis Claude pour extraire les signaux.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { type RawSignal } from "../schemas";

export async function collectPressSignals(rssUrls: string[]): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const anthropic = new Anthropic();

  for (const rssUrl of rssUrls) {
    // 1. Utiliser Firecrawl pour scraper les articles
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: rssUrl, formats: ["markdown"] }),
    });

    const article = await scrapeRes.json();
    if (!article.success) continue;

    // 2. Extraire les signaux via Claude
    const extraction = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Analyse cet article et extrait les signaux de prospection ESN. 
Signaux pertinents : nomination DSI/CTO/CDO, levée de fonds, projet de transformation digitale, externalisation IT, création de filiale tech.

Article:
${article.data.markdown}

Réponds UNIQUEMENT en JSON (pas de markdown) avec ce format:
{"signals": [{"company": "...", "signal_type": "nomination|fundraising|digital_transformation|outsourcing", "title": "...", "details": "..."}]}`
      }],
    });

    const text = extraction.content[0].type === "text" ? extraction.content[0].text : "";
    try {
      const parsed = JSON.parse(text);
      for (const sig of parsed.signals ?? []) {
        signals.push({
          source: "press",
          title: sig.title,
          rawContent: sig.details,
          weight: 15,
          metadata: {
            signalType: sig.signal_type,
            sourceUrl: rssUrl,
            articleTitle: article.data.metadata?.title,
          },
          companyName: sig.company,
        });
      }
    } catch { /* skip malformed response */ }
  }

  return signals;
}
```

### Collector LinkedIn (lib/radar/collectors/linkedin.ts)

Utilise Proxycurl pour détecter les consultants externes dans les équipes.

```typescript
import { type RawSignal } from "../schemas";

const PROXYCURL_BASE = "https://nubela.co/proxycurl/api";

export async function collectLinkedInSignals(companyUrls: string[]): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const headers = { Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}` };

  for (const url of companyUrls) {
    // 1. Récupérer les employés avec mots-clés consultant/prestataire
    const empRes = await fetch(
      `${PROXYCURL_BASE}/linkedin/company/employees?` +
      new URLSearchParams({
        url,
        keyword_regex: "consultant|prestataire|freelance|externe",
        page_size: "50",
      }),
      { headers }
    );

    if (!empRes.ok) continue;
    const empData = await empRes.json();

    const externals = empData.employees?.filter((e: any) =>
      /consultant|prestataire|freelance|ESN|SSII/i.test(e.headline ?? "")
    ) ?? [];

    if (externals.length < 2) continue;

    // 2. Récupérer le nom de l'entreprise
    const compRes = await fetch(
      `${PROXYCURL_BASE}/linkedin/company?url=${encodeURIComponent(url)}`,
      { headers }
    );
    const compData = compRes.ok ? await compRes.json() : { name: url };

    // Détecter les ESN d'origine des externes
    const esnSources = externals
      .map((e: any) => e.company_name)
      .filter(Boolean);
    const esnCounts = Object.entries(
      esnSources.reduce((acc: Record<string, number>, name: string) => {
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      }, {})
    ).sort(([, a], [, b]) => (b as number) - (a as number));

    signals.push({
      source: "linkedin",
      title: `${externals.length} consultants externes identifiés`,
      rawContent: JSON.stringify({ externals: externals.slice(0, 10), esnCounts }),
      weight: externals.length >= 5 ? 20 : 15,
      metadata: {
        externalCount: externals.length,
        esnSources: Object.fromEntries(esnCounts.slice(0, 5)),
        linkedinUrl: url,
        headcount: compData.company_size_on_linkedin,
      },
      companyName: compData.name ?? "Unknown",
    });
  }

  return signals;
}
```

---

## Vercel Workflow — pattern

Chaque workflow est déclenché par un Vercel Cron. Voici le pattern pour le collector offres d'emploi.

```typescript
// app/api/radar/workflows/collect-jobs.workflow.ts
import { createWorkflow, step } from "@vercel/workflow";
import { collectJobOffers } from "@/lib/radar/collectors/jobs";
import { upsertSignals } from "@/lib/radar/queries";

export const collectJobsWorkflow = createWorkflow({
  id: "collect-jobs",
  execute: async (context) => {
    const orgId = context.input.orgId;

    const signals = await step("fetch-job-offers", async () => {
      return collectJobOffers([
        "développeur java Paris",
        "développeur angular France",
        "devops cloud Paris",
        "data engineer France",
        "tech lead java France",
      ]);
    });

    await step("persist-signals", async () => {
      await upsertSignals(orgId, signals);
    });

    return { collected: signals.length };
  },
});
```

### Vercel Cron (vercel.json)

Ajouter dans le `vercel.json` existant :

```json
{
  "crons": [
    {
      "path": "/api/radar/cron/collect-signals",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/radar/cron/compute-scores",
      "schedule": "30 */6 * * *"
    }
  ]
}
```

---

## Brief IA (lib/radar/brief.ts)

Utilise le Vercel AI SDK pour streamer le brief dans le dashboard.

```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export function generateBrief(prospect: {
  companyName: string;
  signals: { source: string; title: string; rawContent: string }[];
  matches: { name: string; skills: string[]; tjm: number; availability: string }[];
}) {
  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Tu es un assistant de prospection pour une ESN. Tu génères des briefs concis et actionnables pour aider les recruteurs à approcher des prospects. Structure ton brief en 3 parties : Contexte (ce qu'on sait), Opportunité (pourquoi maintenant), Angle recommandé (quoi dire et à qui). Sois direct et factuel.`,
    prompt: `Génère un brief de prospection pour ${prospect.companyName}.

Signaux détectés :
${prospect.signals.map((s) => `- [${s.source}] ${s.title}`).join("\n")}

Consultants disponibles à proposer :
${prospect.matches.map((m) => `- ${m.name} (${m.skills.join(", ")}) — TJM ${m.tjm}€ — ${m.availability}`).join("\n")}

Génère le brief.`,
  });
}
```

### Route API brief (app/api/radar/brief/route.ts)

```typescript
import { generateBrief } from "@/lib/radar/brief";
// ... fetch prospect data from Supabase, then:
return generateBrief(prospectData).toDataStreamResponse();
```

### Composant React (app/(dashboard)/radar/components/ai-brief.tsx)

```typescript
"use client";
import { useChat } from "@ai-sdk/react";

export function AiBrief({ companyId }: { companyId: string }) {
  const { messages, isLoading } = useChat({
    api: "/api/radar/brief",
    body: { companyId },
  });
  // ... render streaming text
}
```

---

## Matching vivier pgvector (lib/radar/matching.ts)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function findMatchingConsultants(
  orgId: string,
  signalEmbedding: number[],
  limit = 5
) {
  // Recherche par similarité cosinus via pgvector
  const { data, error } = await supabase.rpc("match_consultants", {
    query_embedding: signalEmbedding,
    match_org_id: orgId,
    match_threshold: 0.7,
    match_count: limit,
  });

  if (error) throw error;
  return data;
}
```

La fonction RPC Supabase correspondante :

```sql
CREATE OR REPLACE FUNCTION match_consultants(
  query_embedding vector(1536),
  match_org_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  skills jsonb,
  tjm integer,
  availability availability_status,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id, rc.name, rc.skills, rc.tjm, rc.availability,
    1 - (rc.skills_embedding <=> query_embedding) AS similarity
  FROM radar_consultants rc
  WHERE rc.org_id = match_org_id
    AND rc.availability != 'unavailable'
    AND 1 - (rc.skills_embedding <=> query_embedding) > match_threshold
  ORDER BY rc.skills_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Règles de développement

- Toujours valider les réponses des APIs externes avec Zod (`safeParse`, jamais `parse` direct)
- Utiliser le `org_id` de Clerk (via `auth()`) pour filtrer toutes les queries Supabase
- Préfixer toutes les tables avec `radar_` pour éviter les conflits avec les tables existantes
- Les collectors ne doivent jamais crash : try/catch partout, log les erreurs, continuer
- Les signaux expirent après 90 jours (champ `expires_at`), les queries filtrent automatiquement
- Le scoring est recalculé toutes les 6h (30min après la collecte pour que les signaux soient frais)
- Le brief IA est généré à la demande (pas en batch) pour économiser les tokens Claude
- Utiliser `unstable_cache` de Next.js pour cacher les résultats de scoring côté serveur
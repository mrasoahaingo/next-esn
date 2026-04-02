---
phase: quick-260402-fxx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260402_001_linkedin_context.sql
  - lib/radar/settings.ts
  - app/api/radar/linkedin-session/route.ts
  - lib/radar/collectors/linkedin-browser.ts
  - app/api/radar/workflows/collect-linkedin.workflow.ts
  - app/(dashboard)/radar/components/radar-settings-form.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Un admin peut créer une session Browserbase LinkedIn via l'UI radar settings"
    - "Le liveUrl s'ouvre dans un nouvel onglet pour que l'utilisateur se connecte"
    - "Le contextId est persisté en base et utilisé par le collecteur LinkedIn"
    - "linkedinContextId n'est jamais exposé dans GET /api/radar/settings"
    - "Un admin peut déconnecter la session (supprime le contextId en base)"
    - "Le collecteur Stagehand réutilise le contexte Browserbase si disponible"
  artifacts:
    - path: "supabase/migrations/20260402_001_linkedin_context.sql"
      provides: "Colonne linkedin_context_id sur radar_org_settings"
    - path: "app/api/radar/linkedin-session/route.ts"
      provides: "GET (statut), POST (créer session), DELETE (déconnecter)"
    - path: "lib/radar/settings.ts"
      provides: "saveLinkedInContext() + linkedinContextId dans radarSettingsSchema"
  key_links:
    - from: "app/(dashboard)/radar/components/radar-settings-form.tsx"
      to: "/api/radar/linkedin-session"
      via: "fetch POST → window.open(liveUrl)"
    - from: "lib/radar/collectors/linkedin-browser.ts"
      to: "getRadarSettings(orgId)"
      via: "linkedinContextId → browserbaseSessionCreateParams.context"
---

<objective>
Implémenter la gestion de session LinkedIn par org via Browserbase Contexts.

Purpose: Permettre aux collecteurs LinkedIn Stagehand de réutiliser une session authentifiée, évitant les blocages LinkedIn sur les comptes non connectés.
Output: Migration SQL, backend (settings + API), collecteur mis à jour, UI settings avec section "Connexion LinkedIn".
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/Users/mrasoahaingo/Projects/perso/next-esn/lib/radar/settings.ts
@/Users/mrasoahaingo/Projects/perso/next-esn/app/api/radar/settings/route.ts
@/Users/mrasoahaingo/Projects/perso/next-esn/lib/radar/collectors/linkedin-browser.ts
@/Users/mrasoahaingo/Projects/perso/next-esn/app/api/radar/workflows/collect-linkedin.workflow.ts
@/Users/mrasoahaingo/Projects/perso/next-esn/app/(dashboard)/radar/components/radar-settings-form.tsx

<interfaces>
<!-- Patterns existants à respecter -->

Depuis lib/radar/settings.ts:
```typescript
// Pattern upsert existant
export async function upsertRadarSettings(orgId: string, patch: RadarSettingsPatch): Promise<RadarSettings>
// Pattern lecture
export async function getRadarSettings(orgId: string): Promise<RadarSettings>
// getSupabase() est disponible côté serveur (service role implicite)
import { getSupabase } from '@/lib/utils/supabase';
```

Depuis app/api/radar/settings/route.ts:
```typescript
// Pattern auth à respecter
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
// requireOrgAdmin() retourne { orgId }
// requireOrgId() retourne string
// Pattern error handling
if (error instanceof NextResponse) return error;
return NextResponse.json({ error: (error as Error).message }, { status: 500 });
```

Depuis lib/radar/collectors/linkedin-browser.ts:
```typescript
// createStagehand() actuel — sans contexte
function createStagehand() {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
    keepAlive: true,
  });
}
// collectLinkedInBrowserSignals(companyUrls: string[]) — signature actuelle
```

Depuis app/api/radar/workflows/collect-linkedin.workflow.ts:
```typescript
// Appel actuel du browser collector
collectLinkedInBrowserSignals(urls)
// orgId est déjà disponible dans fetchAllLinkedInSignals via closure
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration SQL + backend (settings.ts + route API linkedin-session)</name>
  <files>
    supabase/migrations/20260402_001_linkedin_context.sql
    lib/radar/settings.ts
    app/api/radar/linkedin-session/route.ts
  </files>
  <action>
**1. Créer `supabase/migrations/20260402_001_linkedin_context.sql`** :
```sql
ALTER TABLE radar_org_settings
  ADD COLUMN IF NOT EXISTS linkedin_context_id TEXT;
```

**2. Mettre à jour `lib/radar/settings.ts`** :

Dans `radarSettingsSchema`, ajouter après `updatedAt` :
```typescript
linkedinContextId: z.string().nullable().optional(),
```

Ne PAS toucher `radarSettingsPatchSchema` (ce champ n'est pas patchable par le front).

Dans `mapRowToSettings`, ajouter dans l'objet passé à `radarSettingsSchema.parse()` :
```typescript
linkedinContextId: row?.linkedin_context_id ?? null,
```

Dans `DEFAULT_RADAR_SETTINGS`, ajouter :
```typescript
linkedinContextId: null,
```

Ajouter la fonction `saveLinkedInContext` à la fin du fichier :
```typescript
export async function saveLinkedInContext(orgId: string, contextId: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('radar_org_settings')
    .upsert(
      { org_id: orgId, linkedin_context_id: contextId },
      { onConflict: 'org_id' }
    );
  if (error) throw error;
}
```

**3. Créer `app/api/radar/linkedin-session/route.ts`** :

```typescript
import Browserbase from '@browserbasehq/sdk';
import { NextResponse } from 'next/server';
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getRadarSettings, saveLinkedInContext } from '@/lib/radar/settings';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const settings = await getRadarSettings(orgId);
    return NextResponse.json({ connected: Boolean(settings.linkedinContextId) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();
    const projectId = process.env.BROWSERBASE_PROJECT_ID!;
    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

    const context = await bb.contexts.create({ projectId });
    const session = await bb.sessions.create({
      projectId,
      browserSettings: { context: { id: context.id, persist: true } },
    });

    await saveLinkedInContext(orgId, context.id);

    return NextResponse.json({
      liveUrl: `https://www.browserbase.com/sessions/${session.id}`,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { orgId } = await requireOrgAdmin();
    await saveLinkedInContext(orgId, null);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('DELETE /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

Vérifier que `@browserbasehq/sdk` est dans `package.json`. Si absent, l'ajouter via `pnpm add @browserbasehq/sdk`.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && pnpm tsc --noEmit 2>&1 | grep -E "linkedin-session|settings" | head -20</automated>
  </verify>
  <done>
    - Migration SQL créée avec ADD COLUMN linkedin_context_id TEXT
    - radarSettingsSchema inclut linkedinContextId (lecture seule)
    - saveLinkedInContext() exportée depuis settings.ts
    - Route GET/POST/DELETE /api/radar/linkedin-session compilée sans erreur TS
    - linkedinContextId absent de radarSettingsPatchSchema
  </done>
</task>

<task type="auto">
  <name>Task 2: Collecteur linkedin-browser.ts + workflow + UI settings</name>
  <files>
    lib/radar/collectors/linkedin-browser.ts
    app/api/radar/workflows/collect-linkedin.workflow.ts
    app/(dashboard)/radar/components/radar-settings-form.tsx
  </files>
  <action>
**1. Mettre à jour `lib/radar/collectors/linkedin-browser.ts`** :

Modifier `createStagehand` pour accepter un contextId optionnel :
```typescript
function createStagehand(contextId?: string | null) {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    // @ts-expect-error — modelName exists at runtime (Stagehand V3 types incomplete)
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
    keepAlive: true,
    ...(contextId
      ? {
          browserbaseSessionCreateParams: {
            projectId: process.env.BROWSERBASE_PROJECT_ID!,
            browserSettings: { context: { id: contextId, persist: true } },
          },
        }
      : {}),
  });
}
```

Modifier la signature de `collectLinkedInBrowserSignals` pour accepter `orgId` :
```typescript
export async function collectLinkedInBrowserSignals(
  companyUrls: string[],
  orgId?: string,
): Promise<{ signals: RawSignal[]; calls: ApiCall[] }>
```

Au début de la fonction, après la guard `BROWSERBASE_API_KEY`, lire le contextId :
```typescript
// Ajouter l'import en haut du fichier
import { getRadarSettings } from '@/lib/radar/settings';

// Dans collectLinkedInBrowserSignals, après la guard BROWSERBASE_API_KEY :
let contextId: string | null = null;
if (orgId) {
  try {
    const settings = await getRadarSettings(orgId);
    contextId = settings.linkedinContextId ?? null;
  } catch {
    // ignore — collecteur continue sans contexte
  }
}

const stagehand = createStagehand(contextId);
```

**2. Mettre à jour `app/api/radar/workflows/collect-linkedin.workflow.ts`** :

Dans `fetchAllLinkedInSignals`, passer `orgId` au browser collector. Changer la signature :
```typescript
async function fetchAllLinkedInSignals(urls: string[], orgId: string)
```

Mettre à jour l'appel :
```typescript
collectLinkedInBrowserSignals(urls, orgId),
```

Mettre à jour l'appel dans `collectLinkedInWorkflow` :
```typescript
const { signals, calls } = await fetchAllLinkedInSignals(urls, orgId);
```

**3. Ajouter la section "Connexion LinkedIn" dans `radar-settings-form.tsx`** :

Ajouter l'import du Badge (shadcn) en haut :
```typescript
import { Badge } from '@/components/ui/badge';
```

Ajouter un state et un query pour le statut de connexion, après les states existants :
```typescript
const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
const linkedinSessionQuery = useQuery({
  queryKey: ['radar', 'linkedin-session', orgId],
  enabled: Boolean(orgId),
  queryFn: async () => {
    const res = await fetch('/api/radar/linkedin-session');
    if (!res.ok) throw new Error('Impossible de vérifier la session LinkedIn');
    return res.json() as Promise<{ connected: boolean }>;
  },
});
```

Ajouter les handlers après les handlers existants (avant le return JSX) :
```typescript
async function handleLinkedInConnect() {
  setConnectingLinkedIn(true);
  try {
    const res = await fetch('/api/radar/linkedin-session', { method: 'POST' });
    if (!res.ok) throw new Error('Impossible de créer la session LinkedIn');
    const { liveUrl } = await res.json();
    window.open(liveUrl, '_blank');
    queryClient.invalidateQueries({ queryKey: ['radar', 'linkedin-session', orgId] });
    toast.success('Session créée — connectez-vous à LinkedIn dans l\'onglet ouvert');
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    setConnectingLinkedIn(false);
  }
}

async function handleLinkedInDisconnect() {
  try {
    const res = await fetch('/api/radar/linkedin-session', { method: 'DELETE' });
    if (!res.ok) throw new Error('Impossible de déconnecter la session LinkedIn');
    queryClient.invalidateQueries({ queryKey: ['radar', 'linkedin-session', orgId] });
    toast.success('Session LinkedIn déconnectée');
  } catch (error) {
    toast.error((error as Error).message);
  }
}
```

Ajouter la section dans le JSX, après la section "LinkedIn Discovery" existante et avant le bouton de sauvegarde (chercher le dernier `</Card>` avant le bouton submit) :
```tsx
<Card>
  <CardHeader>
    <CardTitle>Connexion LinkedIn</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Connectez un compte LinkedIn pour que le collecteur Stagehand puisse accéder aux pages protégées.
    </p>
    <div className="flex items-center gap-3">
      {linkedinSessionQuery.data?.connected ? (
        <>
          <Badge variant="default" className="bg-green-600">Connecté</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLinkedInDisconnect}
          >
            Déconnecter
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleLinkedInConnect}
          disabled={connectingLinkedIn}
        >
          {connectingLinkedIn ? 'Création de la session…' : 'Connecter mon LinkedIn'}
        </Button>
      )}
    </div>
  </CardContent>
</Card>
```
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && pnpm tsc --noEmit 2>&1 | grep -E "linkedin-browser|collect-linkedin|radar-settings-form" | head -20</automated>
  </verify>
  <done>
    - createStagehand(contextId?) injecte browserbaseSessionCreateParams si contextId fourni
    - collectLinkedInBrowserSignals(urls, orgId?) lit getRadarSettings et passe le contextId
    - collect-linkedin.workflow.ts passe orgId au browser collector
    - radar-settings-form.tsx affiche section "Connexion LinkedIn" avec statut connecté/déconnecté
    - Badge vert "Connecté" + bouton "Déconnecter" quand connected=true
    - Bouton "Connecter mon LinkedIn" ouvre liveUrl dans nouvel onglet quand connected=false
    - pnpm tsc --noEmit passe sans erreur sur ces fichiers
  </done>
</task>

</tasks>

<verification>
```bash
cd /Users/mrasoahaingo/Projects/perso/next-esn && pnpm tsc --noEmit 2>&1 | tail -5
```
Doit retourner 0 erreur TS.

Vérifier manuellement que :
- `GET /api/radar/settings` ne retourne PAS `linkedinContextId` (champ uniquement interne)
- `GET /api/radar/linkedin-session` retourne `{ connected: boolean }`
- `POST /api/radar/linkedin-session` crée context + session Browserbase et retourne `{ liveUrl }`
- `DELETE /api/radar/linkedin-session` supprime le contextId et retourne `{ success: true }`
</verification>

<success_criteria>
- Migration SQL appliquée (colonne linkedin_context_id sur radar_org_settings)
- Endpoint POST crée un Browserbase Context + Session et retourne liveUrl
- Endpoint DELETE supprime le contextId en base
- Collecteur linkedin-browser.ts réutilise le contexte Browserbase si linkedinContextId présent
- UI settings affiche statut connecté/déconnecté avec actions correspondantes
- linkedinContextId jamais exposé via GET /api/radar/settings
- pnpm tsc --noEmit passe sans erreur
</success_criteria>

<output>
Après complétion, créer `.planning/quick/260402-fxx-impl-menter-la-gestion-de-session-linked/260402-fxx-SUMMARY.md`
</output>

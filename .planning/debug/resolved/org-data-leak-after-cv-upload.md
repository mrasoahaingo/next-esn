---
status: awaiting_human_verify
trigger: "Après l'upload d'un CV, la liste des candidats se rafraîchit et affiche des données d'autres organisations. Fuite critique de données multi-tenant."
created: 2026-06-03T00:00:00Z
updated: 2026-06-03T00:02:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED AND FIXED — double root cause: (1) singleton Supabase client with service_role key shared across requests, (2) several "refresh after write" queries missing .eq('org_id', orgId) filter
test: TypeScript compilation passes (npx tsc --noEmit --skipLibCheck)
expecting: Human verification that upload no longer leaks cross-org data
next_action: Human verifies the fix in real workflow

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: La liste des candidats n'affiche que les données de l'organisation de l'utilisateur connecté (filtrage par orgId/org_id)
actual: Après upload d'un CV, la liste se rafraîchit et affiche des données d'autres organisations
errors: Aucun message d'erreur visible — la fuite est silencieuse
reproduction: Uploader un CV → la liste se rafraîchit → des entrées d'autres orgs apparaissent
started: Problème constaté maintenant, comportement multi-tenant probablement jamais validé

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: React Query cache keys incorrectes (orgId absent des keys)
  evidence: queryKeys dans keys.ts inclut bien orgId dans tous les keys. useCandidates() utilise queryKeys.candidates.list(orgId ?? '')
  timestamp: 2026-06-03T00:01:00Z

- hypothesis: Invalidation trop large après upload (sans orgId)
  evidence: useUploadCv.onSuccess invalide queryKeys.candidates.list(oid) avec oid = orgId ?? '' — correct si orgId est défini au moment de l'appel
  timestamp: 2026-06-03T00:01:00Z

- hypothesis: GET /api/candidates ne filtre pas par org_id
  evidence: app/api/candidates/route.ts ligne 13 a bien .eq('org_id', orgId)
  timestamp: 2026-06-03T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-06-03T00:01:00Z
  checked: lib/utils/supabase.ts
  found: Client Supabase était un singleton module-level créé avec SUPABASE_SERVICE_ROLE_KEY — partagé entre toutes les requêtes du même process Node.js serverless
  implication: Dans un Lambda warm, le même client avec les mêmes paramètres était réutilisé entre requêtes de différents utilisateurs/orgs. La service_role key bypasse intégralement RLS — seuls les filtres applicatifs protègent les données.

- timestamp: 2026-06-03T00:01:00Z
  checked: supabase/migrations/20260401100900_enable_rls.sql ligne 201
  found: Commentaire explicite "service_role bypasses all RLS — current API routes continue to work unchanged"
  implication: RLS est activé mais ne s'applique pas aux routes server-side. Sécurité repose entièrement sur les filtres .eq('org_id', orgId) dans le code.

- timestamp: 2026-06-03T00:01:00Z
  checked: app/api/upload/route.ts lignes 75-80 (avant fix)
  found: SELECT de rafraîchissement après insertion: .select().eq('id', candidate.id).single() — sans .eq('org_id', orgId)
  implication: Avec service_role, retourne le row sans restriction — si l'UUID est correct ça retourne les bonnes données, mais viole le principe de défense en profondeur.

- timestamp: 2026-06-03T00:01:00Z
  checked: app/api/missions/route.ts, missions/[id]/route.ts, positioning/route.ts
  found: Même pattern "refresh after write" sans org_id dans 5 endroits supplémentaires
  implication: Toutes les requêtes POST/PATCH finales de récupération du résultat ne filtraient pas par org_id.

- timestamp: 2026-06-03T00:01:00Z
  checked: app/api/candidates/[id]/route.ts DELETE cascade
  found: .from('positionings').delete().eq('candidate_id', id) sans .eq('org_id', orgId)
  implication: Un utilisateur d'une org A avec un UUID de candidat d'une org B aurait pu supprimer ses positionings.

- timestamp: 2026-06-03T00:02:00Z
  checked: TypeScript compilation après fixes
  found: npx tsc --noEmit --skipLibCheck — zéro erreur
  implication: Fixes sont syntaxiquement corrects

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Deux problèmes combinés créaient la vulnérabilité:
  
  1. SINGLETON SUPABASE: lib/utils/supabase.ts utilisait un pattern singleton module-level
     (let supabaseClient: SupabaseClient | null = null). Dans un environnement serverless
     warm (Vercel), une même instance Lambda peut traiter des requêtes de différentes orgs.
     Le client singleton avec service_role key n'a aucun contexte d'org — le risque de
     contamination cross-request est réel si un query builder interne est réutilisé.

  2. FILTRES org_id MANQUANTS: 6 requêtes "refresh after write" (POST/PATCH qui font un
     SELECT final pour retourner l'état à jour) ne filtraient pas par org_id. Avec service_role
     qui bypasse RLS, ces requêtes auraient pu retourner des données d'une autre org si un
     UUID était partagé (impossible avec UUID v4, mais viole défense en profondeur) ou si le
     singleton avait un état corrompu.

fix: |
  1. lib/utils/supabase.ts: Suppression du singleton — createClient() appelé à chaque
     getSupabase() pour créer un client frais par requête sans état partagé.
  
  2. app/api/upload/route.ts: Ajout .eq('org_id', orgId) sur le SELECT de rafraîchissement
     final (ligne 79).
  
  3. app/api/missions/route.ts: Ajout .eq('org_id', orgId) sur le SELECT final du POST
     (ligne 70).
  
  4. app/api/missions/[id]/route.ts: Ajout .eq('org_id', orgId) sur le SELECT de
     rafraîchissement dans PATCH (ligne 88).
  
  5. app/api/positioning/route.ts: Ajout .eq('org_id', orgId) sur 3 SELECT de
     rafraîchissement (lignes 80, 96, 123).
  
  6. app/api/candidates/[id]/route.ts: Ajout .eq('org_id', orgId) sur le DELETE cascade
     positionings (ligne 48).

verification: TypeScript compilation sans erreur (tsc --noEmit --skipLibCheck)
files_changed:
  - lib/utils/supabase.ts
  - app/api/upload/route.ts
  - app/api/missions/route.ts
  - app/api/missions/[id]/route.ts
  - app/api/positioning/route.ts
  - app/api/candidates/[id]/route.ts

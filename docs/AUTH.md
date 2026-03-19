# Auth, Organisations & Super Admin — Documentation technique

Stack : **Clerk** (`@clerk/nextjs` v7) + Next.js 16 App Router

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Configuration Clerk Dashboard](#3-configuration-clerk-dashboard)
4. [Modèle de rôles](#4-modèle-de-rôles)
5. [Middleware — protection des routes](#5-middleware--protection-des-routes)
6. [Helpers auth serveur](#6-helpers-auth-serveur)
7. [Hooks client](#7-hooks-client)
8. [Pages d'authentification](#8-pages-dauthentification)
9. [API Routes — Invitations](#9-api-routes--invitations)
10. [API Routes — Membres](#10-api-routes--membres)
11. [Page Équipe `/settings/team`](#11-page-équipe-settingsteam)
12. [Page Administration `/admin`](#12-page-administration-admin)
13. [Flux utilisateur complet](#13-flux-utilisateur-complet)
14. [Opérations manuelles (Clerk Dashboard)](#14-opérations-manuelles-clerk-dashboard)
15. [Dépannage](#15-dépannage)

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                      CLERK (Identity)                       │
│                                                             │
│  Users ──── Organizations ──── Memberships ──── Invitations │
└─────────────────────────────────────────────────────────────┘
         │                │
         │                └─── org:admin / org:member
         │
         └─── publicMetadata.role = "super_admin"  ← manuel via Dashboard
```

Himeo utilise **deux niveaux d'accès indépendants** :

| Niveau | Source | Portée |
|--------|--------|--------|
| `super_admin` | `user.publicMetadata.role` | Plateforme entière |
| `org:admin` / `org:member` | Rôle Clerk Organization | Une organisation spécifique |

Un `super_admin` peut être admin de sa propre org ET voir toutes les orgs dans `/admin`.

---

## 2. Variables d'environnement

```bash
# .env.local

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# URL de l'app (utilisée pour les liens d'invitation)
NEXT_PUBLIC_APP_URL=http://localhost:3000   # dev
# NEXT_PUBLIC_APP_URL=https://mon-domaine.com  # prod
```

---

## 3. Configuration Clerk Dashboard

### Étapes obligatoires

#### 3.1 Activer les Organisations
> **Configure** → **Organizations** → activer "Enable organizations"

#### 3.2 Configurer le token de session (CRITIQUE)
Sans cette étape, `publicMetadata.role` n'est pas disponible dans les session claims → le super admin ne fonctionne pas.

> **Configure** → **Sessions** → **Customize session token** → ajouter :
```json
{
  "metadata": "{{user.public_metadata}}"
}
```

#### 3.3 Configurer les URLs
> **Configure** → **Paths**

| Champ | Valeur dev | Valeur prod |
|-------|-----------|-------------|
| Home URL | `http://localhost:3000` | `https://mon-domaine.com` |
| Sign-in URL | `/sign-in` | `/sign-in` |
| Sign-up URL | `/sign-up` | `/sign-up` |

#### 3.4 Whitelister les redirect URLs des invitations
> **Configure** → **Restrictions** → **Allowed redirect URLs**

Ajouter : `http://localhost:3000` (dev) et `https://mon-domaine.com` (prod).

Sans cela, les liens d'invitation retournent 404 sur `clerk.accounts.dev`.

#### 3.5 Créer un Super Admin
> **Users** → [utilisateur] → **Metadata** (onglet "Public") → ajouter :
```json
{
  "role": "super_admin"
}
```

---

## 4. Modèle de rôles

### 4.1 Hiérarchie

```
super_admin
  └── Accès plateforme : /admin, stats globales toutes orgs
  └── Peut gérer l'équipe de n'importe quelle org (bypassé dans requireOrgAdmin)

org:admin
  └── Accès org : inviter, changer les rôles, retirer des membres
  └── Page /settings/team

org:member
  └── Accès org : utiliser l'app normalement
  └── Ne peut pas gérer l'équipe
```

### 4.2 Source des rôles

```typescript
// super_admin : stocké dans Clerk user.publicMetadata (persistant, cross-session)
user.publicMetadata.role === 'super_admin'

// org:admin / org:member : rôle de membership Clerk Organization
session.orgRole === 'org:admin'
session.has({ role: 'org:admin' })
```

### 4.3 Type TypeScript

```typescript
// lib/utils/auth.ts
export type AppRole = 'super_admin' | 'org:admin' | 'org:member'
```

### 4.4 Augmentation des session claims

```typescript
// types/clerk.d.ts
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: string
    }
  }
}
```

Ce fichier permet à TypeScript de reconnaître `sessionClaims.metadata.role` sans cast.

---

## 5. Middleware — protection des routes

**Fichier** : `middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/org-selection(.*)',
  '/.well-known/(.*)',    // endpoint Workflow DevKit
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Routes publiques : passer sans vérification
  if (isPublicRoute(request)) return

  const session = await auth.protect()   // redirige vers /sign-in si non connecté
  const isSuperAdmin = session.sessionClaims?.metadata?.role === 'super_admin'

  // Route /admin : super_admin requis
  if (isAdminRoute(request)) {
    if (!isSuperAdmin) return NextResponse.redirect(new URL('/', request.url))
    return
  }

  // Toutes les autres routes : org active requise
  if (!session.orgId) {
    return NextResponse.redirect(new URL('/org-selection', request.url))
  }
})
```

### Matrice de redirection

| État utilisateur | Route demandée | Résultat |
|-----------------|---------------|---------|
| Non connecté | `/` | → `/sign-in` |
| Connecté, sans org | `/` | → `/org-selection` |
| Connecté, avec org | `/org-selection` | → `/` (server-side dans la page) |
| Connecté, non super_admin | `/admin` | → `/` |
| Super admin | `/admin` | ✅ accès |

---

## 6. Helpers auth serveur

**Fichier** : `lib/utils/auth.ts`

Ces fonctions s'utilisent **uniquement côté serveur** (API Routes, Server Components).

### `getAuthContext()`

Retourne le contexte complet sans lever d'erreur.

```typescript
const ctx = await getAuthContext()
// ctx.userId, ctx.orgId, ctx.orgRole, ctx.isSuperAdmin, ctx.has
```

### `requireAuth()`

Lance une `NextResponse` 401 si l'utilisateur n'est pas connecté.

```typescript
// Dans une API route :
let ctx
try {
  ctx = await requireAuth()
} catch (res) {
  return res as NextResponse
}
```

### `requireOrgId()`

Lance 401 si non connecté, 403 si pas d'org active. Retourne `orgId`.

```typescript
const orgId = await requireOrgId()
```

### `requireSuperAdmin()`

Lance 403 si pas `super_admin`. Retourne le contexte complet.

```typescript
let ctx
try {
  ctx = await requireSuperAdmin()
} catch (res) {
  return res as NextResponse
}
```

### `requireOrgAdmin()`

Lance 403 si pas `org:admin` (ou `super_admin`). Retourne `{ ...ctx, orgId }`.

```typescript
let ctx
try {
  ctx = await requireOrgAdmin()
} catch (res) {
  return res as NextResponse
}
// ctx.orgId est garanti non-null ici
```

> **Note** : `requireOrgAdmin` bypass le check de rôle si `isSuperAdmin = true`. Un super admin peut donc agir comme admin sur toutes les organisations.

---

## 7. Hooks client

### `useSuperAdmin()` — `lib/hooks/useSuperAdmin.ts`

```typescript
const { isSuperAdmin, isLoaded } = useSuperAdmin()
```

Lit `user.publicMetadata.role` côté client. Utiliser `isLoaded` avant de conditionner l'affichage.

### `useOrgRole()` — `lib/hooks/useOrgRole.ts`

```typescript
const { role, isOrgAdmin, isOrgMember, isLoaded } = useOrgRole()
```

Lit le rôle de membership de l'organisation active via `useOrganization()`.

### Utilisation combinée (ex: sidebar)

```typescript
const { isSuperAdmin } = useSuperAdmin()
const { isOrgAdmin } = useOrgRole()
const canManageTeam = isOrgAdmin || isSuperAdmin
```

---

## 8. Pages d'authentification

### `/sign-in` — `app/sign-in/[[...sign-in]]/page.tsx`

Composant `<SignIn />` de Clerk, stylisé avec le thème dark Himeo. La route catch-all `[[...sign-in]]` est requise pour que Clerk gère ses redirections internes (OAuth callbacks, MFA, etc.).

### `/sign-up` — `app/sign-up/[[...sign-up]]/page.tsx`

Même pattern avec `<SignUp />`.

### `/org-selection` — `app/org-selection/page.tsx`

Page Server Component. Redirige vers `/` si l'utilisateur a déjà une org active.
Affiche `<OrganizationList>` de Clerk qui montre :
- Les organisations dont l'utilisateur est membre
- Les invitations **en attente** reçues (bouton "Rejoindre")
- Un bouton "Créer une organisation"

```typescript
<OrganizationList
  hidePersonal                      // masque l'espace personnel Clerk
  afterCreateOrganizationUrl="/"
  afterSelectOrganizationUrl="/"
/>
```

### `ClerkProvider` — `app/layout.tsx`

Wrappe toute l'app, configuré avec :
- `localization={frFR}` — UI Clerk en français
- `appearance` — thème dark personnalisé (couleurs Himeo : violet, fond #0c0c0f)

---

## 9. API Routes — Invitations

### `GET /api/invitations`

Liste les invitations **en attente** de l'organisation active.
**Accès** : `org:admin` ou `super_admin`

**Réponse** :
```typescript
[{
  id: string
  emailAddress: string
  role: 'org:admin' | 'org:member'
  status: 'pending'
  url: string | null     // lien d'invitation copié depuis Clerk
  createdAt: number
}]
```

---

### `POST /api/invitations`

Envoie une invitation email via le Clerk Backend SDK.
**Accès** : `org:admin` ou `super_admin`

**Corps** :
```json
{
  "emailAddress": "prenom.nom@himeo.fr",
  "role": "org:member"
}
```

**Comportement** :
- Utilise `NEXT_PUBLIC_APP_URL` comme `redirectUrl` (obligatoire et whitelisté dans Clerk)
- Clerk envoie un email avec un lien `https://[clerk-domain]/v1/tickets/accept?ticket=JWT`
- Le JWT contient `rurl` (redirect URL) → doit être whitelisté dans Clerk Dashboard

**Réponse** : objet `OrganizationInvitation` Clerk (201)

---

### `DELETE /api/invitations/[id]`

Révoque une invitation (le lien email ne fonctionnera plus).
**Accès** : `org:admin` ou `super_admin`

**Réponse** : 204 No Content

---

## 10. API Routes — Membres

### `GET /api/members`

Liste les membres actuels de l'organisation (max 100).
**Accès** : `org:admin` ou `super_admin`

**Réponse** :
```typescript
[{
  id: string          // membership ID
  userId: string      // Clerk user ID
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  identifier: string  // email
  role: 'org:admin' | 'org:member'
  createdAt: number
}]
```

---

### `PATCH /api/members/[id]`

Change le rôle d'un membre. `[id]` = `userId` Clerk.
**Accès** : `org:admin` ou `super_admin`

**Corps** : `{ "role": "org:admin" }` ou `{ "role": "org:member" }`

---

### `DELETE /api/members/[id]`

Retire un membre de l'organisation. `[id]` = `userId` Clerk.
**Accès** : `org:admin` ou `super_admin`

**Garde-fou** : impossible de se retirer soi-même (400 avec message explicite).

---

## 11. Page Équipe `/settings/team`

**Fichier** : `app/settings/team/page.tsx`

Visible dans la sidebar uniquement pour `org:admin` et `super_admin`.
Redirige vers `/` si l'utilisateur n'a pas les droits.

### Fonctionnalités

| Section | Description |
|---------|-------------|
| **Formulaire d'invitation** | Email + sélecteur de rôle + bouton Inviter |
| **Bandeau lien** | Apparaît après invitation : URL copiable avec bouton "Copier" + check vert |
| **Liste membres** | Avatar, nom, email, sélecteur de rôle inline, bouton de retrait (avec confirmation) |
| **Invitations en attente** | Email, date, rôle, bouton copier le lien, bouton révoquer (avec confirmation) |

### Hooks React Query utilisés

```typescript
useMembers()           // GET /api/members
useInvitations()       // GET /api/invitations
useInviteMember()      // POST /api/invitations
useRevokeInvitation()  // DELETE /api/invitations/[id]
useUpdateMemberRole()  // PATCH /api/members/[id]
useRemoveMember()      // DELETE /api/members/[id]
```

Définis dans `lib/queries/team.ts`, exportés depuis `lib/queries/index.ts`.

---

## 12. Page Administration `/admin`

**Fichier** : `app/admin/page.tsx`

Accessible uniquement aux `super_admin` (double protection : middleware + check client-side).

### Données affichées

- **Totaux plateforme** : nb organisations, CVs, positionnements, tokens IA entrée/sortie
- **Tableau par organisation** : stats détaillées par `org_id` (données issues de Supabase)

### Source des données

API route `GET /api/admin/stats` (protégée par `requireSuperAdmin()`).
Agrège les tables Supabase `candidates`, `positionings`, `ai_usage_log` groupées par `org_id`.

---

## 13. Flux utilisateur complet

### Flux 1 — Nouveau utilisateur invité

```
org:admin
  → /settings/team
  → Saisit email + rôle → "Inviter"
  → POST /api/invitations → Clerk envoie email
  → Bandeau avec lien copiable (partage alternatif via Slack etc.)

Nouvel utilisateur
  → Reçoit email Clerk avec lien d'invitation
  → Clique → https://[clerk].accounts.dev/v1/tickets/accept?ticket=JWT
  → Clerk valide ticket → ajoute à l'org → redirige vers NEXT_PUBLIC_APP_URL
  → Middleware : orgId présent → accès à /
```

### Flux 2 — Connexion utilisateur existant

```
Utilisateur
  → / (ou n'importe quelle route protégée)
  → Middleware : non connecté → /sign-in
  → Connexion → Clerk redirige vers /
  → Middleware : orgId présent → accès accordé

  Si orgId absent (premier accès ou org supprimée) :
  → Middleware → /org-selection
  → Choisit ou crée une org → /
```

### Flux 3 — Super Admin

```
Fondateur
  → Clerk Dashboard → Users → [user] → Public Metadata → { "role": "super_admin" }
  → Se connecte → session token contient metadata.role = "super_admin"
  → Sidebar affiche "Administration"
  → Accès à /admin avec stats toutes organisations
```

---

## 14. Opérations manuelles (Clerk Dashboard)

| Opération | Où | Comment |
|-----------|-----|---------|
| Créer un super_admin | Users → [user] → Metadata → Public | `{ "role": "super_admin" }` |
| Retirer un super_admin | Users → [user] → Metadata → Public | Supprimer la clé `role` |
| Créer une organisation | Organizations → Create | Nom + slug |
| Inviter un membre (sans l'app) | Organizations → [org] → Members → Invite | Email + rôle |
| Voir les invitations en attente | Organizations → [org] → Invitations | — |
| Désactiver création d'org libre | Configure → Organizations | Décocher "Allow users to create organizations" |
| Ajouter redirect URL autorisée | Configure → Restrictions | URL de l'app (obligatoire pour invitations) |
| Configurer Home URL | Configure → Paths | URL de l'app |

---

## 15. Dépannage

### Le lien d'invitation retourne 404 sur `clerk.accounts.dev`

**Cause** : `redirectUrl` absent ou non whitelisté.

**Fix** :
1. Vérifier que `NEXT_PUBLIC_APP_URL` est bien défini dans `.env.local`
2. Ajouter cette URL dans Clerk Dashboard → Configure → Restrictions → Allowed redirect URLs
3. S'assurer que la **Home URL** est configurée dans Clerk Dashboard → Configure → Paths

---

### Après acceptation de l'invitation, l'utilisateur atterrit sur la page Clerk Account Portal

**Cause** : La **Home URL** n'est pas configurée dans Clerk Dashboard.

**Fix** : Configure → Paths → Home URL → `http://localhost:3000`

---

### `sessionClaims.metadata` est `undefined` côté serveur

**Cause** : Le token de session n'est pas personnalisé dans Clerk Dashboard.

**Fix** : Configure → Sessions → Customize session token → ajouter `{ "metadata": "{{user.public_metadata}}" }`

---

### `isSuperAdmin` est toujours `false` alors que la metadata est bien définie

**Cause** : Le token de session a été généré **avant** d'ajouter le template. Les tokens Clerk sont valides 1h.

**Fix** : Déconnecter et reconnecter l'utilisateur pour forcer un nouveau token.

---

### Un `org:admin` voit l'erreur "Forbidden – admin only"

**Cause** : `session.orgId` est absent (pas d'org active dans la session).

**Fix** : S'assurer que l'utilisateur a sélectionné une org via `/org-selection` ou `OrganizationSwitcher`.

---

### La liste des membres est vide

**Cause** : L'org active dans la session ne correspond pas à l'org réelle.

**Fix** : Vérifier dans `OrganizationSwitcher` que la bonne org est sélectionnée.

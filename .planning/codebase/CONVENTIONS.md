# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- Component files: PascalCase with `.tsx` extension (e.g., `app-header.tsx`, `QueryProvider.tsx`)
- Utility/service files: camelCase with `.ts` extension (e.g., `positioning.service.ts`, `useAutoSave.ts`)
- API routes: kebab-case directory structure matching REST pattern (e.g., `/api/candidates/[id]/route.ts`)
- UI components from shadcn: kebab-case (e.g., `button.tsx`, `alert-dialog.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAutoSave.ts`, `useOrgRole.ts`)
- Stores: camelCase with `.store.ts` suffix (e.g., `cv-builder.store.ts`, `positioning.store.ts`)

**Functions:**
- Handlers: camelCase, descriptive verbs (e.g., `useCandidates`, `buildBreadcrumbs`, `formatTotalExperienceYears`)
- React components: PascalCase (e.g., `AppHeader`, `QueryProvider`, `Button`)
- Utility functions: camelCase (e.g., `cn`, `parsePositioningAnswers`, `normalizeExtractedCvExperienceTime`)
- Service functions: camelCase with descriptive action verbs (e.g., `buildMissionPositionHeadline`, `mergePositioningOutputPartial`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `ACTIVE_CV_STATUSES`, `POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY`)
- Local variables/properties: camelCase (e.g., `candidateId`, `jobDescription`, `orgId`)
- Boolean flags: camelCase with `is`, `has`, `can` prefixes (e.g., `isCurrent`, `hasConcreteEndDate`, `isDirty`)
- Zustand store state: camelCase (e.g., `cvData`, `pdfBlobUrl`, `isPdfLoading`)

**Types:**
- Interfaces/Types: PascalCase (e.g., `CvBuilderState`, `Crumb`, `PositioningRecruiterAnswerEntry`)
- Schema/Zod objects: camelCase (e.g., `templateConfigSchema`, `createPositioningSchema`, `extractionSchema`)
- Inferred types from schemas: PascalCase with `Type` suffix (e.g., `TemplateConfig`, `Skill`, `ExtractedCV`)
- Generic type parameters: Single uppercase letters (e.g., `T extends Partial<JobPostingAnalysis>`)

## Code Style

**Formatting:**
- Prettier is configured in ESLint (no separate `.prettierrc`)
- Line length: No hard limit enforced, but consistent with modern defaults (~80-100 characters for readability)
- Indentation: 2 spaces
- Semicolons: Enabled (enforced via ESLint)
- Quote style: Single quotes for strings in TypeScript (enforced by ESLint config)

**Linting:**
- ESLint configuration: `eslint.config.mjs` (flat config)
- Base configurations: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Target environment: Next.js with strict TypeScript checking
- Strict mode: Full TypeScript strict mode enabled (`"strict": true` in tsconfig.json)

## Import Organization

**Order:**
1. External framework/library imports (React, Next.js, third-party packages)
2. Type imports (e.g., `import type { ... } from '...'`)
3. Internal utility/lib imports (from `@/lib`)
4. Component imports (from `@/components`)
5. Relative imports (from current or parent directory) — rarely used due to path aliases

**Path Aliases:**
- `@/*` → Project root (e.g., `@/lib/utils`, `@/components/ui/button`)
- Used for all imports except in rare cases (internal module relative imports)
- Configured in `tsconfig.json` and `components.json`

**Example pattern from codebase:**
```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import type { ExtractedCV } from '@/lib/schema';
```

## Error Handling

**Patterns:**
- Try-catch blocks in async functions (especially API routes and mutations)
- Error type-guard: `if (error instanceof NextResponse) return error;` before generic error handling
- Generic error casting: `(error as Error).message` for unknown error types
- JSON responses for API errors: `NextResponse.json({ error: message }, { status: 500 })`
- Schema validation with Zod: `parsed.success` check before using data, returning `fieldErrors` for 400 responses

**API Route pattern:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const parsed = createPositioningSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    // ... handler logic
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

**Supabase error handling:**
- Check `error` field from response: `if (error) throw error;`
- Throw to be caught by outer try-catch block
- Include context in error message when possible (operation, resource type)

## Logging

**Framework:** Native `console` object (no dedicated logging library)

**Patterns:**
- `console.error()`: API errors, workflow failures, extraction errors
  - Example: `console.error('Extraction error:', error);`
  - Example: `console.error('admin stats ai_usage_log', error)`
- `console.warn()`: Non-fatal issues, development warnings
  - Example: `console.warn(\`[middleware] auth.protect() failed...\`)`
- No widespread use of `console.log` in production code (prefer structured logging if needed)

**Context:**
- Errors include operation context: "Upload error", "Extraction error", "Job description extract error"
- Development-only logs guarded by `process.env.NODE_ENV === 'development'`
- Middleware logs include request method and pathname for debugging

## Comments

**When to Comment:**
- Complex business logic that isn't immediately obvious (e.g., barème weighting rules, date calculation edge cases)
- Boundary comments for major sections (e.g., `// ─── Template config ─────────────────────────────────────────────`)
- Reserved key names and their purpose (e.g., `candidat:` and `client:` prefixes in positioning answers)
- Compatibility notes for legacy data structures

**JSDoc/TSDoc:**
- Used selectively for exported functions and types, especially in service layers
- Example from codebase:
  ```typescript
  /** Débounced auto-save hook that persists data to a PATCH endpoint. */
  export function useAutoSave(positioningId: string | null) { ... }
  ```
- Parameters documented with inline `/** description */` syntax in type definitions
- Zod schema descriptions (via `.describe()`) serve as inline documentation for extracted data structure

**French comments:**
- Acceptable in codebase when describing business logic (e.g., "Compat", "n'est pas fourni dans ce message")
- Helps align with domain language (French client context)

## Function Design

**Size:**
- Typical range: 5-30 lines for utility functions, 20-50 lines for components
- Service functions may extend 50-100+ lines (e.g., `buildAnalysisUserContent`)
- Long functions are decomposed into smaller helper functions

**Parameters:**
- Single object parameter for functions with 2+ parameters (enables optional fields and type safety)
- Example: `buildMissionPositionHeadline(mission: { title?: string | null; company?: string | null })`
- Positional parameters acceptable for 1-2 simple arguments

**Return Values:**
- Explicit return types on all exported functions
- Void for side-effect functions (mutations, void handlers)
- Nullability explicit: `string | undefined` not `string | null` (preferred unless data source enforces null)
- Async functions return `Promise<T>`

**Example function patterns:**
```typescript
// Utility function with single return
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Service function with object parameter
export function buildMissionPositionHeadline(
  mission: { title?: string | null; company?: string | null } | null | undefined,
): string | undefined { ... }

// Hook with options object
export function useSessionTimer(options: {
  sessionTimeoutSeconds?: number;
  onTimeout?: () => void;
}) { ... }

// Component with props interface (implicit)
export function QueryProvider({ children }: { children: React.ReactNode }) { ... }
```

## Module Design

**Exports:**
- Barrel exports in `lib/queries/index.ts` consolidate related hooks and types
- Named exports for specific functionality (rarely `export default`)
- Type exports via `export type { TypeName }`

**Example barrel pattern:**
```typescript
// lib/queries/index.ts
export { useCandidates, useCandidate, useUpdateCandidate } from './candidates';
export { useMissions, useMission } from './missions';
export type { RecruiterSkillItem, RecruiterSkillsResponse } from './recruiter-skills';
```

**Barrel Files:**
- Used in `lib/queries/` for aggregating query hooks
- Used in `components/ui/` for shadcn components (each component is separate file, imported via path alias)
- Not used for `lib/services/` or `lib/utils/` (direct imports preferred for code clarity)

## Configuration & Constants

**Schema-driven configuration:**
- Zod schemas define and validate all major data structures
- Defaults via `as const` or inline defaults (e.g., `DEFAULT_TEMPLATE_CONFIG`)
- Config objects exported separately (e.g., `DEFAULT_MATCHING_WEIGHTS`)

**Constants organization:**
- Global constants in dedicated files: `lib/config/matching-weights.ts`, `lib/llm/constants.ts`
- Feature-specific constants co-located with feature (e.g., `ACTIVE_CV_STATUSES` in candidates query)
- Magic numbers avoided; extracted to named constants

---

*Convention analysis: 2026-03-26*

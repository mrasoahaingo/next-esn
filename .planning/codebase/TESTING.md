# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- Vitest 3.2.4
- Configured via default Next.js setup (no explicit vitest.config.ts found)
- Run via `npm test` which executes `vitest run`

**Assertion Library:**
- Vitest built-in `expect` (from the `vitest` package)
- No additional assertion library (standard expect API)

**Run Commands:**
```bash
npm test                # Run all tests once (vitest run)
npm run dev             # Development server (includes watch via HMR)
# Note: No explicit watch mode command; use `vitest` CLI directly for watch mode
```

## Test File Organization

**Location:**
- Co-located with source code (e.g., `lib/utils/cv-experience-time.ts` paired with `lib/utils/cv-experience-time.test.ts`)
- Single test file per module

**Naming:**
- `.test.ts` suffix for test files (e.g., `cv-experience-time.test.ts`)
- Not `.spec.ts` (though both are supported)

**Structure:**
```
lib/utils/
├── cv-experience-time.ts      # Source
└── cv-experience-time.test.ts # Tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest';
import type { ExtractedCV } from '@/lib/schema';
import { normalizeExtractedCvExperienceTime } from '@/lib/utils/cv-experience-time';

// Helper function for test data
function baseCv(overrides: Partial<ExtractedCV> = {}): ExtractedCV {
  return {
    personalInfo: { firstName: 'Jean', lastName: 'Dupont', title: 'Développeur' },
    summary: 'Résumé.',
    experiences: [],
    education: [],
    skills: { technologies: [], softSkills: [], expertises: [], methodologies: [] },
    ...overrides,
  };
}

describe('hasConcreteEndDate', () => {
  it('returns false for empty or présent-only strings', () => {
    expect(hasConcreteEndDate(undefined)).toBe(false);
    expect(hasConcreteEndDate('Présent')).toBe(false);
  });

  it('returns true when a 4-digit year is present', () => {
    expect(hasConcreteEndDate('2024')).toBe(true);
  });
});

describe('normalizeExtractedCvExperienceTime', () => {
  it('sets isCurrent and clears endDate when most recent role has no concrete end', () => {
    const ref = new Date('2026-06-15T12:00:00Z');
    const cv = baseCv({
      experiences: [
        { role: 'Lead', company: 'Acme', startDate: '2020', endDate: 'Présent', isCurrent: false, description: [] },
      ],
    });
    const out = normalizeExtractedCvExperienceTime(cv, ref);
    expect(out.experiences![0].isCurrent).toBe(true);
    expect(out.experiences![0].endDate).toBeUndefined();
  });
});
```

**Patterns:**
- `describe()` blocks group related tests by function name
- `it()` blocks test specific behaviors or edge cases
- Descriptive test names in plain English (e.g., "returns false for empty or présent-only strings")
- No setup/teardown functions observed (simple data creation inline via helper functions)

## Mocking

**Framework:** Not observed in codebase

**Patterns:**
- No Jest/Vitest mocking library currently in use
- Test data fixtures created via helper functions (e.g., `baseCv()`)
- No mocked external APIs or modules
- No spy/mock setup in observed tests

**What to Mock (if needed):**
- External HTTP calls (use MSW or nock-style mocking)
- Date/time (use reference dates passed as function parameters — see `cv-experience-time.test.ts` pattern)
- Supabase calls (mock at service layer if testing API routes)

**What NOT to Mock:**
- Pure utility functions (test their actual behavior)
- Date calculations (use explicit reference dates as parameters)
- Schema validation (test against real Zod schemas)

## Fixtures and Factories

**Test Data:**
```typescript
// Helper function pattern observed
function baseCv(overrides: Partial<ExtractedCV> = {}): ExtractedCV {
  return {
    personalInfo: {
      firstName: 'Jean',
      lastName: 'Dupont',
      title: 'Développeur',
      yearsOfExperience: '3 ans',
    },
    summary: 'Résumé.',
    experiences: [],
    education: [],
    skills: {
      technologies: [],
      softSkills: [],
      expertises: [],
      methodologies: [],
    },
    ...overrides,
  };
}
```

**Location:**
- Defined within test file alongside test suites
- Not extracted to separate fixture files (inline with tests)
- Overrides via object spread pattern for variability

## Coverage

**Requirements:** No coverage thresholds enforced (not observed in configuration)

**View Coverage:**
```bash
vitest run --coverage
```
(Note: May require coverage provider installation; check if @vitest/coverage-v8 or similar is available)

## Test Types

**Unit Tests:**
- Scope: Individual utility functions and business logic
- Approach: Test pure functions with various input combinations
- Example: `cv-experience-time.test.ts` tests date parsing, experience calculation, and normalization logic
- Focus: Edge cases (empty strings, undefined values, year parsing), boundary conditions (recent vs. past dates)

**Integration Tests:**
- Not observed in current test files
- Would test: API routes with Supabase calls, workflow triggers, data persistence
- Approach (recommended): Mock Supabase, test endpoint behavior

**E2E Tests:**
- Not currently implemented
- Framework: Not installed (would typically use Playwright or Cypress for Next.js)

## Common Patterns

**Async Testing:**
- Not observed in current test suite (no async/await tested)
- Recommended pattern would be:
  ```typescript
  it('async behavior', async () => {
    const result = await asyncFunction();
    expect(result).toEqual(...);
  });
  ```
- Vitest automatically detects async tests; no special callback needed

**Error Testing:**
- Not extensively covered in observable tests
- Recommended pattern for functions that throw:
  ```typescript
  it('throws on invalid input', () => {
    expect(() => {
      functionThatThrows(invalidInput);
    }).toThrow('Expected error message');
  });
  ```
- For async errors:
  ```typescript
  it('rejects on error', async () => {
    await expect(asyncFunctionThatRejects()).rejects.toThrow();
  });
  ```

**Vitest-specific features used:**
- `describe.skip()` and `it.skip()` for skipping tests (supported but not observed)
- `describe.only()` and `it.only()` for running single test (supported but not observed)
- `beforeAll`, `beforeEach`, `afterAll`, `afterEach` (not observed; tests are isolated)

## Test Data & Fixtures

**Reference Dates:**
- Tests use explicit `new Date('2026-03-01T00:00:00Z')` for consistency
- Date calculations are deterministic (no "current time" usage)
- Helps with regression testing and CI reproducibility

**Complex Objects:**
- Full CV objects created via `baseCv()` with overrides
- Partial test data explicitly merged with defaults
- Type-safe: Overrides are `Partial<ExtractedCV>` ensuring valid shape

## Testing Best Practices Observed

1. **Isolation:** Each test is independent; no shared state between tests
2. **Clarity:** Test names describe the specific behavior being verified
3. **Determinism:** No time-dependent or random test data; explicit dates used
4. **Speed:** Lightweight pure-function tests (no async, no real DB)
5. **Maintainability:** Helper functions reduce duplication in test setup

## Gaps & Recommendations

**Missing Coverage:**
- API routes (no integration tests for endpoints)
- React components (no component tests observed)
- Supabase interactions (no mocked API calls)
- Error scenarios (throw/reject patterns not extensively tested)

**Recommended Next Steps:**
1. Add integration tests for API routes with mocked Supabase
2. Add component tests for critical UI components (using React Testing Library)
3. Expand error case coverage (invalid inputs, network failures)
4. Set up coverage reporting and thresholds
5. Consider E2E tests for critical user flows (upload CV, create positioning, export)

---

*Testing analysis: 2026-03-26*

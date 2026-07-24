# OpenTech API Helpers + Facility Type — Design

**Date:** 2026-07-24
**Status:** Approved
**Scope:** Low-hanging refactor items #1–#4 from the tooling review.

## Problem

Four kinds of duplication and weak typing are spread across the OpenTech API layer:

1. **Duplicated login functions** — `handleSingleLogin` and `handleMultiLogin` in
   `src/hooks/opentech.ts` are byte-for-byte identical except for their `.catch`
   behavior (~35 lines duplicated).
2. **Duplicated URL construction** — the `tokenStageKey`/`tokenEnvKey` environment
   branch plus the URL template string is copy-pasted ~355 times across 31 files.
   CLAUDE.md flags this as un-abstracted (gotcha #6).
3. **Duplicated request headers** — the 4-key bearer header object
   (`Authorization`, `accept`, `api-version`, `Content-Type`) is hand-written in 41
   places across 22 files.
4. **`facility` is `any` everywhere** — the core object is untyped, so typos on
   `.apiSecret`/`.clientSecret`/`.environment` are not caught.

## Goals

- One source of truth for the environment branch and the OpenTech host/URL shape.
- One source of truth for bearer API request headers.
- Collapse the two login functions into one implementation.
- A single exported `Facility` type applied at the new helpers' boundaries.

## Non-Goals (explicit follow-ups)

- Folding components' inline auth-POST blocks into `handleSingleLogin`
  (behavioral change; larger scope).
- Broad `any` cleanup beyond the helper boundaries (~381 uses).
- Introducing a test runner / migrating fetches to react-query (separate items).

## Key Finding: three API hosts

API calls target **three** distinct subdomains. The URL builder MUST support this
or the events reports break silently:

| Host | Path shape | Used by |
|---|---|---|
| `auth.` | `/auth/token` | all auth requests |
| `accesscontrol.` | `/facilities/…` | the vast majority of API calls |
| `accessevent.` | `/combinedevents/…` | `EventsReport`, `OfflineEventsComparison`, `OnlineTimeReport` |

## Design

All helpers live in the existing `src/hooks/opentech.ts`. No new files, no path-alias
changes.

### 1. `Facility` type (item #4 — boundaries only)

```ts
export interface Facility {
  id?: string | number;
  name?: string;
  api: string;
  apiSecret: string;
  client: string;
  clientSecret: string;
  environment: string;               // "" | "staging" | "-dev" | "-qa"
  token?: { access_token: string; [k: string]: unknown };
}
```

Applied only to the new helper signatures. Existing call sites keep their `any`;
`any` is assignable to `Facility`, so no call site breaks. The type propagates
naturally where a value flows out of a helper.

### 2. Env-branch single source (internal)

```ts
function getEnvKeys(f: Facility) {
  const tokenStageKey = f.environment === "staging" ? "cia-stg-1.aws." : "";
  const tokenEnvKey   = f.environment === "staging" ? "" : f.environment;
  return { tokenStageKey, tokenEnvKey };
}
```

### 3. URL builders (item #2)

```ts
type OpenTechService = "accesscontrol" | "accessevent";

export function buildAuthUrl(f: Facility): string {
  const { tokenStageKey, tokenEnvKey } = getEnvKeys(f);
  return `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`;
}

export function buildApiUrl(
  f: Facility,
  path: string,
  service: OpenTechService = "accesscontrol",
): string {
  const { tokenStageKey, tokenEnvKey } = getEnvKeys(f);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `https://${service}.${tokenStageKey}insomniaccia${tokenEnvKey}.com${suffix}`;
}
```

### 4. Header factory (item #3)

```ts
export function authHeaders(f: Facility) {
  return {
    Authorization: "Bearer " + f.token?.access_token,
    accept: "application/json",
    "api-version": "2.0",
    "Content-Type": "application/json",
  };
}
```

Bearer API calls only. The auth POST keeps its own `x-www-form-urlencoded` headers
(different shape, no bearer) and adopts only `buildAuthUrl`.

### 5. Login dedup (item #1)

`handleSingleLogin` and `handleMultiLogin` delegate to one shared internal
implementation. **Both exported names are preserved** as thin wrappers:

- single → swallow error, return `{ error: "Failed to authenticate." }`
- multi  → rethrow

No import site changes.

## Migration (full — decided)

Across the ~31 files:

- auth URL strings → `buildAuthUrl(facility)`
- `accesscontrol.` / `accessevent.` URL strings → `buildApiUrl(facility, path, service)`
- 4-key bearer header objects → `authHeaders(facility)`
- remove now-dead local `tokenStageKey`/`tokenEnvKey` declarations left behind

Each file must still compile and lint after its edits; the URL/header output must be
byte-identical to what it produced before.

## Verification (no test framework exists yet)

1. `npm run lint` — clean.
2. `npm run build` (tsc + vite) — clean.
3. **Throwaway safety-net script** (scratchpad, not committed): asserts
   `buildAuthUrl` and `buildApiUrl` produce byte-identical strings to the current
   inline templates for all four environments (`""`, `staging`, `-dev`, `-qa`) ×
   both services. Deleted after passing. Adding a real test runner is a separate item.
4. Spot-check git diff: no URL/header string should differ in its resolved value,
   only in how it's constructed.

## Risks

- **URL typo in a builder** → every call in an environment breaks. Mitigated by the
  byte-identical assertion script and env matrix.
- **Missed service param** on an events-report URL → wrong host. Mitigated by the
  three-host table above and explicit per-file review.
- **Over-typing** breaking a call site → avoided by typing only helper params.

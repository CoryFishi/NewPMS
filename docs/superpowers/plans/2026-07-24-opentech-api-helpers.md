# OpenTech API Helpers + Facility Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated OpenTech URL construction, request headers, and the two copy-pasted login functions with shared helpers in `src/hooks/opentech.ts`, and introduce a `Facility` type at the helper boundaries — with byte-identical behavior.

**Architecture:** Add pure helpers (`getEnvKeys`, `buildAuthUrl`, `buildApiUrl`, `authHeaders`), an exported `Facility` interface, and a deduped login implementation to the existing `src/hooks/opentech.ts`. Then mechanically migrate ~31 call-site files to use them. No new files, no path-alias changes, no behavioral change.

**Tech Stack:** TypeScript, React 19, Vite, axios, qs. Spec: `docs/superpowers/specs/2026-07-24-opentech-api-helpers-design.md`.

## Global Constraints

- **No behavioral change.** Every resolved URL and header value must be byte-identical to what the code produced before. Only the *construction* changes.
- **Three API hosts exist** — `auth` (`/auth/token`), `accesscontrol` (`/facilities/…`, default), `accessevent` (`/combinedevents/…`). The events reports use `accessevent`.
- **Type at boundaries only.** Apply `Facility` to the new helper signatures. Do NOT retype existing call-site `any`s (out of scope).
- **Preserve exported names** `handleSingleLogin` and `handleMultiLogin` — no import-site churn.
- **Verification per migration task:** `npm run lint` clean AND `npm run build` clean, then commit. There is no test runner; do not add one here.
- **Use path aliases** (`@hooks/opentech`) in imports, never relative paths.

## Migration Recipe (applied verbatim in Tasks 2–6)

For each target file:

1. Add/extend the import from `@hooks/opentech` to pull in the helpers the file needs:
   `import { buildAuthUrl, buildApiUrl, authHeaders } from "@hooks/opentech";`
   (import only the ones that file actually uses).
2. **Auth URL** — replace
   `` `https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token` ``
   with `buildAuthUrl(facility)` (use the file's own facility variable name).
3. **accesscontrol URL** — replace
   `` `https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com<PATH>` ``
   with `buildApiUrl(facility, "<PATH>")` where `<PATH>` is everything after `.com` (keep the leading `/`, keep any `${...}` interpolations inside it).
4. **accessevent URL** — replace
   `` `https://accessevent.${tokenStageKey}insomniaccia${tokenEnvKey}.com<PATH>` ``
   with `buildApiUrl(facility, "<PATH>", "accessevent")`.
5. **Bearer headers** — replace the inline object
   `{ Authorization: "Bearer " + facility.token.access_token, accept: "application/json", "api-version": "2.0", "Content-Type": "application/json" }`
   with `authHeaders(facility)`. Only for bearer API calls — never the `x-www-form-urlencoded` auth POST.
6. **Remove now-dead locals** — if `tokenStageKey`/`tokenEnvKey` were declared solely for the strings you just replaced, delete those declarations. If they're still referenced elsewhere in the file, leave them.
7. Do NOT touch the auth POST's `qs.stringify` body or its `Content-Type: application/x-www-form-urlencoded` header shape.

> Note on `.com<PATH>`: some call sites split the path across template lines or use `+` concatenation. Preserve the exact resolved path; pass the full path (including interpolated `${id}` etc.) as the `path` argument.

---

### Task 1: Helpers, `Facility` type, and login dedup in `opentech.ts`

**Files:**
- Modify: `src/hooks/opentech.ts` (whole file)
- Test (throwaway, scratchpad — NOT committed): `<scratchpad>/verify-urls.mjs`

**Interfaces:**
- Produces:
  - `interface Facility { id?: string|number; name?: string; api: string; apiSecret: string; client: string; clientSecret: string; environment: string; token?: { access_token: string; [k: string]: unknown } }`
  - `buildAuthUrl(f: Facility): string`
  - `buildApiUrl(f: Facility, path: string, service?: "accesscontrol" | "accessevent"): string`  (default `"accesscontrol"`)
  - `authHeaders(f: Facility): { Authorization: string; accept: string; "api-version": string; "Content-Type": string }`
  - `handleSingleLogin(facility: Facility)` — unchanged signature/behavior (returns `{message, token}` or `{error}`)
  - `handleMultiLogin(facilities: Facility)` — unchanged signature/behavior (returns `{message, token}` or throws)
  - `getEnvironmentName(facility: Facility): string` — unchanged behavior

- [ ] **Step 1: Replace the contents of `src/hooks/opentech.ts` with the refactored version**

```ts
import axios from "axios";
import qs from "qs";

export interface Facility {
  id?: string | number;
  name?: string;
  api: string;
  apiSecret: string;
  client: string;
  clientSecret: string;
  environment: string; // "" | "staging" | "-dev" | "-qa"
  token?: { access_token: string; [k: string]: unknown };
}

export type OpenTechService = "accesscontrol" | "accessevent";

function getEnvKeys(f: Facility): { tokenStageKey: string; tokenEnvKey: string } {
  const tokenStageKey = f.environment === "staging" ? "cia-stg-1.aws." : "";
  const tokenEnvKey = f.environment === "staging" ? "" : f.environment;
  return { tokenStageKey, tokenEnvKey };
}

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

export function authHeaders(f: Facility) {
  return {
    Authorization: "Bearer " + f.token?.access_token,
    accept: "application/json",
    "api-version": "2.0",
    "Content-Type": "application/json",
  };
}

async function login(facility: Facility) {
  const data = qs.stringify({
    grant_type: "password",
    username: facility.api,
    password: facility.apiSecret,
    client_id: facility.client,
    client_secret: facility.clientSecret,
  });

  const config = {
    method: "post",
    url: buildAuthUrl(facility),
    headers: {
      accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data,
  };

  const response = await axios(config);
  return { message: "Successfully authenticated!", token: response.data };
}

export async function handleSingleLogin(facility: Facility) {
  try {
    return await login(facility);
  } catch (error) {
    console.error("Error during single login:", error);
    return { error: "Failed to authenticate." };
  }
}

export async function handleMultiLogin(facilities: Facility) {
  try {
    return await login(facilities);
  } catch (error) {
    console.error("Error during single login:", error);
    throw error;
  }
}

export function getEnvironmentName(facility: Facility) {
  if (facility.environment === "") {
    return "Production";
  } else if (facility.environment === "staging") {
    return "Staging";
  } else if (facility.environment === "-dev") {
    return "Development";
  } else if (facility.environment === "-qa") {
    return "QA";
  } else {
    return facility.environment.toUpperCase();
  }
}
```

Note: `handleMultiLogin` keeps its original (copy-pasted) `"Error during single login:"` log text verbatim to guarantee no behavioral/log change.

- [ ] **Step 2: Write the throwaway verification script**

Create `<scratchpad>/verify-urls.mjs` (session scratchpad dir; NOT in the repo):

```js
// Byte-identical check: new builders vs the old inline templates, full matrix.
import { buildAuthUrl, buildApiUrl } from "<ABS_PATH_TO_REPO>/src/hooks/opentech.ts";

const envs = ["", "staging", "-dev", "-qa"];
const oldKeys = (e) =>
  e === "staging"
    ? { stage: "cia-stg-1.aws.", env: "" }
    : { stage: "", env: e };

let failures = 0;
for (const environment of envs) {
  const f = { environment, api: "x", apiSecret: "x", client: "x", clientSecret: "x" };
  const { stage, env } = oldKeys(environment);

  const expectAuth = `https://auth.${stage}insomniaccia${env}.com/auth/token`;
  const gotAuth = buildAuthUrl(f);
  if (gotAuth !== expectAuth) { failures++; console.error(`AUTH ${environment}: ${gotAuth} != ${expectAuth}`); }

  const path = "/facilities/123/units";
  for (const service of ["accesscontrol", "accessevent"]) {
    const expect = `https://${service}.${stage}insomniaccia${env}.com${path}`;
    const got = buildApiUrl(f, path, service);
    if (got !== expect) { failures++; console.error(`${service} ${environment}: ${got} != ${expect}`); }
  }
  const def = buildApiUrl(f, path);
  if (def !== `https://accesscontrol.${stage}insomniaccia${env}.com${path}`) {
    failures++; console.error(`default-service ${environment}: ${def}`);
  }
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run the verification script — expect ALL PASS**

Run (from repo root): `npx tsx <scratchpad>/verify-urls.mjs`
Expected: prints `ALL PASS`, exit 0.
Fallback if `tsx` unavailable: `node --experimental-strip-types <scratchpad>/verify-urls.mjs` (Node ≥ 22.6), or inline-copy the two pure builders into the script and run with plain `node`.

- [ ] **Step 4: Lint and type-check/build**

Run: `npm run lint`  → expect clean.
Run: `npm run build` → expect clean (tsc + vite).

- [ ] **Step 5: Delete the throwaway script and commit**

```bash
rm <scratchpad>/verify-urls.mjs   # scratchpad is outside the repo; nothing to unstage
git add src/hooks/opentech.ts
git commit -m "refactor: add OpenTech URL/header helpers, Facility type, dedupe login"
```

---

### Task 2: Migrate `admin/users` + `PMSDashboardLayout`

**Files (Modify):**
- `src/components/app/admin/users/AddToken.tsx` — auth URL @ ~37
- `src/components/app/admin/users/AddFavoriteFacility.tsx` — auth URL @ ~40, accesscontrol @ ~73
- `src/components/app/admin/users/AddSelectedFacility.tsx` — auth URL @ ~40, accesscontrol @ ~73
- `src/components/app/admin/users/EditCurrentFacility.tsx` — auth URL @ ~50, accesscontrol @ ~83
- `src/components/app/pms/PMSDashboardLayout.tsx` — accesscontrol @ ~134

**Interfaces:** Consumes `buildAuthUrl`, `buildApiUrl`, `authHeaders` from Task 1.

- [ ] **Step 1: Apply the Migration Recipe (top of this doc) to each file above.**
  Line numbers are pre-edit references; re-locate each string by pattern, don't trust exact line numbers after edits. For each accesscontrol call also swap its bearer header object for `authHeaders(facility)`.
- [ ] **Step 2: Lint** — `npm run lint` → clean.
- [ ] **Step 3: Build** — `npm run build` → clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/app/admin/users/AddToken.tsx src/components/app/admin/users/AddFavoriteFacility.tsx src/components/app/admin/users/AddSelectedFacility.tsx src/components/app/admin/users/EditCurrentFacility.tsx src/components/app/pms/PMSDashboardLayout.tsx
git commit -m "refactor: use OpenTech helpers in admin/users and PMS layout"
```

---

### Task 3: Migrate PMS units

**Files (Modify):**
- `src/components/app/pms/units/Units.tsx` — accesscontrol @ ~70,97,124,158,213,273,327,381,435,487
- `src/components/app/pms/units/CreateUnit.tsx` — accesscontrol @ ~76
- `src/components/app/pms/units/CreateVisitorUnitPage.tsx` — accesscontrol @ ~41,69,135
- `src/components/app/pms/units/EditVisitorUnitPage.tsx` — accesscontrol @ ~53,80,126,173
- `src/components/app/pms/units/EditVisitorVisitorPage.tsx` — accesscontrol @ ~37,64,136

**Interfaces:** Consumes `buildApiUrl`, `authHeaders` from Task 1.

- [ ] **Step 1: Apply the Migration Recipe to each file.** All URLs here are `accesscontrol` (default service). Swap each bearer header object for `authHeaders(facility)`.
- [ ] **Step 2: Lint** — `npm run lint` → clean.
- [ ] **Step 3: Build** — `npm run build` → clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/app/pms/units/Units.tsx src/components/app/pms/units/CreateUnit.tsx src/components/app/pms/units/CreateVisitorUnitPage.tsx src/components/app/pms/units/EditVisitorUnitPage.tsx src/components/app/pms/units/EditVisitorVisitorPage.tsx
git commit -m "refactor: use OpenTech helpers in PMS units"
```

---

### Task 4: Migrate PMS visitors

**Files (Modify):**
- `src/components/app/pms/visitors/Visitors.tsx` — accesscontrol @ ~88,122,159,209
- `src/components/app/pms/visitors/CreateVisitorVisitorPage.tsx` — accesscontrol @ ~48,81,108,219
- `src/components/app/pms/visitors/EditVisitorVisitorPage.tsx` — accesscontrol @ ~37,64,136

**Interfaces:** Consumes `buildApiUrl`, `authHeaders` from Task 1.

- [ ] **Step 1: Apply the Migration Recipe to each file.** All `accesscontrol`. Swap bearer headers for `authHeaders(facility)`.
- [ ] **Step 2: Lint** — `npm run lint` → clean.
- [ ] **Step 3: Build** — `npm run build` → clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/app/pms/visitors/Visitors.tsx src/components/app/pms/visitors/CreateVisitorVisitorPage.tsx src/components/app/pms/visitors/EditVisitorVisitorPage.tsx
git commit -m "refactor: use OpenTech helpers in PMS visitors"
```

---

### Task 5: Migrate PMS all-facilities, favorites, overview, scripts

**Files (Modify):**
- `src/components/app/pms/all-facilities/AllFacilities.tsx` — auth @ ~187,232; accesscontrol @ ~280 (`/facilities/statuslist`)
- `src/components/app/pms/favorites/Favorites.tsx` — auth @ ~110
- `src/components/app/pms/overview/Overview.tsx` — accesscontrol @ ~39,67,85,103,131,159,177,205,232,259
- `src/components/app/pms/scripts/Scripts.tsx` — accesscontrol @ ~76,145,225,273

**Interfaces:** Consumes `buildAuthUrl`, `buildApiUrl`, `authHeaders` from Task 1.

- [ ] **Step 1: Apply the Migration Recipe to each file.** Note `Scripts.tsx:273` resolves to a base ending in `.com` with a shorter path — pass whatever exact path follows `.com`. Swap bearer headers for `authHeaders(facility)` on each accesscontrol call.
- [ ] **Step 2: Lint** — `npm run lint` → clean.
- [ ] **Step 3: Build** — `npm run build` → clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/app/pms/all-facilities/AllFacilities.tsx src/components/app/pms/favorites/Favorites.tsx src/components/app/pms/overview/Overview.tsx src/components/app/pms/scripts/Scripts.tsx
git commit -m "refactor: use OpenTech helpers in PMS facilities/favorites/overview/scripts"
```

---

### Task 6: Migrate SmartSpace (all-facilities, tester, reports)

**Files (Modify):**
- `src/components/app/smartspace/all-facilities/SmartSpaceAllFacilities.tsx` — auth @ ~85; accesscontrol @ ~123 (`/facilities/statuslist`)
- `src/components/app/smartspace/tester/SmartSpaceTester.tsx` — auth @ ~100
- `src/components/app/smartspace/reports/SmartSpaceReports.tsx` — auth @ ~91
- `src/components/app/smartspace/reports/AllAccessPointsReport.tsx` — accesscontrol @ ~39
- `src/components/app/smartspace/reports/AllEdgeRoutersReport.tsx` — accesscontrol @ ~39
- `src/components/app/smartspace/reports/AllSmartLocksReport.tsx` — accesscontrol @ ~138
- `src/components/app/smartspace/reports/AllSmartMotionReport.tsx` — accesscontrol @ ~104
- `src/components/app/smartspace/reports/EventsReport.tsx` — **accessevent** @ ~56 (`/combinedevents/facilities/…`), ~89 (`/combinedevents/types`)
- `src/components/app/smartspace/reports/OfflineEventsComparison.tsx` — **accessevent** @ ~30 (`/combinedevents/facilities/…`)
- `src/components/app/smartspace/reports/OnlineTimeReport.tsx` — **accessevent** @ ~87 (`/combinedevents/facilities/…`)

**Interfaces:** Consumes `buildAuthUrl`, `buildApiUrl`, `authHeaders` from Task 1.

- [ ] **Step 1: Apply the Migration Recipe to each file.** CRITICAL: the three `accessevent` files must pass `"accessevent"` as the third arg to `buildApiUrl` — do NOT let them default to `accesscontrol`. Swap bearer headers for `authHeaders(facility)`.
- [ ] **Step 2: Lint** — `npm run lint` → clean.
- [ ] **Step 3: Build** — `npm run build` → clean.
- [ ] **Step 4: Commit**

```bash
git add "src/components/app/smartspace/all-facilities/SmartSpaceAllFacilities.tsx" "src/components/app/smartspace/tester/SmartSpaceTester.tsx" "src/components/app/smartspace/reports/SmartSpaceReports.tsx" "src/components/app/smartspace/reports/AllAccessPointsReport.tsx" "src/components/app/smartspace/reports/AllEdgeRoutersReport.tsx" "src/components/app/smartspace/reports/AllSmartLocksReport.tsx" "src/components/app/smartspace/reports/AllSmartMotionReport.tsx" "src/components/app/smartspace/reports/EventsReport.tsx" "src/components/app/smartspace/reports/OfflineEventsComparison.tsx" "src/components/app/smartspace/reports/OnlineTimeReport.tsx"
git commit -m "refactor: use OpenTech helpers in SmartSpace facilities and reports"
```

---

### Task 7: Sweep for stragglers + update CLAUDE.md

**Files (Modify):**
- `CLAUDE.md` — API section + gotcha #6

- [ ] **Step 1: Confirm no inline URL construction remains**

Run: `git grep -n "insomniaccia\${token" -- "src/*.ts" "src/*.tsx" "src/**/*.ts" "src/**/*.tsx"`
Expected: only `src/hooks/opentech.ts` (the builder definitions) should appear. Any other hit is a missed call site — migrate it with the recipe, then re-run.

Also check headers: `git grep -n '"api-version"' -- src` should show only files where a non-standard version is intentional (spot-check any remaining ones).

- [ ] **Step 2: Update CLAUDE.md**
  - In the "OpenTech API" section, document the helpers: `buildAuthUrl(facility)`, `buildApiUrl(facility, path, service?)`, `authHeaders(facility)` in `@hooks/opentech`.
  - Soften gotcha #6 to note the pattern is now abstracted into `buildApiUrl`/`buildAuthUrl` and new calls should use them.

- [ ] **Step 3: Lint + build** — `npm run lint` and `npm run build` → clean.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document OpenTech API helpers; update gotcha #6"
```

---

## Self-Review

**Spec coverage:**
- Item #1 login dedup → Task 1 (Step 1, `login()` + wrappers). ✓
- Item #2 URL builders → Task 1 defines; Tasks 2–6 migrate; Task 7 sweeps. ✓
- Item #3 header factory → Task 1 defines; Tasks 2–6 apply. ✓
- Item #4 `Facility` type → Task 1 defines & applies at boundaries. ✓
- Three-host finding → encoded in `buildApiUrl` service param + Task 6 accessevent callout. ✓
- Verification (lint/build/assertion script) → Task 1 Steps 3–4; every migration task Steps 2–3. ✓
- Non-goals (inline auth-POST folding, broad `any`, test runner) → excluded; noted in Global Constraints. ✓

**Placeholder scan:** No TBD/TODO. The only `<...>` tokens are `<scratchpad>`, `<ABS_PATH_TO_REPO>`, and `<PATH>` — all explicitly defined substitution points, not unfinished work. ✓

**Type consistency:** `buildAuthUrl`, `buildApiUrl`, `authHeaders`, `Facility`, `OpenTechService`, `handleSingleLogin`, `handleMultiLogin` used identically across Task 1 (definition) and Tasks 2–7 (consumption). ✓

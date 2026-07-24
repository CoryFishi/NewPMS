# MockPMS — Claude Agent Guide

## Project Overview

MockPMS is an internal tooling app used by OpenTech Alliance's **onboarding/support teams** and **QA team** to interact with and test the Insomniac CIA platform. It is not a customer-facing product.

**Primary use cases:**
- **Onboarding & Support** — quickly select a customer facility, inspect its units and visitors, verify configurations, and open the Control Center portal directly from the tool
- **QA** — test OpenTech API behavior across environments (Production, Staging, Dev, QA) without needing a full platform setup; the Scripts section exposes admin-level bulk operations for platform admins

It is a React + TypeScript frontend that drives the OpenTech API directly. Supabase handles auth and user data storage only — all property/facility data comes from the OpenTech API.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase · Axios · React Router 7 · react-hot-toast

---

## Folder Structure

```
src/
├── app/
│   ├── App.tsx                        # Root router
│   └── index.css
├── components/
│   ├── app/                           # Page-level components (@views alias)
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminDashboardLayout.tsx
│   │   │   ├── roles/                 # Roles.tsx, CreateRole.tsx, EditRole.tsx
│   │   │   ├── user-events/           # UserEvents.tsx
│   │   │   └── users/                 # Users.tsx, EditUser.tsx, AddToken.tsx, ...
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── authentication-settings/   # AuthenticationSettings.tsx, AddAuthentication.tsx, ...
│   │   ├── pms/
│   │   │   ├── PMSDashboard.tsx
│   │   │   ├── PMSDashboardLayout.tsx
│   │   │   ├── DeleteModal.tsx        # Shared delete modal used by units/ and visitors/
│   │   │   ├── all-facilities/
│   │   │   ├── favorites/
│   │   │   ├── overview/
│   │   │   ├── scripts/
│   │   │   ├── units/                 # Units.tsx + all unit modals
│   │   │   └── visitors/              # Visitors.tsx + all visitor modals
│   │   ├── smartspace/
│   │   │   ├── SmartSpaceDashboard.tsx
│   │   │   ├── SmartSpaceDashboardLayout.tsx
│   │   │   ├── all-facilities/
│   │   │   ├── dashboard/             # Cards, rows, modals
│   │   │   ├── mapping/               # Canvas-based floor plan editor
│   │   │   ├── reports/               # 7 report types
│   │   │   ├── selected/
│   │   │   └── tester/
│   │   └── user-settings/
│   ├── shared/                        # @components/shared — reusable page building blocks
│   │   ├── LoadingSpinner.tsx
│   │   ├── Navbar.tsx
│   │   ├── DataTable.tsx
│   │   ├── PaginationFooter.tsx
│   │   ├── DetailModal.tsx
│   │   └── NotFound.tsx
│   └── ui/                            # @components/ui — atomic UI elements
│       ├── GeneralButton.tsx
│       ├── ModalButton.tsx
│       ├── TableButton.tsx
│       ├── SliderButton.tsx
│       ├── InputBox.tsx
│       ├── SelectOption.tsx
│       └── ModalContainer.tsx
├── context/
│   └── AuthProvider.tsx               # Global auth + bearer token state
├── hooks/
│   ├── opentech.ts                    # OpenTech auth helpers
│   └── supabase.ts                    # Event logging helper
├── lib/
│   └── supabaseClient.ts              # Supabase client init (public + admin)
└── assets/
```

---

## Path Aliases

Defined identically in `vite.config.ts` and `tsconfig.json`. **Always use aliases — never relative paths.**

| Alias | Resolves to |
|---|---|
| `@components` | `src/components` |
| `@views` | `src/components/app` |
| `@context` | `src/context` |
| `@hooks` | `src/hooks` |
| `@lib` | `src/lib` |
| `@app` | `src/app` |
| `@assets` | `src/assets` |

---

## Environment Variables

```env
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_KEY=         # Public anon key (row-level security applies)
VITE_SUPABASE_SERVICE_KEY= # Service role key (bypasses RLS — admin operations only)
VITE_RESEND_KEY=           # Email service key (configured, not yet wired to UI)
VITE_WEATHER_KEY=          # Weather API key (configured, not yet wired to UI)
```

Access via `import.meta.env.VITE_*`.

---

## Auth Context (`useAuth`)

Import: `import { useAuth } from "@context/AuthProvider"`

| Value | Type | Description |
|---|---|---|
| `user` | `any \| null` | Supabase auth user |
| `setUser` | fn | |
| `role` | `string` | e.g. `"user"`, `"admin"` |
| `permissions` | `object` | From `roles` table — see Permissions section |
| `tokens` | `array` | Stored credentials `[{name, api, apiSecret, client, clientSecret, environment}]` |
| `setTokens` | fn | Update stored credentials (triggers auto-auth for new ones) |
| `favoriteTokens` | `array` | Favorited facilities |
| `setFavoriteTokens` | fn | |
| `selectedTokens` | `array` | SmartSpace selected facilities |
| `setSelectedTokens` | fn | |
| `currentFacility` | `object` | Active facility `{id, name, api, apiSecret, client, clientSecret, environment, token: {access_token, ...}}` |
| `setCurrentFacility` | fn | |
| `isPulled` | `boolean` | True after initial Supabase data fetch |
| `setIsPulled` | fn | |
| `isLoading` | `boolean` | Initial auth loading |
| `noUser` | `boolean` | No authenticated user |
| `bearerTokens` | `BearerMap` | Cached bearer tokens — see Bearer Token System |
| `getBearerToken` | fn | `(credential) => string \| null` |

---

## Bearer Token System

All OpenTech API calls require a bearer token obtained from the auth endpoint. AuthProvider manages a central cache so no component needs to re-authenticate on its own.

### BearerMap

```typescript
type BearerMap = Record<string, { access_token: string; expires_at: number }>
// Key: `${credential.api}::${credential.environment}`
// expires_at: absolute ms timestamp (Date.now() + expires_in * 1000)
```

### getBearerToken(credential)

Returns the cached `access_token` or `null` if missing/expired. Reads from a ref — stable callback, safe to use in `useCallback` deps.

### Standard usage pattern (all API-calling pages)

```typescript
const { getBearerToken } = useAuth();

// Inside data-fetching function:
const cached = getBearerToken(facility);
const bearer = cached ?? await fetchBearerToken(facility); // fallback to fresh auth
```

### What AuthProvider does automatically

1. **On user data load** — authenticates all stored credentials in parallel via `Promise.allSettled`
2. **When `tokens` changes** — authenticates any credential not already in the cache
3. **Every 5 minutes** — refreshes any token expiring within 10 minutes; patches `currentFacility.token` if the refreshed credential matches

---

## OpenTech API

### URL Construction

```typescript
const tokenStageKey = facility.environment === "staging" ? "cia-stg-1.aws." : "";
const tokenEnvKey   = facility.environment === "staging" ? "" : facility.environment;

// Auth endpoint
`https://auth.${tokenStageKey}insomniaccia${tokenEnvKey}.com/auth/token`

// API endpoint
`https://accesscontrol.${tokenStageKey}insomniaccia${tokenEnvKey}.com/facilities/${id}/...`
```

### Environment values

| `environment` field | Human label | Auth URL example |
|---|---|---|
| `""` | Production | `auth.insomniaccia.com` |
| `"staging"` | Staging | `auth.cia-stg-1.aws.insomniaccia.com` |
| `"-dev"` | Development | `auth.insomniaccia-dev.com` |
| `"-qa"` | QA | `auth.insomniaccia-qa.com` |

### Required headers for all API calls

```typescript
{
  Authorization: "Bearer " + facility.token.access_token,
  accept: "application/json",
  "api-version": "2.0",
  "Content-Type": "application/json",
}
```

### Auth payload (via `qs.stringify`)

```typescript
{
  grant_type: "password",
  username: facility.api,
  password: facility.apiSecret,
  client_id: facility.client,
  client_secret: facility.clientSecret,
}
```

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/facilities/statuslist` | All facilities for account |
| `GET` | `/facilities/{id}/units` | All units |
| `POST` | `/facilities/{id}/units` | Create unit |
| `POST` | `/facilities/{id}/units/{unitId}/vacate` | Remove all visitors from unit |
| `POST` | `/facilities/{id}/units/{unitId}/enable` | Re-enable disabled unit |
| `POST` | `/facilities/{id}/units/{unitId}/disable` | Disable unit |
| `GET` | `/facilities/{id}/visitors` | All visitors |
| `POST` | `/facilities/{id}/visitors` | Create visitor |
| `POST` | `/facilities/{id}/visitors/{visitorId}/update` | Update visitor |
| `POST` | `/facilities/{id}/visitors/{visitorId}/remove` | Remove visitor |
| `POST` | `/facilities/{id}/visitors/{visitorId}/enable` | Enable visitor |
| `POST` | `/facilities/{id}/visitors/{visitorId}/disable` | Disable visitor |
| `GET` | `/facilities/{id}/smartlockstatus` | SmartLock device status |
| `GET` | `/facilities/{id}/edgerouterplatformdevicesstatus` | Edge router + AP status |
| `GET` | `/facilities/{id}/accessprofiles` | Access profiles |
| `GET` | `/facilities/{id}/timegroups` | Time groups |
| `GET` | `/facilities/{id}/actiongroups/manual` | Manual action groups |

Helpers in `@hooks/opentech` (use these instead of hand-building URLs/headers):

| Helper | Purpose |
|---|---|
| `buildAuthUrl(facility)` | Auth token URL (`https://auth.…/auth/token`) |
| `buildApiUrl(facility, path, service?)` | API URL. `service` defaults to `"accesscontrol"`; pass `"accessevent"` for `/combinedevents/…` endpoints. `path` keeps its leading `/` and any interpolations. |
| `authHeaders(facility, contentType?, apiVersion?)` | Bearer header object. `contentType` defaults to `"application/json"` (pass `"application/json-patch+json"` for the write endpoints that require it); `apiVersion` defaults to `"2.0"` (pass `"3.0"` for the `accessevent`/combined-events calls that require it). |
| `getEnvironmentName(facility)` | Human-readable environment string |

`Facility` is the exported type for the credential/facility shape. Auth POSTs keep their own `application/x-www-form-urlencoded` headers — do not route them through `authHeaders`. Portal (`portal.…`) deep-links are not API calls and are not built with these helpers.

---

## Supabase Schema

### `user_data`

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK | Supabase auth user ID |
| `user_email` | text | |
| `role` | text | e.g. `"user"`, `"admin"` |
| `tokens` | jsonb | `[{name, api, apiSecret, client, clientSecret, environment}]` |
| `favorite_tokens` | jsonb | `[{id, name, api, ...}]` |
| `selected_tokens` | jsonb | `[{id, name, api, ...}]` |
| `current_facility` | jsonb | Single facility object or `{}` |
| `last_update_at` | timestamptz | |

### `user_events`

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `user_id` | uuid | |
| `event_name` | text | e.g. `"User Deleted"`, `"Token Added"` |
| `event_description` | text | |
| `completed` | boolean | Success/failure |
| `created_at` | timestamptz | |

### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | int PK | |
| `role_name` | text | |
| `role_description` | text | |
| `permissions` | jsonb | See permissions object below |

### Permissions object

```typescript
{
  pmsPlatform: boolean,
  pmsPlatformAdmin: boolean,
  smartlockPlatform: boolean,
  authenticationPlatform: boolean,
  // granular auth platform permissions:
  authCreate: boolean,
  authRead: boolean,
  authUpdate: boolean,
  authDelete: boolean,
  authExport: boolean,
  authImport: boolean,
}
```

### Supabase clients

```typescript
import { supabase, supabaseAdmin } from "@lib/supabaseClient";
// supabase      — public client, row-level security applies
// supabaseAdmin — service role client, bypasses RLS (admin pages only)
```

Log events with: `import { addEvent } from "@hooks/supabase"` → `addEvent(name, description, completed)`

---

## Shared Components

### `<LoadingSpinner loadingText="..." />`

Full-page overlay spinner. Requires the parent container to be `relative` and `overflow-hidden`.

Standard page wrapper pattern:
```tsx
<div className={`relative ${isLoading ? "overflow-hidden min-h-full" : "overflow-auto"} h-full dark:text-white dark:bg-zinc-900`}>
  {isLoading && <LoadingSpinner loadingText="Loading..." />}
  ...
</div>
```

### `<DataTable columns={} data={} ... />`

| Prop | Type | Notes |
|---|---|---|
| `columns` | `Column[]` | See column shape below |
| `data` | `any[]` | Full dataset (paginated internally) |
| `currentPage` | `number` | |
| `rowsPerPage` | `number` | |
| `sortDirection` | `"asc" \| "desc" \| null` | |
| `sortedColumn` | `string \| null` | |
| `onSort` | fn | `(columnKey, accessor?) => void` |
| `hoveredRow` | `any` | Optional |
| `setHoveredRow` | fn | Optional |
| `onRowClick` | fn | Optional |

Column shape:
```typescript
{
  key: string,
  label: string,
  accessor: (row) => any,       // for sorting
  render?: (row) => ReactNode,  // optional custom cell
  sortable?: boolean,           // default true
}
```

### `<PaginationFooter rowsPerPage={} setRowsPerPage={} currentPage={} setCurrentPage={} items={} />`

Always reset `setCurrentPage(1)` whenever `searchQuery` or filter changes.

### `<ModalContainer title icon mainContent responseContent onClose />`

Standard modal shell. Use `ModalButton` for buttons inside `responseContent`.

### UI components

```tsx
<InputBox value={} onchange={} placeholder="" type="text" />
<SelectOption value={} onChange={} options={[{id, name}]} placeholder="" />
<TableButton onclick={} text="" className="" />   // table row action button
<ModalButton onclick={} text="" className="" />   // modal action button
<GeneralButton onclick={} text="" className="" /> // general use
<SliderButton onclick={} value={bool} />          // toggle switch
```

---

## Standard Page Patterns

### Header bar (all list pages)

```tsx
<div className="flex h-12 bg-zinc-200 items-center dark:border-zinc-700 dark:bg-zinc-950">
  <div className="ml-5 flex items-center text-sm">
    <IconComponent className="text-lg" />
    &ensp; Page Title
  </div>
</div>
```

### Data fetch on mount with pulled flag

```typescript
const [dataPulled, setDataPulled] = useState(false);

useEffect(() => {
  if (!dataPulled) {
    fetchData();
    setDataPulled(true);
  }
}, [dataPulled, fetchData]);
```

### Background refresh (5-minute interval)

```typescript
useEffect(() => {
  if (!currentFacility.token) return;
  const interval = setInterval(async () => {
    await fetchData();
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [currentFacility, fetchData]);
```

### Sort handler boilerplate

```typescript
const handleColumnSort = (columnKey, accessor = (a) => a[columnKey]) => {
  let newDirection: "asc" | "desc" | null;
  if (sortedColumn !== columnKey) newDirection = "asc";
  else if (sortDirection === "asc") newDirection = "desc";
  else newDirection = null;

  setSortedColumn(newDirection ? columnKey : null);
  setSortDirection(newDirection);

  if (!newDirection) { setFilteredData([...data]); return; }
  setFilteredData([...filteredData].sort((a, b) => {
    const aVal = accessor(a) ?? "";
    const bVal = accessor(b) ?? "";
    if (aVal < bVal) return newDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return newDirection === "asc" ? 1 : -1;
    return 0;
  }));
};
```

---

## Routing

Defined in `src/app/App.tsx`. All routes are protected by auth + permission checks inside the page components (not in the router).

### Top-level routes

| Path | Component | Permission |
|---|---|---|
| `/` | → redirect to `/pms/all-facilities` | — |
| `/pms/*` | PMSDashboard → PMSDashboardLayout | `pmsPlatform` |
| `/smartspace/*` | SmartSpaceDashboard → SmartSpaceDashboardLayout | `smartlockPlatform` |
| `/admin/*` | AdminDashboard → AdminDashboardLayout | `role === "admin"` |
| `/user-settings` | UserSettings | any authenticated |
| `/authentication-settings` | AuthenticationSettings | `authenticationPlatform` |
| `/login` | Login | public |
| `/register` | Register | public |
| `/reset-password` | ResetPassword | public |

### PMS sub-routes (`/pms/*`)

| Path | Component |
|---|---|
| `/pms/all-facilities` | AllFacilities |
| `/pms/favorites` | Favorites |
| `/pms/units` | Units |
| `/pms/visitors` | Visitors |
| `/pms/overview` | Overview |
| `/pms/scripts` | Scripts (admin only — `pmsPlatformAdmin`) |

### SmartSpace sub-routes (`/smartspace/*`)

| Path | Component |
|---|---|
| `/smartspace/all-facilities` | SmartSpaceAllFacilities |
| `/smartspace/selected` | SmartSpaceSelected |
| `/smartspace/dashboard` | SmartSpaceDashboardView |
| `/smartspace/reports` | SmartSpaceReports |
| `/smartspace/mapping` | SmartSpaceMapping |
| `/smartspace/tester` | SmartSpaceTester |

### Admin sub-routes (`/admin/*`)

| Path | Component |
|---|---|
| `/admin/users` | Users |
| `/admin/user-events` | UserEvents |
| `/admin/roles` | Roles |

### Navigation rules

- **Always use `useNavigate` + absolute paths** (e.g. `navigate("/pms/units")`) — never `Link to="units"` from within a layout.
- **Navbar links** use `startsWith` to highlight the active platform section:
  - Property Management → `/pms/all-facilities`, active when `pathname.startsWith("/pms")`
  - SmartSpace → `/smartspace/all-facilities`, active when `pathname.startsWith("/smartspace")`
  - Admin → `/admin/users`, active when `pathname.startsWith("/admin")`
- **Layout active-section highlighting** uses `path.includes("/pms/units")` etc. from `useLocation().pathname`.
- **Nested `<Routes>`** inside each layout use **relative** paths (e.g. `path="units"`, not `path="/pms/units"`), under the parent `path="/pms/*"` wildcard in App.tsx.

---

## Dark Mode

- Toggled via `document.documentElement.classList.add/remove('dark')`
- Persisted in `localStorage` as key `"darkMode"` (`"true"` / `"false"`)
- Passed as `darkMode` and `toggleDarkMode` props from `App.tsx` down through layout components
- All dark variants use Tailwind `dark:` prefix (e.g., `dark:bg-zinc-900`, `dark:text-white`)

---

## Toasts

Using `react-hot-toast`. Configured in App.tsx: `position="bottom-right"`, default duration 2000ms.

```typescript
import toast from "react-hot-toast";

toast.success("Done");
toast.error("Failed");
toast.promise(asyncFn(), {        // asyncFn() — must call it, not pass reference
  loading: "Saving...",
  success: <b>Saved!</b>,
  error: <b>Failed.</b>,
});
```

> **Critical:** `toast.promise` requires a `Promise`, not a function reference. Always call `fn()` — not `fn`.

---

## Common Gotchas

1. **`toast.promise(fn, ...)` vs `toast.promise(fn(), ...)`** — always pass the invoked promise, not the function reference. Passing the function silently fails.

2. **Windows case-sensitive renames** — renaming a folder with only a case change (e.g., `UI` → `ui`) requires a two-step rename via a temp name due to Windows case-insensitive filesystem.

3. **`useCallback` and `getBearerToken`** — `getBearerToken` is wrapped in `useCallback` with empty deps because it reads from a ref. It's stable and safe to include in other `useCallback` dependency arrays.

4. **`isPulled` flag** — AuthProvider sets this to `true` after the first Supabase fetch. It prevents re-fetching on re-renders. Never reset it unless you intend a full data reload.

5. **`supabaseAdmin` for admin pages** — always use `supabaseAdmin` (service role) in admin pages that need to read/write other users' data. Regular `supabase` client is RLS-restricted to the current user.

6. **API URL/header construction is centralized** — the old copy-pasted `tokenStageKey`/`tokenEnvKey` pattern is now abstracted into `buildAuthUrl`/`buildApiUrl`/`authHeaders` in `@hooks/opentech` (see the OpenTech API section). Use those helpers for any new API call instead of hand-building URLs or header objects.

7. **Pagination reset on filter** — always call `setCurrentPage(1)` when `searchQuery` changes, otherwise filtered results may show an empty page.

8. **`currentFacility` token** — only populated after facility selection. Always guard with `if (!currentFacility.token) return;` before making API calls.

9. **Both `tsconfig.json` and `vite.config.ts`** must be updated together whenever path aliases change.

10. **`qs` for OAuth payloads** — the auth endpoint requires `application/x-www-form-urlencoded`. Use `qs.stringify()` to encode the body, not `JSON.stringify`.

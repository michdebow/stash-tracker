I'll open the Polish specification file to translate its exact contents. Then I'll return the full English translation
here.

Here is the full English translation
of [_ai/auth-spec.md](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/_ai/auth-spec.md:0:0-0:0):

# Technical specification for the registration, login, and password recovery module (US-001, US-002, US-003)

This document describes the architecture and contracts of authentication functionality based on Supabase Auth in the
StashTracker project. The specification is based on:

- PRD: [_ai/prd.md](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/_ai/prd.md:0:0-0:0) (US-001 Registration,
  US-002 Login, US-003 Password reset)
- Stack: [_ai/tech-stack.md](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/_ai/tech-stack.md:0:0-0:0) (Astro 5,
  React 19, TS 5, Tailwind 4, shadcn/ui, Supabase)
- Repo state: existing pages, layouts, and components in `src/pages/**`, `src/layouts/**`, `src/components/auth/**`, SSR
  configuration in [astro.config.mjs](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/astro.config.mjs:0:0-0:0).

Goals: maintain compatibility with existing files and behavior, clear separation of responsibilities, clear contracts
and error paths, compliance with project guidelines (see project rules).

## 1) User interface architecture

### 1.1. Astro pages (public auth flow)

- [src/pages/login.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/login.astro:0:0-0:0)
    - Already exists. Based
      on [PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
      and
      injects [LoginForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/LoginForm.tsx:20:0-109:1) (
      `client:load`).
    - `export const prerender = false` (as required for SSR and session handling).
- [src/pages/register.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/register.astro:0:0-0:0)
    - Already exists. Based
      on [PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
      and [RegisterForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RegisterForm.tsx:44:0-217:1) (
      `client:load`).
    - `prerender = false`.
- [src/pages/reset-password.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/reset-password.astro:0:0-0:0)
    - Already exists. Based
      on [PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
      and [RequestResetForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RequestResetForm.tsx:24:0-136:1) (
      `client:load`).
    - `prerender = false`.
- [src/pages/update-password.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/update-password.astro:0:0-0:0)
    - Already exists. Based
      on [PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
      and [ResetPasswordForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/ResetPasswordForm.tsx:38:0-139:1) (
      `client:load`).
    - `prerender = false`.

Note: Forms and all client-side interactions are implemented in React, while Astro pages handle layout composition and
SSR access control (via middleware; see section 2.4).

### 1.2. Layouts

- [src/layouts/PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
    - Already exists. Layout for unauthenticated flows (login/registration/reset). Includes a “hero” slot and a form
      container.
- [src/layouts/Layout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/Layout.astro:0:0-0:0)
    - Main application layout (global). For protected views (e.g., `/app/**`), a dedicated app layout is recommended in
      the future (`src/layouts/AppLayout.astro`) with navigation and a “Sign out” action.

### 1.3. React components (forms and supporting UI)

- [src/components/auth/LoginForm.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/LoginForm.tsx:0:0-0:0)
    - Validation: `zod` + `react-hook-form`. Fields: `email` (required, valid), `password` (required).
    - Errors: general message without revealing which field is wrong (meets US-002/AC-3).
    - Action: `supabaseClient.auth.signInWithPassword(...)`, on success → `window.location.assign("/app/dashboard")`.
- [src/components/auth/RegisterForm.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RegisterForm.tsx:0:0-0:0)
    - Validation: `email` (required + valid), `password` (min 6 + special char + no leading/trailing spaces),
      `confirmPassword` (must match `password`).
    - Password strength
      requirements: [usePasswordStrength](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/hooks/usePasswordStrength.ts:86:0-104:1)
      hook (levels `weak|fair|strong|excellent`; UI uses 3 segments). Submit is blocked when strength is `weak` or
      requirements unmet.
    - Action: `auth.signUp(...)`; if `data.session` is missing, automatically `signInWithPassword(...)` (meets
      US-001/AC-3). On success → redirect to `/app/dashboard`.
    - Handles `user_already_exists` with a dedicated message.
- [src/components/auth/RequestResetForm.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RequestResetForm.tsx:0:0-0:0)
    - Validation: `email` (required + valid).
    - Action: `auth.resetPasswordForEmail(email, { redirectTo: <origin>/update-password })`.
    - UI: Always shows a non-specific success message (“If an account with this email exists...”) to prevent account
      enumeration.
- [src/components/auth/ResetPasswordForm.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/ResetPasswordForm.tsx:0:0-0:0)
    - Validation: `password` (min 8), `confirmPassword` (match), no leading/trailing spaces.
    - Action: `auth.updateUser({ password })`, then redirect to `/login?message=password-reset-success`.
    - Recommendation (see 3.3): after successfully setting a new password, perform a global sign-out to invalidate old
      sessions across all devices.
- Supporting components:
    - [AuthLinks.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/AuthLinks.tsx:0:0-0:0):
      navigation links (registration, password reset).
    - [FormErrorAlert.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/FormErrorAlert.tsx:0:0-0:0):
      unified form error renderer.
    - [PasswordStrengthMeter.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/PasswordStrengthMeter.tsx:0:0-0:0), [PasswordRequirementList.tsx](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/PasswordRequirementList.tsx:0:0-0:0)
      and [hooks/usePasswordStrength.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/hooks/usePasswordStrength.ts:0:0-0:0):
      shared UI/password strength rules.

### 1.4. Separation of responsibilities (Astro vs React)

- Astro pages (`*.astro`):
    - Layout and UI composition (layouts, slots, SEO/meta), SSR redirects in middleware.
    - No authentication logic in the pages themselves beyond rendering the form and, optionally, displaying query param
      messages.
- React components (client):
    - Data validation (`zod`/`react-hook-form`), state handling, calls to Supabase SDK (`@supabase/supabase-js`), error
      presentation, redirects after success.
    - No direct cookie manipulation—the session is managed by the Supabase client and (optionally) server endpoints.

### 1.5. Validations and error messages

- Login:
    - `email`: required, valid format; `password`: required.
    - Error: “Unable to sign in. Check your email and password.” or a generic 5xx error.
- Registration:
    - `email`: required, valid; `password`: min 6, special character, no outer spaces; `confirmPassword`: match.
    - Password strength: enable submit only above “weak.”
    - Errors: “user_already_exists,” generic 5xx, generic fallback.
- Reset (request link):
    - `email`: required, valid.
    - Success message always non-specific (“If an account with this email exists ...”).
- Set new password:
    - `password`: min 8, no outer spaces; `confirmPassword`: match.
    - Errors: expired/invalid link (“invalid or has expired”) and generic.

### 1.6. Key scenarios

- Registration (US-001): submit → (signUp) → (optionally auto signIn) → redirect `/app/dashboard`.
- Login (US-002): submit → signIn → redirect `/app/dashboard`; wrong data → general error message.
- Password reset (US-003): provide email → send link → `update-password` page → set new password → global sign-out →
  redirect to `/login`.
- SSR navigation and redirects: recommended middleware rules (see 2.4) to redirect unauthenticated users to `/login` and
  redirect authenticated users from public pages to `/app/dashboard`.

## 2) Backend logic (SSR, API, validation, errors)

### 2.1. General assumptions

- SSR
  configuration: [astro.config.mjs](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/astro.config.mjs:0:0-0:0) →
  `output: "server"`, adapter `@astrojs/node`—the app runs on the server side; Astro middleware and endpoints can be
  used.
- API in Astro: directory `src/pages/api/**`—each route with `export const prerender = false` and `GET/POST` handlers (
  uppercase).
- Input validation: `zod`—consistent with the frontend; for error responses, use standardized types
  from [src/types.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:0:0-0:0) ([ErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:190:0-194:1), [ValidationErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:199:0-201:1)).
- Access to Supabase in the backend: through `Astro.locals.supabase` initialized in middleware.

### 2.2. API endpoints (proposed)

- `POST /api/auth/logout`
    - Purpose: unified, server-side logout and session cleanup (SSR). Uses
      `locals.supabase.auth.signOut({ scope: 'global' })`.
    - Response: `204 No Content` on success; `4xx/5xx`
      with [ErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:190:0-194:1) on error.
- `GET /api/auth/session` (optional)
    - Purpose: SSR-friendly fetch of the current user/session for the client (e.g., simple “me”).
    - Response: `{ user: ... }` or `401` (no session).

Note: login/registration/reset are executed directly via the client SDK (already implemented in existing components).
Server endpoints are primarily for consistent logout and optional session introspection on the server side.

### 2.3. Error response contracts (API)

- [ErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:190:0-194:1)
  and [ValidationErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:199:0-201:1)—use
  existing types in [src/types.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:0:0-0:0).
- Standard:
    - `400`—invalid input (with `zod` errors list).
    - `401`—unauthorized.
    - `500`—internal error (logged server-side).

### 2.4. Middleware and SSR

- File: `src/middleware/index.ts`
    - Responsibilities:
        - Create a server Supabase client and attach it to `Astro.locals.supabase` (
          type: [SupabaseClient](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/db/supabase.client.ts:13:0-13:58)
          from [src/db/supabase.client.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/db/supabase.client.ts:0:0-0:0)).
        - Protect `/app/**` routes: no session → `Response.redirect('/login')`.
        - Public auth pages (`/login`, `/register`, `/reset-password`, `/update-password`): if user is logged in →
          redirect to `/app/dashboard`.
        - Manage cookies via `Astro.cookies` in SSR.

Example responsibility (API sketch):

```ts
// contracts (shape example; implement in services)
interface MiddlewareAuthContext {
  supabase: SupabaseClient; // from src/db/supabase.client.ts (type)
}
```

### 2.5. Services layer

- `src/lib/services/auth.service.ts` (proposed)
    - Adapters for Supabase operations on the backend (e.g., `logoutGlobal(supabase)`, `getCurrentUser(supabase)`),
      error handling, logging.
    - Invoked by API endpoints and middleware—centralizes logic and error handling.

## 3) Authentication system (Supabase Auth + Astro)

### 3.1. Flows

- Registration: `supabase.auth.signUp({ email, password, options: { emailRedirectTo? } })`.
    - The PRD doesn’t require email verification. If verification is enabled in Supabase, `emailRedirectTo` points to a
      callback page (e.g., `/auth/callback`) and after confirmation the user can log in.
    - In the current
      code, [RegisterForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RegisterForm.tsx:44:0-217:1)
      sets `emailRedirectTo` (optionally, if `window` is available). If verification is disabled, we still meet
      US-001/AC-3 (auto-login/redirect to the dashboard).
- Login: `supabase.auth.signInWithPassword({ email, password })` → redirect `/app/dashboard`.
- Logout: client `supabase.auth.signOut({ scope: 'global' })` or server endpoint POST `/api/auth/logout`.
- Password reset:
    - Request: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/update-password })`.
    - Set new password: `supabase.auth.updateUser({ password })` on the `update-password` page.
    - Revoking old sessions: after success, run `supabase.auth.signOut({ scope: 'global' })` (see 3.3).

### 3.2. Sessions and SSR

- In SSR mode (Node adapter), it’s recommended to use the server-side Supabase client integrated with cookies, attached
  to `Astro.locals` (middleware).
- Public auth pages should redirect a logged-in user to `/app/dashboard` (SSR) to avoid UI flicker.

### 3.3. Session revocation after password reset

- US-003/AC-3 requirement: “After reset, old sessions are revoked.”
- Recommended mechanism: after successful `auth.updateUser({ password })`, execute `auth.signOut({ scope: 'global' })` (
  ALL user refresh tokens). Then redirect to `/login`.
- Note: access tokens may remain valid until expiration (standard JWT behavior), but subsequent refreshes will be
  blocked—meets the AC.

### 3.4. Environment variables and security

- Client (browser): should use `PUBLIC_...` keys (e.g., `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
- Server (SSR, middleware, API): may use non-public variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`—only for
  admin actions, not needed for basic auth here).
- Repo state:
    - [src/db/supabase.client.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/db/supabase.client.ts:0:0-0:0)
      requires `SUPABASE_URL` and `SUPABASE_KEY`—in client React code this may need refactoring to `PUBLIC_...`. To
      preserve compatibility, we won’t change implementation now; the spec indicates the target naming standard.
    - [.env.example](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/.env.example:0:0-0:0) contains
      `SUPABASE_URL` and `SUPABASE_KEY`. It’s recommended to add `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` for
      browser code.
- Additional security measures:
    - Prevent account enumeration (already implemented
      in [RequestResetForm](cci:1://file:///Applications/MAMP/htdocs/stash-tracker/src/components/auth/RequestResetForm.tsx:24:0-136:1)).
    - Lockout/rate-limiting can be configured via Supabase/Auth or reverse-proxy layer (out of scope here).

## 4) Contracts and modules to add/maintain

### 4.1. Modules/paths

- UI (existing):
    - [src/pages/login.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/login.astro:0:0-0:0), [src/pages/register.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/register.astro:0:0-0:0), [src/pages/reset-password.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/reset-password.astro:0:0-0:0), [src/pages/update-password.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/pages/update-password.astro:0:0-0:0).
    - [src/layouts/PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0), [src/layouts/Layout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/Layout.astro:0:0-0:0) (
      optional: `src/layouts/AppLayout.astro`).
    - `src/components/auth/**` (LoginForm, RegisterForm, RequestResetForm, ResetPasswordForm, AuthLinks, FormErrorAlert,
      PasswordStrengthMeter, PasswordRequirementList, hooks/usePasswordStrength).
- Backend:
    - `src/middleware/index.ts`—initialize `locals.supabase`, protect routes.
    - `src/pages/api/auth/logout.ts` (POST), optional `src/pages/api/auth/session.ts` (GET).
    - `src/lib/services/auth.service.ts`—helpers for middleware/API.

### 4.2. Contracts (error response shape, DTO)

-

Errors: [ErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:190:0-194:1), [ValidationErrorResponse](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:199:0-201:1)
from [src/types.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/types.ts:0:0-0:0).

- `GET /api/auth/session` (optional):

```ts
// Response 200
interface AuthSessionDTO {
  user: {
    id: string;
    email: string | null;
  } | null;
}
```

- `POST /api/auth/logout`:

```ts
// 204 No Content on success; on error
// ErrorResponse { error: string, message?: string, details?: Record<string, unknown> }
```

## 5) Compatibility and impact on existing behavior

- We don’t change existing pages and components—we keep:
    - Redirects to `/app/dashboard` on success (login/registration),
    - Error messages and validation rules in forms,
    - Public
      layout [PublicPageLayout.astro](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/layouts/PublicPageLayout.astro:0:0-0:0)
      and `prerender = false`.
- We add (without UI impact): SSR middleware and API endpoints (logout, optional session)—they enable consistent SSR
  behavior and simpler navigation/route protection.
- Environment: the spec recommends standardizing `PUBLIC_...` variables for the client—implement in a separate PR,
  without impacting current functionality.

## 6) Test scenarios (high level)

- Registration:
    - Valid data → auto-login or successful login → redirect `/app/dashboard`.
    - Existing email → “already exists” message.
    - Weak password → submit disabled.
- Login:
    - Valid data → redirect `/app/dashboard`.
    - Wrong data → generic error without indicating the field.
- Password reset:
    - Valid email → non-specific success message + link.
    - Expired link → expiration message.
    - Set new password → global sign-out → redirect `/login`.
- Middleware:
    - Visiting `/app/**` without session → redirect `/login`.
    - Visiting `/login|/register|/reset-password|/update-password` with active session → redirect `/app/dashboard`.

## 7) Implementation notes and alignment with project guidelines

- Use `zod` for input validation in API endpoints as well.
- `export const prerender = false` in API routes.
- In Astro routes, use `context.locals.supabase` (do not import the client directly—per project rule).
- Supabase client
  type: [SupabaseClient](cci:2://file:///Applications/MAMP/htdocs/stash-tracker/src/db/supabase.client.ts:13:0-13:58)
  from [src/db/supabase.client.ts](cci:7://file:///Applications/MAMP/htdocs/stash-tracker/src/db/supabase.client.ts:0:0-0:0).
- Errors: early returns, clear user-facing messages, detailed logging server-side.
- A11y: ARIA roles, `aria-live` for dynamic updates, `aria-describedby` for password requirements.

## 8) Backlog and further improvements (beyond US-001..003 AC scope)

- Unify password strength policy (min 8 chars also in registration; currently registration min 6, reset min 8—target 8).
- Consolidate Supabase clients and environment variables (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` in client;
  server keys separated).
- Add `/auth/callback` page (if Supabase email verification is enabled) to handle confirmations.
- Add a “Sign out” component in the protected layout and use the server endpoint `POST /api/auth/logout`.
- Event telemetry (registration/login/reset)—anonymous counts, no sensitive data.

---

This specification aligns with the current code (pages/components exist) and does not change its behavior. It adds an
SSR layer (middleware) and optional lightweight API endpoints for session consistency and security, and sets target
environment and security standards without overhauling the existing UI implementation.

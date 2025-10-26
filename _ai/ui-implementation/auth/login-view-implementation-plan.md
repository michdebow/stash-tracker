# View Implementation Plan – Login

## 1. Overview
The `/login` view authenticates existing users with their email and password. It renders inside `PublicPageLayout` and presents a React-powered `LoginForm` that validates inputs, calls Supabase Auth to create a session, handles error messaging, and redirects authenticated users to the dashboard. Secondary links provide navigation to registration and password reset flows.

## 2. View Routing
- **Route Path:** `/login`
- **Layout:** `src/layouts/PublicPageLayout.astro`
- **Entry File:** `src/pages/login.astro`

## 3. Component Structure
- `login.astro`
  - wraps content with `PublicPageLayout`
  - loads `LoginHero` (optional static copy) and `LoginForm` React island
- `LoginForm.tsx`
  - uses `shadcn/ui` form primitives and `react-hook-form`
  - renders `FormErrorAlert`, form fields, submit button, and `AuthLinks`
- Supporting components
  - `FormErrorAlert.tsx`
  - `AuthLinks.tsx`
  - (optional) `LoginHero.astro` for branding copy

## 4. Component Details
### login.astro
- **Description:** Astro page that sets up SEO metadata, renders layout, and mounts the React login form island.
- **Main elements:** `<PublicPageLayout>` wrapper, hero section (`<h1>`, `<p>`), `<LoginForm client:load />`.
- **Handled interactions:** None (static content).
- **Handled validation:** None.
- **Types:** None beyond Astro props.
- **Props:** None.

### PublicPageLayout.astro (existing)
- **Description:** Shared layout for unauthenticated flows; ensures consistent styling and responsive container.
- **Main elements:** `<html>`, `<body>`, header with logo (optional), main content slot.
- **Handled interactions:** None.
- **Validation:** None.
- **Types:** Layout props (children only).
- **Props:** `AstroComponentFactory` slot.

### LoginForm.tsx
- **Description:** React component rendering the login form using `shadcn/ui` components, handling validation, submission, and navigation links.
- **Main elements:**
  - `Form` (from `shadcn/ui` + `react-hook-form`)
  - `FormField` wrappers for email & password
  - `Input`, `Label`, `Button`
  - `Checkbox` (optional remember me; omit if out of scope)
  - `FormErrorAlert` for generic errors
  - `AuthLinks` for register/reset links
- **Handled interactions:**
  - `onSubmit` triggers Supabase login.
  - `onChange` updates form state via `react-hook-form`.
  - `onFocus` may clear field-level errors (automatic from RHF).
- **Handled validation:**
  - Email required and must match regex pattern; trimmed before submission.
  - Password required, min length 1 (no extra restrictions per PRD for login).
  - Disable submit while `isSubmitting`.
- **Types:**
  - Props: none.
  - Uses `LoginFormValues`, `LoginErrorState`, `LoginFieldErrors` (defined in Types section).
- **Props:** None (self-contained).

### FormErrorAlert.tsx
- **Description:** Displays non-specific error messages after failed authentication attempts.
- **Main elements:** `Alert` (`shadcn/ui`), icon, message text.
- **Handled interactions:** Close/dismiss optional.
- **Handled validation:** None.
- **Types:** Props `{ message: string | null }`.
- **Props:** Accepts error message string (or null to hide).

### AuthLinks.tsx
- **Description:** Renders navigation links for "Create account" and "Forgot password".
- **Main elements:** `<nav>`, `Link` components or `<a>` tags pointing to `/register` and `/reset-password`.
- **Handled interactions:** Link clicks (default navigation).
- **Handled validation:** None.
- **Types:** Optional props for styling overrides.
- **Props:** None or `{ variant?: "stacked" | "inline" }` if needed.

## 5. Types
- **`LoginFormValues`**
  ```ts
  interface LoginFormValues {
    email: string;
    password: string;
  }
  ```
- **`LoginErrorState`**
  ```ts
  interface LoginErrorState {
    message: string;
  }
  ```
- **`LoginFieldErrors`** (optional if not using RHF `FieldErrors`)
  ```ts
  type LoginFieldErrors = Partial<Record<keyof LoginFormValues, string>>;
  ```
- **`LoginResponsePayload`** (if needed for typing response)
  ```ts
  import type { Session, User } from "@supabase/supabase-js";

  interface LoginResponsePayload {
    session: Session | null;
    user: User | null;
  }
  ```
- **`LoginFormSchema`** (Zod schema for validation)
  ```ts
  const loginFormSchema = z.object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
  });
  ```

## 6. State Management
- Utilize `react-hook-form` with `zodResolver` for form state, validation, and error messaging.
- Track submission state via `formState.isSubmitting` to disable the submit button and show spinner.
- Manage generic error message with `useState<LoginErrorState | null>` updated on failed Supabase responses.
- Optionally use `useSupabaseBrowserClient()` (if provided by `src/db/supabase.client.ts`) to obtain the Supabase client instance inside the component.

## 7. API Integration
- Call Supabase SDK: `supabase.auth.signInWithPassword({ email, password })`.
- **Request:**
  ```ts
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });
  ```
- **Response:**
  - `data.session`: new session info (null if email confirmation required).
  - `error`: `AuthError` or `AuthApiError` containing `message` and `status`.
- On success: redirect to `/app/dashboard` using `window.location.assign` or Astro navigation helper.
- On error: log for diagnostics (console or monitoring) and set generic error message `"Invalid email or password"` to `FormErrorAlert`.

## 8. User Interactions
- **Typing in inputs:** updates `react-hook-form` controlled values; show inline validation messages on blur/submit.
- **Submitting form:** triggers validation; if valid, disables submit button, shows spinner, calls Supabase API.
- **Submission success:** form resets (optional) and user redirected to dashboard.
- **Submission failure:** show `FormErrorAlert` with generic message; keep inputs for correction, re-enable button.
- **Click "Create account":** Navigate to `/register`.
- **Click "Forgot password":** Navigate to `/reset-password`.

## 9. Conditions and Validation
- **Email field:** required, trimmed, must be syntactically valid email. Verified client-side via Zod; server inherently validates.
- **Password field:** required, non-empty. Additional complexity not mandated.
- **Submit button:** disabled when form invalid, dirty check failing, or `isSubmitting` true.
- **API conditions:** Supabase requires valid credentials; component ensures inputs non-empty and sanitized before call.

## 10. Error Handling
- **Invalid credentials (400):** show generic message "Unable to sign in. Check your email and password." without specifying which field failed.
- **Network/server errors:** show "We couldn't sign you in right now. Please try again later." Provide retry path.
- **Rate limiting / unexpected errors:** log to console (or telemetry hook) and show fallback generic message.
- **Form validation errors:** display inline helper text beneath inputs using `FormMessage` from `shadcn/ui`.

## 11. Implementation Steps
1. Create `src/pages/login.astro` using `PublicPageLayout` and mount `LoginForm` React component with `client:load`.
2. Ensure `PublicPageLayout.astro` exposes a slot for page content (reuse or update layout if needed).
3. Implement `LoginForm.tsx` in `src/components/auth/` (new directory) using `react-hook-form` + `zod` + `shadcn/ui` components.
4. Define Zod schema and `LoginFormValues` type; integrate via `zodResolver`.
5. Fetch Supabase client via existing helper (`useSupabaseBrowserClient`) or instantiate if necessary.
6. Add submit handler calling `supabase.auth.signInWithPassword`, handling success (redirect) and errors (state update + toasts if desired).
7. Render inline form messages and disable button while submitting; include spinner icon from `shadcn/ui` `Button` variant.
8. Create `FormErrorAlert.tsx` and `AuthLinks.tsx` in `src/components/auth/` using `Alert` and `Button`/`Link` components.
9. Style the page per Tailwind + design tokens, ensuring responsive layout for desktop/mobile.
10. Write unit tests (if infrastructure exists) or at minimum manual QA checklist covering success, invalid credentials, empty fields, network failure.
11. Verify the view in the browser, ensuring redirect works and errors are displayed per requirements.

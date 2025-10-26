# View Implementation Plan Register

## 1. Overview
StashTrackers `/register` view lets visitors create password-based accounts, highlights password requirements in real time, and completes onboarding by authenticating and redirecting new users to the dashboard.

## 2. View Routing
- **Path**: `/register`
- **Layout**: `src/layouts/PublicPageLayout.astro`
- **Entry file**: `src/pages/register.astro`

## 3. Component Structure
```plaintext
PublicPageLayout
  └─ RegisterPage (Astro)
      └─ RegisterForm (React)
          ├─ PasswordStrengthMeter (React)
          ├─ PasswordRequirementList (React)
          └─ AuthLinks (existing React component)
```

## 4. Component Details
### RegisterPage (`src/pages/register.astro`)
- **Component description** Provides the public layout shell, page metadata, and mounts the `RegisterForm` within a centered hero section.
- **Main elements** `<PublicPageLayout>`, `<main>` with stack layout, `<RegisterForm />`, supportive copy, background visuals consistent with login page.
- **Handled interactions** None (static wrapper).
- **Handled validation** Ensures page uses semantic landmarks (`<main>`), passes through no props.
- **Types** None beyond intrinsic JSX.
- **Props** None.

### RegisterForm (`src/components/auth/RegisterForm.tsx`)
- **Component description** Stateful React form built with `react-hook-form` and Zod, handling registration submission, Supabase Auth calls, loading state, and inline error display.
- **Main elements** `<Form>` wrapper, `<FormField>` inputs for email, password, confirm password; `<PasswordStrengthMeter>`; `<PasswordRequirementList>`; `<Button>` submit; `<FormErrorAlert>`; `<AuthLinks>`.
- **Handled interactions**
  - `onSubmit` -> validate data -> call Supabase sign-up -> on success ensure session and redirect to `/app/dashboard`.
  - `onChange` password field -> trigger strength calculation and unmet requirement list update.
  - `onBlur` for email/password inputs -> run zod validation.
- **Handled validation**
  - Email: non-empty, valid RFC address, trimmed.
  - Password: min 12 chars, includes uppercase, lowercase, digit, special character, no leading/trailing spaces.
  - Confirm password: matches password exactly.
  - Prevent submission until all requirements satisfied and strength score Strong.
- **Types** `RegisterFormValues`, `PasswordStrengthResult`, `PasswordStrengthLevel`, `PasswordRequirement`.
- **Props** Optional `onSuccess?: () => void` (default triggers redirect) to keep component flexible; otherwise none required.

### PasswordStrengthMeter (`src/components/auth/PasswordStrengthMeter.tsx`)
- **Component description** Visual & accessible indicator showing password strength categories.
- **Main elements** `<div role="status">` with segmented bar or progress meter, strength label text, `aria-live="polite"` for updates.
- **Handled interactions** Receives derived strength data, no direct events.
- **Handled validation** Displays `score` mapped to colors/states (`Weak`, `Fair`, `Strong`, `Excellent`).
- **Types** Accepts `PasswordStrengthResult` fields.
- **Props** `{ level: PasswordStrengthLevel; score: number; label: string; }` and optional `className`.

### PasswordRequirementList (`src/components/auth/PasswordRequirementList.tsx`)
- **Component description** Lists password rules with pass/fail indicators for each requirement.
- **Main elements** `<ul>` list with icons/text, `aria-live="polite"`, `aria-describedby` ties to password input.
- **Handled interactions** Reacts to requirement boolean flags to update state.
- **Handled validation** Shows unmet requirements; does not allow form submit if any `false`.
- **Types** Uses `PasswordRequirementDisplay` from view model.
- **Props** `{ requirements: PasswordRequirementDisplay[] }`.

### AuthLinks (existing `src/components/auth/AuthLinks.tsx`)
- **Component description** Provides navigation to login and forgot-password pages; reused from login page with `variant="stacked"`.
- **Main elements** `<nav>` with anchor links.
- **Handled interactions** Click navigation.
- **Handled validation** None.
- **Types** Existing component types.
- **Props** `variant="stacked"`, optional `className` to match form spacing.

## 5. Types
- **`RegisterFormValues`**
  ```ts
  interface RegisterFormValues {
    email: string;
    password: string;
    confirmPassword: string;
  }
  ```
- **`PasswordStrengthLevel`**
  ```ts
  type PasswordStrengthLevel = "weak" | "fair" | "strong" | "excellent";
  ```
- **`PasswordRequirement`** (internal config for evaluation)
  ```ts
  interface PasswordRequirement {
    id: "length" | "uppercase" | "lowercase" | "digit" | "symbol";
    label: string;
    test: (password: string) => boolean;
  }
  ```
- **`PasswordRequirementDisplay`**
  ```ts
  interface PasswordRequirementDisplay {
    id: PasswordRequirement["id"];
    label: string;
    isMet: boolean;
  }
  ```
- **`PasswordStrengthResult`**
  ```ts
  interface PasswordStrengthResult {
    score: number; // 0-4 scale
    level: PasswordStrengthLevel;
    label: string;
    unmetRequirementIds: PasswordRequirementDisplay["id"][];
  }
  ```
- **`RegisterSubmitError`** (optional helper)
  ```ts
  type RegisterSubmitError = {
    status?: number;
    code?: string;
    message: string;
  };
  ```

## 6. State Management
- `react-hook-form` manages form state, touched fields, validation errors via `zodResolver`.
- `useState` for `errorMessage` exposed in `FormErrorAlert` and for `passwordStrength` storing `PasswordStrengthResult`.
- `usePasswordStrength(password: string)` custom hook returns `PasswordStrengthResult`; uses memoized requirement checks and scoring logic.
- `formState.isSubmitting` controls loading spinner and disables submit button.

## 7. API Integration
- **Client**: `supabaseClient` from `src/db/supabase.client`
- **Request**: `supabaseClient.auth.signUp({ email: values.email.trim(), password: values.password }, { emailRedirectTo: `${origin}/auth/callback` })`
- **Follow-up**: If `data.session` is null, call `supabaseClient.auth.signInWithPassword({ email, password })` to satisfy auto-login requirement.
- **Response handling**: On success (session token present), redirect via `window.location.assign("/app/dashboard")` or `navigate`.
- **Errors**: Inspect `error.status`; show generic message for 5xx, specific guidance for conflict (`email already registered`). Log unexpected errors with `console.error`.

## 8. User Interactions
- **Typing email/password** updates form state, runs debounced validation, and updates requirement list with `aria-live` feedback.
- **Clicking "Create account"** triggers submission; disables button and shows spinner until Supabase responds.
- **Successful registration** resets error state, optionally shows toast, then redirects to dashboard.
- **Failed registration** surfaces inline error alert with accessible messaging.
- **Password requirements list** shows checkmarks as user meets each rule.
- **AuthLinks** provide navigation back to `/login` and forgot password route.

## 9. Conditions and Validation
- **Email field**: must be non-empty, valid format; trimmed before submission.
- **Password field**: must satisfy all requirements before enabling submit; strength meter must reach `strong` (score 8/4).
- **Confirm password**: equality check enforced by zod refinement.
- **Terms/privacy copy**: optional note referencing data security (per PRD privacy assurance).
- **Supabase session check**: ensure session exists post-sign-up; if absent and sign-in fails, show fallback message.

## 10. Error Handling
- Display friendly message if email already exists (`error.code === "user_already_exists"`).
- Generic retry message for network/server issues; encourage later attempt.
- Catch unexpected exceptions from Supabase SDK and log with context.
- Validate on submit to prevent sending weak passwords; highlight unmet rules.
- Use `aria-live="assertive"` on `FormErrorAlert` to announce errors to assistive tech.

## 11. Implementation Steps
1. Scaffold `src/pages/register.astro` using `PublicPageLayout` and mount placeholder `RegisterForm`.
2. Create `src/components/auth/RegisterForm.tsx` modeled after existing `LoginForm`, set up `react-hook-form` with Zod schema (including confirm password refinement).
3. Implement password requirements config and `usePasswordStrength` hook in `src/components/auth/hooks/usePasswordStrength.ts` (or similar) returning `PasswordStrengthResult`.
4. Build `PasswordRequirementList` component to render requirement states with Tailwind styling and accessibility attributes.
5. Build `PasswordStrengthMeter` component providing visual bar and text label; ensure color contrast per Tailwind theme.
6. Integrate strength hook into `RegisterForm`, wiring updates from password field to requirement list and meter.
7. Add submission handler calling Supabase `auth.signUp`, fallback `auth.signInWithPassword`, and redirect on success; include loading states and error handling guard clauses.
8. Reuse `FormErrorAlert` and `AuthLinks` for consistent messaging; add copy highlighting security/privacy commitment.
9. Ensure responsive spacing and layout parity with login view (shared utility classes, stack spacing).
10. Manually test flows (successful sign-up, existing email, weak password) and update documentation/testing notes as needed.

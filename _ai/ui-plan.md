# UI Architecture for StashTracker

## 1. UI Structure Overview

The UI for StashTracker is designed as a responsive, single-page application (SPA-like) experience built with Astro for static layouts and React for interactive components. The architecture prioritizes simplicity, speed, and a focused user experience, enabling users to quickly track expenses and manage savings with minimal friction.

The structure is divided into two main parts:
1.  **Public Pages**: Static, server-rendered pages for authentication (Login, Register, Password Reset).
2.  **Protected Application Shell**: A client-side rendered interface for authenticated users, featuring a simple tab-based navigation system. This shell provides access to the Dashboard, Stashes, and Budget management views.

Key architectural decisions include a global "Add" button for quick transaction entry, a centralized state management strategy for data synchronization, and a component-based design using `shadcn/ui` for a consistent and accessible user interface.

## 2. View List

### Public Views

#### View: Login
- **View Path**: `/login`
- **Main Purpose**: To authenticate existing users.
- **Key Information**: Email and password input fields, a link to the registration page, and a "Forgot Password" link.
- **Key View Components**: `LoginForm` (React), `PublicPageLayout` (Astro).
- **UX, Accessibility, and Security**: Display clear, non-specific error messages on failed login attempts. Ensure all form fields have labels. The form will handle submission state (e.g., disabling the button) to prevent multiple submissions.

#### View: Register
- **View Path**: `/register`
- **Main Purpose**: To allow new users to create an account.
- **Key Information**: Email and password input fields (with password confirmation).
- **Key View Components**: `RegisterForm` (React), `PublicPageLayout` (Astro).
- **UX, Accessibility, and Security**: Provide real-time password strength feedback. Clearly communicate password requirements. Upon successful registration, the user is automatically logged in and redirected to the dashboard.

#### View: Reset Password
- **View Path**: `/reset-password`
- **Main Purpose**: To allow users to reset a forgotten password.
- **Key Information**: A form to submit an email address to receive a reset link, and a separate form (on a unique, tokenized URL) to set a new password.
- **Key View Components**: `RequestResetForm` (React), `ResetPasswordForm` (React), `PublicPageLayout` (Astro).
- **UX, Accessibility, and Security**: The reset link sent via email must be time-limited and single-use. Provide clear feedback to the user after they submit their email.

### Protected Views

#### View: Dashboard
- **View Path**: `/app/dashboard`
- **Main Purpose**: To provide a high-level overview of the user's financial status at a glance.
- **Key Information**:
    - Monthly budget summary (budget vs. spent).
    - Overall stash balance summary.
    - A list of the last 5 expenses.
- **Key View Components**: `AppLayout` (Astro), `BudgetSummaryCard` (React), `StashesOverviewCard` (React), `RecentExpensesList` (React).
- **UX, Accessibility, and Security**: This is the default view after login. Data is fetched client-side, and skeleton loaders are used to manage loading states, providing a smooth user experience. All data is scoped to the authenticated user via API.

#### View: Stashes List
- **View Path**: `/app/stashes`
- **Main Purpose**: To allow users to view and manage all their savings stashes.
- **Key Information**: A list of all stashes, each showing its name and current balance.
- **Key View Components**: `AppLayout` (Astro), `StashList` (React), `StashListItem` (React).
- **UX, Accessibility, and Security**: Each item in the list is a link to the `Stash Detail` view. The view supports creating a new stash, which will likely be handled by the `GlobalAddButton`.

#### View: Stash Detail
- **View Path**: `/app/stashes/[id]`
- **Main Purpose**: To provide a detailed view of a single stash, including its transaction history.
- **Key Information**:
    - Stash name and current balance.
    - A chronological, paginated list of all transactions (deposits and withdrawals) for that stash.
- **Key View Components**: `AppLayout` (Astro), `StashDetailHeader` (React), `TransactionList` (React).
- **UX, Accessibility, and Security**: Users can add or withdraw funds and delete individual transactions from this view. Deletion actions must trigger a confirmation modal to prevent accidental data loss.

#### View: Budget
- **View Path**: `/app/budget`
- **Main Purpose**: To allow users to set and review their monthly spending budgets.
- **Key Information**: A form to set or update the budget for the current month. It may also display a history of past monthly budgets.
- **Key View Components**: `AppLayout` (Astro), `SetBudgetForm` (React), `PastBudgetsList` (React, optional for MVP).
- **UX, Accessibility, and Security**: The form uses an `UPSERT` pattern via a `PUT` request, simplifying the UI for the user. The input should only accept positive numerical values.

#### View: Account Settings
- **View Path**: `/app/settings`
- **Main Purpose**: To allow users to manage their account.
- **Key Information**: An option to log out and a section for account deletion.
- **Key View Components**: `AppLayout` (Astro), `DeleteAccountSection` (React).
- **UX, Accessibility, and Security**: The "Delete Account" action is a critical, destructive operation. It must be protected by requiring the user to re-enter their password and confirm their choice in a modal dialog.

## 3. User Journey Map

### Journey 1: New User Registration and First Expense Entry
1.  **Start**: User lands on the `/login` page.
2.  **Navigate to Register**: User clicks the "Sign up" link and is taken to `/register`.
3.  **Create Account**: User fills in their email and password and submits the `RegisterForm`.
4.  **Login & Redirect**: Upon success, a session is created, and the user is redirected to `/app/dashboard`.
5.  **View Dashboard**: The user sees the empty state of their dashboard (e.g., "No stashes yet").
6.  **Add Expense**: The user clicks the `GlobalAddButton`.
7.  **Open Modal**: The `AddTransactionModal` appears.
8.  **Select Type**: The user selects "Expense" from the options.
9.  **Fill Form**: The `AddExpenseForm` is displayed. The user enters an amount, selects a category, and submits.
10. **Feedback & Update**: The modal closes, a success toast appears, and the `RecentExpensesList` and `BudgetSummaryCard` on the dashboard update to reflect the new expense.

### Journey 2: Managing a Stash
1.  **Start**: Authenticated user is on the `/app/dashboard`.
2.  **Navigate to Stashes**: User clicks the "Stashes" tab in the `AppTabs` navigation, moving to `/app/stashes`.
3.  **Create Stash**: User clicks the `GlobalAddButton`, selects "Stash Transaction," and chooses to create a new stash. They enter a name and are returned to the stash list, where the new stash appears.
4.  **View Stash Details**: User clicks on a stash in the `StashList`, navigating to `/app/stashes/[id]`.
5.  **Add Funds**: User clicks an "Add Funds" button on the detail page, enters an amount in a form, and submits. The stash balance and transaction list update.
6.  **Delete Transaction**: User clicks the delete icon next to a transaction. A `ConfirmationModal` appears. Upon confirmation, the transaction is removed, and the balance is recalculated.

## 4. Layout and Navigation Structure

### Layouts
- **`PublicPageLayout.astro`**: A simple layout for unauthenticated users, likely containing a centered content area for forms.
- **`AppLayout.astro`**: The main layout for the authenticated application experience. It is a protected route that verifies the user's session. This layout contains:
    - A simple **Header** with the product logo and a user menu containing a "Settings" link and a "Logout" button.
    - The main **Content Area** where the active view is rendered.
    - The **`AppTabs`** component for primary navigation.
    - The **`GlobalAddButton`**.
    - The **`Toaster`** component for displaying notifications.

### Navigation
- **Primary Navigation**: A tab bar (`AppTabs`) will be fixed at the bottom of the viewport on mobile and displayed prominently (e.g., at the top) on desktop. It will contain three links:
    - **Dashboard** (`/app/dashboard`)
    - **Stashes** (`/app/stashes`)
    - **Budget** (`/app/budget`)
- **Secondary Navigation**: Navigation to sub-views like `Stash Detail` or `Account Settings` will be contextual, achieved by clicking on list items or menu options.
- **Global Actions**: The `GlobalAddButton` provides persistent access to the most common user actions (adding an expense or stash transaction) from anywhere within the protected app, reducing navigational steps.

## 5. Key Components

- **`ConfirmationModal.tsx`**: A reusable React component used to confirm destructive actions like deleting a stash, transaction, or the entire account. It traps focus and requires an explicit user action to proceed or cancel.

- **`GlobalAddButton.tsx`**: A Floating Action Button (FAB) that opens the `AddTransactionModal`. It is a core part of the user experience, enabling quick data entry.

- **`AddTransactionModal.tsx`**: A modal that serves as a multi-step form wizard. The first step asks the user whether they want to add an expense or a stash transaction, and subsequent steps show the appropriate form (`AddExpenseForm` or `AddStashTransactionForm`).

- **`DataList.tsx`**: A generic component for displaying lists of data (e.g., `RecentExpensesList`, `StashList`, `TransactionList`). It will handle rendering items and displaying skeleton loaders while data is being fetched.

- **`Toaster.tsx`**: The container for displaying toast notifications, used for providing non-blocking feedback to the user after an action is completed (e.g., "Expense added successfully") or an error occurs.

- **`*Form.tsx`**: A collection of specific React components for handling all form submissions (e.g., `LoginForm`, `AddExpenseForm`, `SetBudgetForm`). They manage their own state, perform client-side validation, and handle submission logic, including disabling buttons and showing loading/error states.

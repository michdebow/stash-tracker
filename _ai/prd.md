# Product Requirements Document (PRD) - StashTracker

## 1. Product Overview
StashTracker is a lightweight, personal web application that enables Polish users to manually track everyday expenses and savings ("stashes") in PLN. Delivered as a single responsive website, it focuses on the core actions of adding or removing expenses and managing simple stash balances without bank integrations or import/export features. The goal is to help users maintain visibility over their discretionary spending and savings progress with minimal friction.

## 2. User Problem
Many individuals struggle to stay aware of how much money they truly spend or save each month because existing finance apps are either overly complex, require integrations, or are mobile-only. Polish users looking for a simple, browser-based tool need:
- A quick way to record expenses immediately after purchase.
- A simple stash concept for earmarked savings goals.
- Clarity on monthly spending against a self-defined budget.
- Assurance that their financial data remains private and can be removed at any time.

## 3. Functional Requirements
- Responsive web interface usable on desktop and mobile browsers.
- User accounts with password-based registration, login, and email password reset.
- Single-currency support limited to PLN.
- Stash management:
  - Create and remove stashes.
  - Add funds and remove funds transactions, each with optional description
  - Remove transactions
- Expense management:
  - Set a monthly budget
  - Add expenses with amount and optional description
  - Categories expenses based on hardcoded categories
  - Remove expenses
- Transaction history per stash and overall expense list
- Account deletion that permanently removes all associated user data

## 4. Product Boundaries
In Scope
- Web-only, responsive UI
- Manual entry of expenses and stash transactions
- Hardcoded expense categories
- Single currency: PLN
- Secure authentication and password reset
- Data deletion on account removal


Out of Scope (Deferred or Excluded)
- Native mobile applications
- Receipt scanning or OCR
- CSV/Excel import or export
- Bank, broker, or crypto integrations
- Multi-currency support and FX
- Social sharing or collaborative budgeting
- Guided onboarding flows or tooltips
- Advanced analytics dashboards beyond MAU

## 5. User Stories
ID: US-001
Title: User registration
Description: As a visitor, I want to create an account with email and password so that my data is private and persistent.
Acceptance Criteria:
1. Registration form collects email and password.
2. Password must meet minimum strength rules.
3. After successful registration, user is logged in and redirected to dashboard.
4. Password is stored using a strong hashing algorithm in the database.

ID: US-002
Title: User login
Description: As a registered user, I want to log in with my credentials so that I can access my data on any device.
Acceptance Criteria:
1. Login form accepts registered email and password.
2. Correct credentials establish a session and redirect to dashboard.
3. Incorrect credentials show an error without revealing which field is wrong.

ID: US-003
Title: Password reset
Description: As a user who forgot my password, I want to reset it via email so that I can regain access.
Acceptance Criteria:
1. Forgot-password flow sends a time-limited reset link to the registered email.
2. Link opens secure form to set a new password.
3. After reset, old sessions are revoked and user can log in with new password.

ID: US-004
Title: Create stash
Description: As a logged-in user, I want to create a new stash with a name so that I can separate savings goals.
Acceptance Criteria:
1. Create stash form requires a non-empty name.
2. Stash is created with zero balance in PLN.
3. Newly created stash appears in dashboard list.

ID: US-005
Title: Remove stash
Description: As a user, I want to delete a stash I no longer need so that my list stays relevant.
Acceptance Criteria:
1. Delete action asks for confirmation.
2. Upon confirmation, stash and its transactions are removed or marked deleted.
3. Dashboard no longer shows the stash.

ID: US-006
Title: Add funds to stash
Description: As a user, I want to add money to a stash so that my balance reflects new savings or interest.
Acceptance Criteria:
1. Form requires positive amount and optional description.
2. Transaction is recorded with type deposit and timestamp.
3. Stash balance increases accordingly.

ID: US-007
Title: Remove funds from stash
Description: As a user, I want to withdraw money from a stash so that I can use the funds elsewhere.
Acceptance Criteria:
1. Form requires positive amount ≤ current balance.
2. Transaction type withdrawal recorded with timestamp.
3. Stash balance decreases accordingly.

ID: US-008
Title: Delete transaction
Description: As a user, I want the ability to delete any stash transaction so that I can correct mistakes.
Acceptance Criteria:
1. Delete option visible on each transaction.
2. Balance recalculates after deletion.
3. Deletion logged for MAU counting if applicable.

ID: US-009
Title: View stash overview
Description: As a user, I want to see each stash balance and recent transactions so that I know my savings status.
Acceptance Criteria:
1. Dashboard lists all stashes with current balance.
2. Clicking a stash shows chronological transaction list.
3. Deleted transactions are either hidden or labeled deleted.

ID: US-010
Title: Set monthly budget
Description: As a user, I want to set a monthly spending quota for a given month so that I can track overspending.
Acceptance Criteria:
1. The page lets user enter a positive PLN amount for a specific month.
2. Remaining budget updates as expenses are added/removed.
3. Setting can be changed at any time and applies prospectively.

ID: US-011
Title: Add expense
Description: As a user, I want to record an expense with category and amount so that I track my spending. The expense is accounted on a given month.
Acceptance Criteria:
1. Form requires positive amount and selection from hardcoded categories.
2. Expense is saved with timestamp and optional note.
3. Monthly budget remaining amount updates immediately.

ID: US-012
Title: Remove expense
Description: As a user, I want to delete an incorrectly entered expense so that my records stay accurate.
Acceptance Criteria:
1. Delete action available per expense.
2. Deletion updates budget remaining and hides or marks the expense.

ID: US-013
Title: View expense summary
Description: As a user, I want a list of recent expenses and category totals so that I understand spending patterns.
Acceptance Criteria:
1. Expenses page lists expenses with filters by date.
2. Category totals for current month are displayed.
3. Totals exclude deleted expenses.

ID: US-014
Title: Delete account
Description: As a user, I want to permanently delete my account and all data so that I retain control of my privacy.
Acceptance Criteria:
1. Delete account action requires entering password and confirmation.
2. All user records, stashes, expenses, and transactions are removed from storage.
3. User is logged out and cannot log back in.

ID: US-015
Title: Responsive interface
Description: As a user on desktop or mobile, I want the UI to adapt to my screen so that the app is easy to use anywhere.
Acceptance Criteria:
1. Layout reflows for viewport widths from 380 px to 1920 px without horizontal scroll.
2. Primary actions remain easily tappable on mobile.
3. All functional tests pass on latest Chrome, Safari, and Firefox.


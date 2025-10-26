# View Implementation Plan: Budget

## 1. Overview

The Budget view enables users to set and manage their monthly spending budgets. The primary functionality includes setting/updating a budget for the current month via an UPSERT pattern and viewing a history of past monthly budgets. The view displays the budget amount, current balance (budget minus expenses), and allows users to modify their budget at any time.

## 2. View Routing

- **Path**: `/app/budget`
- **Layout**: Uses `AppLayout` (authenticated layout with navigation)
- **Prerender**: `false` (requires authentication check)

## 3. Component Structure

```
BudgetPage (Astro)
└── AppLayout
    ├── SetBudgetForm (React)
    │   ├── Card (shadcn/ui)
    │   │   ├── MonthSelector (React)
    │   │   ├── Input (amount field)
    │   │   ├── CurrentBudgetDisplay (React)
    │   │   └── Button (submit)
    │   └── Alert (error display)
    └── BudgetHistoryList (React)
        ├── Card (shadcn/ui)
        └── BudgetHistoryItem[] (React)
```

## 4. Component Details

### 4.1 BudgetPage (Astro)

- **Component description**: Main page component that serves as the container for the Budget view. Handles server-side authentication checks and renders the layout with React components.
- **Main elements**: `AppLayout` wrapper, page title heading, `SetBudgetForm`, `BudgetHistoryList`
- **Handled interactions**: None (static Astro component)
- **Handled validation**: Server-side authentication check (redirects to `/login` if not authenticated)
- **Types**: None specific
- **Props**: None

### 4.2 SetBudgetForm (React)

- **Component description**: Interactive form for setting/updating monthly budget. Displays current budget info and provides inputs for month selection and budget amount. Uses UPSERT pattern via PUT request.
- **Main elements**: Card wrapper, MonthSelector, Label/Input for amount, CurrentBudgetDisplay, Alert for errors, Button for submission
- **Handled interactions**: Month selection change, budget amount input change, form submission, fetches current budget on mount and month change
- **Handled validation**: Budget amount must be positive number (> 0), valid decimal, year-month format YYYY-MM, month between 01-12
- **Types**: `SetBudgetFormProps: { onSuccess?: () => void }`, `MonthBudgetDTO`, `UpsertBudgetCommand`, `ErrorResponse`, `ValidationErrorResponse`
- **Props**: `onSuccess?: () => void` - callback after successful upsert

### 4.3 MonthSelector (React)

- **Component description**: Dropdown for choosing year-month. Defaults to current month, allows selection within reasonable range (12 months past to 12 months future).
- **Main elements**: Label, select element, option elements
- **Handled interactions**: Month selection change triggers parent callback
- **Handled validation**: Selected value must match YYYY-MM format, month must be 01-12
- **Types**: `MonthSelectorProps: { value: string; onChange: (value: string) => void; disabled?: boolean }`
- **Props**: `value: string`, `onChange: (value: string) => void`, `disabled?: boolean`

### 4.4 CurrentBudgetDisplay (React)

- **Component description**: Read-only display showing current budget info for selected month (budget amount, total expenses, remaining balance). Visual feedback with color coding.
- **Main elements**: Container div, budget amount display, current balance display, visual indicators
- **Handled interactions**: None (read-only)
- **Handled validation**: None
- **Types**: `CurrentBudgetDisplayProps: { budget: MonthBudgetDTO | null; isLoading: boolean }`
- **Props**: `budget: MonthBudgetDTO | null`, `isLoading: boolean`

### 4.5 BudgetHistoryList (React)

- **Component description**: Displays paginated list of past monthly budgets in reverse chronological order. Includes pagination controls.
- **Main elements**: Card wrapper, CardHeader, CardContent with loading/empty states, list of BudgetHistoryItem components, pagination controls
- **Handled interactions**: Initial data fetch on mount, pagination navigation, optional year filter, refresh after budget update
- **Handled validation**: None (read-only)
- **Types**: `BudgetHistoryListProps: { refreshTrigger?: number }`, `ApiPaginatedResponse<MonthBudgetListItemDTO>`, `ListBudgetsQuery`
- **Props**: `refreshTrigger?: number` - triggers data refresh when changed

### 4.6 BudgetHistoryItem (React)

- **Component description**: Individual list item displaying single month's budget info (month, budget amount, current balance).
- **Main elements**: Container div/li, month display, budget amount, current balance, visual indicators
- **Handled interactions**: None (read-only)
- **Handled validation**: None
- **Types**: `BudgetHistoryItemProps: { budget: MonthBudgetListItemDTO }`
- **Props**: `budget: MonthBudgetListItemDTO`

## 5. Types

All required types already exist in `src/types.ts`:

- **`MonthBudgetDTO`**: `Omit<MonthBudget, "deleted_at" | "user_id">` - Contains `id`, `year_month`, `budget_set`, `current_balance`, `created_at`, `updated_at`
- **`MonthBudgetListItemDTO`**: Alias for `MonthBudgetDTO`
- **`UpsertBudgetCommand`**: `Pick<TablesInsert<"month_budget">, "budget_set">` - Contains `budget_set: number`
- **`ListBudgetsQuery`**: Contains `page`, `limit`, `year?`, `order`
- **`ApiPaginatedResponse<T>`**: Contains `data: T[]`, `pagination: { page, limit, total }`
- **`ErrorResponse`**: Contains `error`, `message?`, `details?`
- **`ValidationErrorResponse`**: Extends `ErrorResponse` with `errors: Record<string, string[]>`

No new types required.

## 6. State Management

### 6.1 SetBudgetForm State (local component state)

- `selectedMonth: string` - Current year-month (YYYY-MM), initial: current month
- `budgetAmount: string` - Budget input value, initial: empty or current budget
- `currentBudget: MonthBudgetDTO | null` - Current budget data, fetched on mount/month change
- `isLoadingCurrent: boolean` - Loading state for current budget fetch
- `isSubmitting: boolean` - Form submission state, disables inputs
- `error: string | null` - General error message
- `fieldErrors: Record<string, string>` - Field-specific validation errors

### 6.2 BudgetHistoryList State (local component state)

- `budgets: MonthBudgetListItemDTO[]` - Budget history items
- `pagination: { page, limit, total }` - Pagination metadata
- `currentPage: number` - Current page number
- `selectedYear: string | undefined` - Optional year filter
- `isLoading: boolean` - Loading state for list fetch
- `error: string | null` - Error message for fetch failures

Uses local React state with `useState` hooks. No global state or custom hooks required.

## 7. API Integration

### 7.1 GET /api/month-budgets

**Purpose**: Fetch paginated list of monthly budgets

**Request**:
- Method: GET
- URL: `/api/month-budgets?page={page}&limit={limit}&year={year}&order={order}`
- Query: `page?`, `limit?`, `year?`, `order?`

**Response Types**:
- 200: `ApiPaginatedResponse<MonthBudgetListItemDTO>`
- 400: `ValidationErrorResponse`
- 401: `ErrorResponse`
- 500: `ErrorResponse`

**Usage**: `BudgetHistoryList` - fetches on mount and pagination changes

**Error Handling**: 401 → redirect to `/login`, 400 → display validation error, 500 → generic error

### 7.2 PUT /api/month-budgets/{yearMonth}

**Purpose**: Create or update monthly budget (UPSERT)

**Request**:
- Method: PUT
- URL: `/api/month-budgets/{yearMonth}`
- Headers: `Content-Type: application/json`
- Path: `yearMonth: string` (YYYY-MM)
- Body: `UpsertBudgetCommand` - `{ "budget_set": 5000.00 }`

**Response Types**:
- 201: `{ data: MonthBudgetDTO }` - created
- 200: `{ data: MonthBudgetDTO }` - updated
- 400: `ValidationErrorResponse`
- 401: `ErrorResponse`
- 422: `ValidationErrorResponse`
- 500: `ErrorResponse`

**Usage**: `SetBudgetForm` - submits on form submission

**Error Handling**: 401 → redirect, 400/422 → field errors, 500 → generic error

## 8. User Interactions

### 8.1 Setting/Updating Monthly Budget

1. User selects month from MonthSelector
2. Component fetches and displays current budget
3. User enters budget amount
4. User clicks "Set Budget"
5. Client-side validation runs
6. PUT request sent, form disabled during submission
7. On success: confirmation, display updates, history refreshes
8. On error: error message displayed, form remains editable

### 8.2 Viewing Budget History

1. Component loads on mount
2. API fetches first page (12 items, desc order)
3. Loading state shows spinner
4. On success: items render with pagination
5. On error: error message with retry

### 8.3 Navigating Pages

1. User clicks pagination button
2. State updates, new API call
3. Loading state during fetch
4. List updates with new page

### 8.4 Filtering by Year (optional)

1. User selects year from filter
2. State updates, resets to page 1
3. API call with year filter
4. List shows filtered results

### 8.5 Changing Selected Month

1. User selects different month
2. State updates
3. Fetches current budget for new month
4. Display updates with new data

## 9. Conditions and Validation

### 9.1 Form-Level Validation

- Budget amount must be positive number > 0 (client + server)
- Year-month must be YYYY-MM format (server)
- Month must be 01-12 (server)
- Submit button disabled if amount empty/invalid
- Error messages displayed below inputs with red styling

### 9.2 Input Field Validation

**Budget Amount**: `type="number"`, `step="0.01"`, `min="0.01"`, `required`
- Client checks: not empty, valid number, > 0, max 2 decimals
- Error display: below input with red text
- Disabled during submission

**Month Selector**: Only valid YYYY-MM values, disabled during submission, defaults to current month

### 9.3 Loading and Disabled States

- During submission: all inputs disabled, button shows "Saving..."
- During budget fetch: display shows loading skeleton
- During history fetch: list shows loading skeleton, pagination disabled

### 9.4 Empty States

- No current budget: "No budget set for this month"
- No history: "You haven't set any budgets yet. Start by setting a budget for the current month."

### 9.5 Authentication

- User must be authenticated (server-side check)
- Unauthenticated → redirect to `/login`
- API 401 → client redirect

## 10. Error Handling

### 10.1 Network Errors
- Catch fetch errors, display "Unable to connect. Please check your internet connection."
- Provide retry button

### 10.2 Authentication Errors (401)
- Detect 401, immediately redirect to `/login`

### 10.3 Validation Errors (400, 422)
- Parse `ValidationErrorResponse`, display field-specific errors below inputs
- Display general error in Alert if no field errors

### 10.4 Server Errors (500)
- Display "Something went wrong. Please try again later."
- Provide retry button, log to console

### 10.5 Empty Response
- Display appropriate empty state messages
- Provide actionable guidance

### 10.6 Invalid Response Format
- Validate response structure, use type guards
- Display generic error if invalid, log details

### 10.7 Race Conditions
- Cancel previous fetch with AbortController
- Only process most recent request

### 10.8 Concurrent Updates
- Disable submit during submission
- API handles with UPSERT logic

## 11. Implementation Steps

### Step 1: Create Budget Page (Astro)
- Create `src/pages/app/budget.astro`
- Import AppLayout, add auth check, set prerender false
- Create page structure with heading and component placeholders
- Add navigation link in AppLayout header

### Step 2: Create MonthSelector Component
- Create `src/components/budget/MonthSelector.tsx`
- Define props interface, implement select with month options
- Generate 12 months past to 12 future, format as "Month YYYY"
- Add labels and ARIA attributes, style with Tailwind

### Step 3: Create CurrentBudgetDisplay Component
- Create `src/components/budget/CurrentBudgetDisplay.tsx`
- Define props, implement loading/empty/data states
- Display budget amount and balance with PLN formatting
- Add color coding and icons, style with Card components

### Step 4: Create SetBudgetForm Component
- Create `src/components/budget/SetBudgetForm.tsx`
- Define props and state variables
- Implement useEffect for fetching current budget
- Implement form submission handler with validation and error handling
- Build form JSX with Card, MonthSelector, Input, CurrentBudgetDisplay, Alert, Button
- Add ARIA attributes and Tailwind styling

### Step 5: Create BudgetHistoryItem Component
- Create `src/components/budget/BudgetHistoryItem.tsx`
- Define props, implement display with month formatting
- Display budget and balance with PLN formatting and color coding
- Style as list item with Tailwind

### Step 6: Create BudgetHistoryList Component
- Create `src/components/budget/BudgetHistoryList.tsx`
- Define props and state variables
- Implement useEffect for fetching budget list
- Implement pagination handlers
- Build JSX with Card, loading/empty states, BudgetHistoryItem list, pagination
- Style with Tailwind and shadcn/ui

### Step 7: Integrate Components in Budget Page
- Import SetBudgetForm and BudgetHistoryList in budget.astro
- Pass refreshTrigger prop from SetBudgetForm to BudgetHistoryList
- Add page heading and layout structure
- Test authentication redirect

### Step 8: Add Navigation Link
- Update AppLayout.astro header navigation
- Add "Budget" link to `/app/budget`
- Style consistently with existing nav links

### Step 9: Testing and Refinement
- Test form submission (create and update scenarios)
- Test validation (client and server errors)
- Test pagination and filtering
- Test empty states and loading states
- Test authentication redirect
- Test responsive design on mobile/desktop
- Test accessibility (keyboard navigation, screen readers)

### Step 10: Polish and Documentation
- Refine error messages for clarity
- Ensure consistent styling across components
- Add JSDoc comments to components
- Update project documentation if needed

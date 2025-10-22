# View Implementation Plan: Stash Detail

## 1. Overview

This document outlines the implementation plan for the **Stash Detail** view. This view serves as the primary interface for managing a single savings stash. It provides users with a detailed look at a stash's balance and a complete, paginated history of all its transactions. Key functionalities include adding funds (deposits), withdrawing funds, and deleting individual transactions, with appropriate user confirmation for destructive actions.

## 2. View Routing

- **Path**: `/app/stashes/[id].astro`
- **Description**: This will be a dynamic Astro page that captures the `id` of the stash from the URL. It will use the `AppLayout` and render the client-side React components responsible for displaying the stash details.

## 3. Component Structure

The view will be composed of an Astro page that orchestrates several React components. The hierarchy is as follows:

```mermaid
graph TD
    A[AppLayout.astro] --> B(StashDetailPage.astro);
    B --> C{StashDetailView.tsx (Client-side Root)};
    C --> D[StashDetailHeader.tsx];
    C --> E[TransactionList.tsx];
    E --> F[TransactionListItem.tsx];
    E --> G[PaginationControls.tsx];

    subgraph Stash Detail Page (`/app/stashes/[id].astro`)
        B
    end

    subgraph Client-side Components
        C
        D
        E
        F
        G
    end
```

## 4. Component Details

### `StashDetailPage.astro`

- **Component Description**: The server-side entry point for the view. It validates the stash ID from the URL, fetches the initial stash data to prevent layout shifts, and renders the main client-side React component (`StashDetailView`).
- **Main Elements**: 
    - `<AppLayout>`: Wraps the page content.
    - `<StashDetailView client:load>`: The root React component, hydrated on the client.
- **Handled Interactions**: None (server-side rendering).
- **Props**:
    - `initialStashData`: `StashDetailsViewModel` - Passes the initially fetched stash data to the React component to avoid a client-side fetch on the first load.

### `StashDetailView.tsx` (New)

- **Component Description**: The main client-side component that manages the state for the entire view, including the stash details and the list of transactions. It orchestrates data fetching and updates between the header and the transaction list.
- **Main Elements**:
    - `<StashDetailHeader />`
    - `<TransactionList />`
- **Handled Interactions**: Manages state updates triggered by child components (e.g., refreshing data after a new transaction is added).
- **Props**:
    - `initialStashData`: `StashDetailsViewModel`
    - `stashId`: `string`

### `StashDetailHeader.tsx` (New)

- **Component Description**: Displays the stash's name, current balance, and provides primary actions like adding or withdrawing funds.
- **Main Elements**:
    - `h1`: Stash name.
    - `p`: Current balance, formatted as PLN currency.
    - `Button` (Shadcn): "Add Funds" - Opens a modal to create a 'deposit' transaction.
    - `Button` (Shadcn): "Withdraw" - Opens a modal to create a 'withdrawal' transaction.
- **Handled Interactions**:
    - Clicking "Add Funds" or "Withdraw" opens the `AddTransactionDialog`.
- **Validation Conditions**: The "Withdraw" button could be disabled if the `current_balance` is zero.
- **Types**: `StashDetailsViewModel`
- **Props**:
    - `stash`: `StashDetailsViewModel`
    - `onTransactionSuccess`: `() => void` (callback to refresh data).

### `TransactionList.tsx` (New)

- **Component Description**: Fetches and displays a paginated list of transactions for the current stash. It handles loading states, empty states, and pagination.
- **Main Elements**:
    - A container `div` for the list.
    - Maps over the transactions and renders a `TransactionListItem` for each.
    - A skeleton loader component during data fetching.
    - An empty state message if no transactions exist.
    - `<PaginationControls />` for navigating between pages.
- **Handled Interactions**:
    - Page changes via the pagination component trigger a refetch of the transaction data for the new page.
- **Types**: `TransactionListItemViewModel`, `ApiPaginatedResponse<StashTransactionDTO>`
- **Props**:
    - `stashId`: `string`

### `TransactionListItem.tsx` (New)

- **Component Description**: Renders a single transaction row, showing its type (deposit/withdrawal), amount, description, and creation date. It also includes an action to delete the transaction.
- **Main Elements**:
    - `div` or `li` as the list item container.
    - Icon indicating deposit (e.g., arrow up) or withdrawal (e.g., arrow down).
    - `span` for the transaction amount, colored green for deposits and red for withdrawals.
    - `p` for the optional description.
    - `time` for the transaction date.
    - `DropdownMenu` (Shadcn) with a "Delete" option.
- **Handled Interactions**:
    - Clicking the "Delete" option opens a `ConfirmationDialog`.
    - On confirmed deletion, it calls the delete API and notifies the parent to refresh the list.
- **Types**: `TransactionListItemViewModel`
- **Props**:
    - `transaction`: `TransactionListItemViewModel`
    - `onDeleteSuccess`: `() => void`

## 5. Types

### DTOs (from `src/types.ts`)
- **`StashDetailsDTO`**: The data structure for a single stash returned from `GET /api/stashes/{stashId}`.
- **`StashTransactionDTO`**: The data structure for a single transaction.
- **`ApiPaginatedResponse<StashTransactionDTO>`**: The wrapped response for paginated transaction lists.

### ViewModel Types (New)

These types will be defined within their respective components or in a shared `*.types.ts` file inside the component directory.

- **`StashDetailsViewModel`**: For the `StashDetailHeader`.
  ```typescript
  interface StashDetailsViewModel {
    id: string;
    name: string;
    currentBalanceFormatted: string; // e.g., "1,234.56 zł"
    createdAt: string; // Formatted date, e.g., "October 23, 2025"
  }
  ```

- **`TransactionListItemViewModel`**: For the `TransactionListItem`.
  ```typescript
  interface TransactionListItemViewModel {
    id: string;
    type: 'deposit' | 'withdrawal';
    amountFormatted: string; // e.g., "+100.00 zł" or "-50.00 zł"
    description: string | null;
    createdAtFormatted: string; // e.g., "October 23, 2025, 10:00 AM"
  }
  ```

## 6. State Management

State will be managed using React hooks within the client-side components.

- **`useStashDetail` (Custom Hook - New)**: This hook will be the primary state manager for the view. It will be used inside `StashDetailView.tsx`.
    - **Purpose**: To fetch and manage the state of the stash details and handle data refreshing.
    - **State Variables**:
        - `stash`: `StashDetailsViewModel | null`
        - `isLoading`: `boolean`
        - `error`: `Error | null`
    - **Functions**:
        - `fetchStash()`: Fetches the latest stash details from the API.
        - `refreshData()`: A callback function that can be passed down to children to trigger a refetch of all view data (both stash details and the transaction list).

- **`useStashTransactions` (Custom Hook - New)**: This hook will manage the paginated transaction data.
    - **Purpose**: To fetch, paginate, and manage the state of the transaction list.
    - **State Variables**:
        - `transactions`: `TransactionListItemViewModel[]`
        - `pagination`: `{ page: number; limit: number; total: number; }`
        - `isLoading`: `boolean`
        - `error`: `Error | null`
    - **Functions**:
        - `setPage(page: number)`: Sets the current page and triggers a refetch of transactions for that page.

## 7. API Integration

- **Fetch Stash Details**:
    - **Endpoint**: `GET /api/stashes/{stashId}`
    - **Action**: The `useStashDetail` hook will call this endpoint on initial component mount.
    - **Response Type**: `{ data: StashDetailsDTO }`

- **Fetch Transactions**:
    - **Endpoint**: `GET /api/stashes/{stashId}/transactions?page={page}&limit={limit}`
    - **Action**: The `useStashTransactions` hook will call this endpoint.
    - **Response Type**: `ApiPaginatedResponse<StashTransactionDTO>`

- **Add Transaction**:
    - **Endpoint**: `POST /api/stashes/{stashId}/transactions`
    - **Action**: Triggered from the `AddTransactionDialog`.
    - **Request Type**: `CreateStashTransactionCommand`

- **Delete Transaction**:
    - **Endpoint**: `DELETE /api/stashes/{stashId}/transactions/{transactionId}`
    - **Action**: Triggered from the `TransactionListItem` after confirmation.
    - **Note**: This endpoint needs to be created.

## 8. User Interactions

- **Adding Funds**: User clicks "Add Funds" -> `AddTransactionDialog` opens with type preset to 'deposit' -> User submits form -> `POST` request is made -> On success, the dialog closes, a success toast is shown, and the stash balance and transaction list are refreshed.
- **Withdrawing Funds**: Same as above, but for 'withdrawal'. The form should validate that the withdrawal amount does not exceed the current balance.
- **Deleting a Transaction**: User clicks "Delete" on a transaction item -> `ConfirmationDialog` appears -> User confirms -> `DELETE` request is made -> On success, the dialog closes, a success toast is shown, and the transaction list and stash balance are refreshed.
- **Navigating Pages**: User clicks a page number or next/previous button in `<PaginationControls />` -> `useStashTransactions` hook fetches the corresponding page of data.

## 9. Conditions and Validation

- **Stash ID**: The Astro page (`[id].astro`) must validate that the `id` parameter from the URL is a valid UUID. If not, it should render a 404 page.
- **Withdrawal Amount**: The `AddTransactionDialog` form must validate that the withdrawal amount is a positive number and is less than or equal to the stash's `current_balance`.
- **Ownership**: All API calls are protected by middleware and RLS policies, ensuring users can only view or modify their own stashes and transactions.

## 10. Error Handling

- **Not Found (404)**: If `GET /api/stashes/{stashId}` returns a 404, the Astro page should redirect to a generic 404 page. If it happens on the client, the view should display a "Stash not found" message.
- **API Server Errors (500)**: If any API call fails, a generic error message should be displayed within the relevant component (e.g., "Could not load transactions"), and a toast notification can provide additional context.
- **Validation Errors (400/422)**: Form validation errors from the API should be displayed as inline error messages next to the relevant form fields.
- **Insufficient Balance (403)**: If a withdrawal fails due to insufficient funds, the form should display a specific error message like "Withdrawal amount cannot exceed the current balance."

## 11. Implementation Steps

1.  **Create API Endpoint for Deletion**: Create a new file `src/pages/api/stashes/[stashId]/transactions/[transactionId].ts` to handle `DELETE` requests. Implement the logic to call the `softDeleteTransaction` service function.

2.  **Create Astro Page**: Create the file `src/pages/app/stashes/[id].astro`. Implement server-side logic to get the `id` from `Astro.params`, validate it, and fetch initial stash data using the `getStashDetails` service.

3.  **Create Root React Component**: Create `src/components/stashes/StashDetailView.tsx`. This component will receive the `initialStashData` and `stashId` as props and will be responsible for orchestrating the child components.

4.  **Implement Custom Hooks**:
    - Create `src/components/hooks/useStashDetail.ts` to manage fetching and refreshing the main stash data.
    - Create `src/components/hooks/useStashTransactions.ts` to handle fetching and paginating the transaction list.

5.  **Develop UI Components**:
    - Create `src/components/stashes/StashDetailHeader.tsx` to display the stash name, balance, and action buttons.
    - Create `src/components/stashes/TransactionList.tsx` to display the list of transactions, including loading and empty states.
    - Create `src/components/stashes/TransactionListItem.tsx` for rendering individual transaction details and the delete action.

6.  **Integrate Dialogs**:
    - Create or reuse an `AddTransactionDialog` component that can be triggered from the `StashDetailHeader` for both deposits and withdrawals.
    - Reuse the existing `DeleteStashDialog` or a similar `ConfirmationDialog` for the delete transaction action.

7.  **Styling and Final Touches**: Apply TailwindCSS classes for styling, ensure responsiveness, and add ARIA attributes for accessibility.

8.  **Testing**: Manually test all user interactions, including adding, withdrawing, deleting transactions, and pagination. Verify that error states are handled gracefully.


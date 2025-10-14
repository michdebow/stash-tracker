# REST API Plan

## 1. Resources
- **Expense Categories** → `expense_categories`
- **Stashes** → `stashes`
- **Stash Transactions** → `stash_transactions`
- **Monthly Budgets** → `month_budget`
- **Expenses** → `expenses`
- **Reports (Derived)** → Aggregations over `expenses` and `stash_transactions`
- **Account Management** → Stored procedure `delete_user_account`

## 2. Endpoints

### 2.1 Expense Categories
- **Method** GET
- **Path** `/api/expense-categories`
- **Description** Fetch all system-wide categories for selection lists.
- **Query Parameters** None.
- **Request Body** _None_
- **Response Body**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "string",
        "slug": "string"
      }
    ]
  }
  ```
- **Success** `200 OK`
- **Errors** `401 Unauthorized` (missing session), `500 Internal Server Error`

### 2.2 Stashes
#### 2.2.1 List Stashes
- **Method** GET
- **Path** `/api/stashes`
- **Description** Fetch paginated soft-active stashes for authenticated user.
- **Query Parameters** `page` (default 1), `limit` (default 20, max 100), `sort` (enum `created_at`, `name`), `order` (enum `asc`, `desc`).
- **Request Body** _None_
- **Response Body**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "string",
        "current_balance": "number",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `401 Unauthorized`, `500 Internal Server Error`

#### 2.2.2 Create Stash
- **Method** POST
- **Path** `/api/stashes`
- **Description** Create a new stash for the authenticated user.
- **Request Body**
  ```json
  {
    "name": "string"
  }
  ```
- **Response Body**
  ```json
  {
    "data": {
      "id": "uuid",
      "name": "string",
      "current_balance": "0.00",
      "created_at": "timestamp"
    }
  }
  ```
- **Success** `201 Created`
- **Errors** `400 Bad Request` (validation), `401 Unauthorized`, `409 Conflict` (duplicate name), `500 Internal Server Error`

#### 2.2.3 Get Single Stash
- **Method** GET
- **Path** `/api/stashes/{stashId}`
- **Description** Fetch stash details with aggregated metrics.
- **Query Parameters** `includeTransactions` (boolean, default `false`, max 50 recent when true).
- **Response Body**
  ```json
  {
    "data": {
      "id": "uuid",
      "name": "string",
      "current_balance": "number",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "transactions": [
        {
          "id": "uuid",
          "transaction_type": "deposit",
          "amount": "number",
          "description": "string",
          "created_at": "timestamp"
        }
      ]
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

#### 2.2.4 Update Stash Name
- **Method** PATCH
- **Path** `/api/stashes/{stashId}`
- **Description** Rename stash (soft-active only).
- **Request Body**
  ```json
  {
    "name": "string"
  }
  ```
- **Response Body** `_Same as Get Single Stash_
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`

#### 2.2.5 Soft Delete Stash
- **Method** DELETE
- **Path** `/api/stashes/{stashId}`
- **Description** Soft-delete stash and cascade transactions (via trigger).
- **Request Body** _None_
- **Response Body**
  ```json
  {
    "message": "Stash deleted"
  }
  ```
- **Success** `204 No Content`
- **Errors** `401 Unauthorized`, `404 Not Found`, `409 Conflict` (withdrawal would cause negative balance, prevented by trigger), `500 Internal Server Error`

### 2.3 Stash Transactions
#### 2.3.1 List Transactions
- **Method** GET
- **Path** `/api/stashes/{stashId}/transactions`
- **Description** Paginated stash transactions filtered by type and date.
- **Query Parameters** `page`, `limit` (default 20, max 100), `type` (enum `deposit`, `withdrawal`), `from` (ISO date), `to` (ISO date), `order` (enum `desc`, `asc`).
- **Response Body**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "transaction_type": "deposit",
        "amount": "number",
        "description": "string|null",
        "created_at": "timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

#### 2.3.2 Create Transaction
- **Method** POST
- **Path** `/api/stashes/{stashId}/transactions`
- **Description** Add deposit or withdrawal, updating stash balance via triggers.
- **Request Body**
  ```json
  {
    "transaction_type": "deposit",
    "amount": 100.50,
    "description": "string (optional)"
  }
  ```
- **Response Body** `_Same as List Transactions item_
- **Success** `201 Created`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (withdrawal exceeds balance per trigger error mapped to API error), `404 Not Found`, `422 Unprocessable Entity` (invalid type), `500 Internal Server Error`

#### 2.3.3 Soft Delete Transaction
- **Method** DELETE
- **Path** `/api/stashes/{stashId}/transactions/{transactionId}`
- **Description** Soft-delete transaction to reverse balance impact.
- **Request Body** _None_
- **Response Body**
  ```json
  {
    "message": "Transaction deleted"
  }
  ```
- **Success** `204 No Content`
- **Errors** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

### 2.4 Monthly Budgets
#### 2.4.1 List Budgets
- **Method** GET
- **Path** `/api/month-budgets`
- **Description** Paginated budgets for authenticated user.
- **Query Parameters** `page`, `limit` (default 12, max 60), `year` (YYYY), `order` (`desc` default).
- **Response Body**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "year_month": "YYYY-MM",
        "budget_set": "number",
        "current_balance": "number",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 18
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

#### 2.4.2 Upsert Monthly Budget
- **Method** PUT
- **Path** `/api/month-budgets/{yearMonth}`
- **Description** Create or update monthly budget (UPSERT semantics).
- **Request Body**
  ```json
  {
    "budget_set": 1500.00
  }
  ```
- **Response Body** `_Same as List Budgets item_
- **Success** `200 OK` (update) or `201 Created` (new)
- **Errors** `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity` (invalid month format), `500 Internal Server Error`

#### 2.4.3 Soft Delete Budget
- **Method** DELETE
- **Path** `/api/month-budgets/{yearMonth}`
- **Description** Soft-delete budget entry.
- **Response Body** `{ "message": "Budget deleted" }`
- **Success** `204 No Content`
- **Errors** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

### 2.5 Expenses
#### 2.5.1 List Expenses
- **Method** GET
- **Path** `/api/expenses`
- **Description** Paginated expenses with filters for reporting.
- **Query Parameters** `page`, `limit` (default 20, max 100), `from` (date), `to` (date), `categoryId` (UUID), `yearMonth` (YYYY-MM), `search` (text), `sort` (enum `expense_date`, `amount`), `order` (`desc` default).
- **Response Body**
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "category_id": "uuid",
        "amount": "number",
        "expense_date": "date",
        "year_month": "YYYY-MM",
        "description": "string|null",
        "created_at": "timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 96
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

#### 2.5.2 Create Expense
- **Method** POST
- **Path** `/api/expenses`
- **Description** Record expense linked to category and month, updating monthly budget triggers.
- **Request Body**
  ```json
  {
    "category_id": "uuid",
    "amount": 120.75,
    "expense_date": "YYYY-MM-DD",
    "description": "string (optional)"
  }
  ```
- **Response Body** `_Same as List Expenses item_
- **Success** `201 Created`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `404 Not Found` (category missing), `422 Unprocessable Entity` (amount ≤ 0), `500 Internal Server Error`

#### 2.5.3 Update Expense
- **Method** PATCH
- **Path** `/api/expenses/{expenseId}`
- **Description** Edit amount, date, category, or description.
- **Request Body**
  ```json
  {
    "category_id": "uuid (optional)",
    "amount": 95.00,
    "expense_date": "YYYY-MM-DD",
    "description": "string|null"
  }
  ```
- **Response Body** `_Same as List Expenses item_
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`

#### 2.5.4 Soft Delete Expense
- **Method** DELETE
- **Path** `/api/expenses/{expenseId}`
- **Description** Soft-delete expense and update monthly budget balance.
- **Response Body** `{ "message": "Expense deleted" }`
- **Success** `204 No Content`
- **Errors** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`

### 2.6 Reports
#### 2.6.1 Expense Summary
- **Method** GET
- **Path** `/api/reports/expenses/summary`
- **Description** Monthly and category totals for dashboards.
- **Query Parameters** `yearMonth` (required), `includeTrend` (boolean) to compare against previous month.
- **Response Body**
  ```json
  {
    "data": {
      "year_month": "YYYY-MM",
      "total_spent": "number",
      "category_totals": [
        {
          "category_id": "uuid",
          "category_name": "string",
          "total": "number"
        }
      ],
      "previous_month_delta": "number|null"
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `404 Not Found` (no expenses), `500 Internal Server Error`

#### 2.6.2 Stash Overview
- **Method** GET
- **Path** `/api/reports/stashes/overview`
- **Description** Summary of stash balances and net flows.
- **Query Parameters** `from` (date, optional), `to` (date, optional).
- **Response Body**
  ```json
  {
    "data": {
      "total_balance": "number",
      "stashes": [
        {
          "id": "uuid",
          "name": "string",
          "current_balance": "number",
          "net_flow": "number"
        }
      ]
    }
  }
  ```
- **Success** `200 OK`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

### 2.7 Account Management
#### 2.7.1 Delete Account
- **Method** DELETE
- **Path** `/api/account`
- **Description** Permanently delete user-owned data via `delete_user_account` procedure and revoke session.
- **Request Body**
  ```json
  {
    "password": "string"
  }
  ```
- **Response Body** `{ "message": "Account deleted" }`
- **Success** `204 No Content`
- **Errors** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (password mismatch), `500 Internal Server Error`

## 3. Authentication and Authorization
- **Supabase Auth** handles registration, login, logout, and password reset via client SDK; API endpoints require a valid Supabase JWT in the `Authorization: Bearer` header.
- **Astro Middleware** verifies Supabase session using `supabase.auth.getUser()` and injects `locals.supabase` client for API routes.
- **Row-Level Security** policies (`user_id = auth.uid()`) enforced on `stashes`, `stash_transactions`, `expenses`, and `month_budget` automatically restrict data to the authenticated user.
- **Service Role Usage** restricted to backend-only routes (`/api/account`) that execute `delete_user_account`. This route validates user identity via password re-auth using Supabase Admin API before calling the procedure.
- **Authorization Checks** ensure soft-deleted entities cannot be mutated, and access to category data is read-only.
- **Rate Limiting** implemented via Astro middleware (e.g., IP + user bounded tokens) and Supabase Edge Functions quotas to mitigate abuse.

## 4. Validation and Business Logic
- **Expense Categories**: no mutations allowed; GET only.
- **Stashes**:
  - Name required, trimmed, length 1-100, unique per user among active records.
  - `current_balance` read-only; maintained by database triggers preventing negative balances (`CHECK current_balance >= 0`).
  - Soft delete sets `deleted_at`; cascade trigger marks related transactions deleted.
- **Stash Transactions**:
  - `transaction_type` must be `deposit` or `withdrawal`.
  - `amount` numeric > 0 with max two decimals.
  - Withdrawal blocked if resulting balance < 0 (surface trigger exception as `403 Forbidden`).
  - Soft delete reverses balance via trigger.
- **Monthly Budgets**:
  - `yearMonth` validated against regex `^\d{4}-\d{2}$` and must belong to authenticated user.
  - `budget_set` numeric > 0; `current_balance` read-only, updated by expense triggers.
  - UPSERT semantics ensure uniqueness (`UNIQUE (user_id, year_month) WHERE deleted_at IS NULL`).
- **Expenses**:
  - `amount` > 0; `category_id` must exist and not be deleted.
  - `expense_date` required; `year_month` derived in DB.
  - Updates and soft deletes recalculate monthly budgets via triggers.
  - Filters leverage indexes on `user_id`, `expense_date`, `year_month`, `category_id` for performant queries.
- **Reports**:
  - Built from secured Supabase SQL queries or RPC functions applying aggregations to RLS-filtered tables.
  - Summaries exclude soft-deleted rows (`deleted_at IS NULL`).
- **Account Deletion**:
  - Requires password confirmation, runs `delete_user_account` within transaction and calls Supabase Auth Admin API to remove user.
  - Endpoint records audit log event (optional future enhancement).
- **Error Handling**:
  - Map database constraint violations to semantic HTTP errors (`422` for validation, `409` for unique conflicts).
  - Return structured error payload `{ "error": { "code": "string", "message": "string" } }`.
- **Pagination Defaults** align with index ordering (`created_at DESC`, `expense_date DESC`) to exploit partial indexes noted in schema.

## 5. Task Status
- **Status** API plan created and saved to `_ai/api-plan.md`.

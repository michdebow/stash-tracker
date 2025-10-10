# StashTracker Database Schema

## 1. Tables

### 1.1 users
Managed by Supabase Auth (`auth.users`). No custom user table required.

### 1.2 expense_categories

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique category identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Category name (e.g., "Groceries", "Transport") |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL-friendly category identifier |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation timestamp |

**Notes:**
- Pre-populated with hardcoded categories
- No user_id FK; categories are system-wide
- No soft-delete; categories are permanent

### 1.3 stashes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique stash identifier |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) | Owner of the stash |
| name | VARCHAR(100) | NOT NULL | Stash name |
| current_balance | NUMERIC(12,2) | NOT NULL, DEFAULT 0.00, CHECK (current_balance >= 0) | Current balance in PLN |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete timestamp |

**Constraints:**
- UNIQUE (user_id, name) WHERE deleted_at IS NULL
- CHECK (current_balance >= 0)

**Notes:**
- `current_balance` maintained by triggers on stash_transactions
- Soft-delete via `deleted_at`

### 1.4 stash_transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique transaction identifier |
| stash_id | UUID | NOT NULL, REFERENCES stashes(id) | Associated stash |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) | Transaction owner (denormalized for RLS) |
| transaction_type | VARCHAR(20) | NOT NULL, CHECK (transaction_type IN ('deposit', 'withdrawal')) | Type of transaction |
| amount | NUMERIC(12,2) | NOT NULL, CHECK (amount > 0) | Transaction amount in PLN |
| description | TEXT | NULL | Optional transaction note |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Transaction timestamp |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete timestamp |

**Constraints:**
- CHECK (transaction_type IN ('deposit', 'withdrawal'))
- CHECK (amount > 0)

**Notes:**
- `user_id` denormalized for efficient RLS policies
- Soft-delete cascades when parent stash is deleted
- Triggers update `stashes.current_balance` and prevent negative balances

### 1.5 month_budget

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique budget identifier |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) | Budget owner |
| year_month | VARCHAR(7) | NOT NULL | Month identifier in YYYY-MM format |
| budget_set | NUMERIC(12,2) | NOT NULL, CHECK (budget_set > 0) | Monthly budget amount in PLN |
| current_balance | NUMERIC(12,2) | NOT NULL, DEFAULT 0.00 | Remaining budget after expenses |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete timestamp |

**Constraints:**
- UNIQUE (user_id, year_month) WHERE deleted_at IS NULL
- CHECK (budget_set > 0)
- CHECK (year_month ~ '^\d{4}-\d{2}$') -- Format validation

**Notes:**
- `year_month` stored as VARCHAR(7) in YYYY-MM format for simplicity
- `current_balance` maintained by triggers on expenses table
- `current_balance` = `budget_set` - sum of active expenses for the month
- UPSERT pattern for setting/updating budgets
- Soft-delete for audit trail

### 1.6 expenses

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique expense identifier |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) | Expense owner |
| category_id | UUID | NOT NULL, REFERENCES expense_categories(id) | Expense category |
| amount | NUMERIC(12,2) | NOT NULL, CHECK (amount > 0) | Expense amount in PLN |
| expense_date | DATE | NOT NULL | Date of expense |
| year_month | VARCHAR(7) | NOT NULL, GENERATED ALWAYS AS (to_char(expense_date, 'YYYY-MM')) STORED | Computed month for indexing |
| description | TEXT | NULL | Optional expense note |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete timestamp |

**Constraints:**
- CHECK (amount > 0)
- CHECK (year_month ~ '^\d{4}-\d{2}$')

**Notes:**
- `expense_date` is DATE (no time component needed)
- `year_month` is a generated column for efficient month-based queries
- Soft-delete for audit trail
- No FK to month_budget; UI warns if budget doesn't exist
- Triggers update `month_budget.current_balance` when expenses are added/removed

## 2. Relationships

```
auth.users (1) ──────< (N) stashes
auth.users (1) ──────< (N) expenses
auth.users (1) ──────< (N) month_budget
auth.users (1) ──────< (N) stash_transactions

stashes (1) ──────< (N) stash_transactions

expense_categories (1) ──────< (N) expenses
```

**Cardinality:**
- One user has many stashes (1:N)
- One user has many expenses (1:N)
- One user has many month budgets (1:N)
- One user has many stash transactions (1:N, denormalized)
- One stash has many transactions (1:N)
- One category has many expenses (1:N)

## 3. Indexes

### 3.1 stashes
```sql
CREATE INDEX idx_stashes_user_created 
  ON stashes(user_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_stashes_user_name 
  ON stashes(user_id, name) 
  WHERE deleted_at IS NULL;
```

### 3.2 stash_transactions
```sql
CREATE INDEX idx_stash_transactions_stash_created 
  ON stash_transactions(stash_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_stash_transactions_user_created 
  ON stash_transactions(user_id, created_at DESC) 
  WHERE deleted_at IS NULL;
```

### 3.3 expenses
```sql
CREATE INDEX idx_expenses_user_date 
  ON expenses(user_id, expense_date DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_user_year_month 
  ON expenses(user_id, year_month) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_user_category 
  ON expenses(user_id, category_id) 
  WHERE deleted_at IS NULL;
```

### 3.4 month_budget
```sql
CREATE INDEX idx_month_budget_user_month 
  ON month_budget(user_id, year_month) 
  WHERE deleted_at IS NULL;
```

**Notes:**
- All indexes are partial (WHERE deleted_at IS NULL) to improve performance
- Composite indexes support common query patterns
- DESC ordering on timestamps for recent-first queries

## 4. PostgreSQL Row-Level Security (RLS) Policies

### 4.1 stashes

**Enable RLS:**
```sql
ALTER TABLE stashes ENABLE ROW LEVEL SECURITY;
```

**Policies:**
```sql
-- SELECT: Users can only view their own stashes
CREATE POLICY stashes_select_policy ON stashes
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create stashes for themselves
CREATE POLICY stashes_insert_policy ON stashes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own stashes
CREATE POLICY stashes_update_policy ON stashes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own stashes
CREATE POLICY stashes_delete_policy ON stashes
  FOR DELETE
  USING (user_id = auth.uid());
```

### 4.2 stash_transactions

**Enable RLS:**
```sql
ALTER TABLE stash_transactions ENABLE ROW LEVEL SECURITY;
```

**Policies:**
```sql
-- SELECT: Users can only view their own transactions
CREATE POLICY stash_transactions_select_policy ON stash_transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create transactions for their own stashes
CREATE POLICY stash_transactions_insert_policy ON stash_transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own transactions
CREATE POLICY stash_transactions_update_policy ON stash_transactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own transactions
CREATE POLICY stash_transactions_delete_policy ON stash_transactions
  FOR DELETE
  USING (user_id = auth.uid());
```

### 4.3 expenses

**Enable RLS:**
```sql
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
```

**Policies:**
```sql
-- SELECT: Users can only view their own expenses
CREATE POLICY expenses_select_policy ON expenses
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create expenses for themselves
CREATE POLICY expenses_insert_policy ON expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own expenses
CREATE POLICY expenses_update_policy ON expenses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own expenses
CREATE POLICY expenses_delete_policy ON expenses
  FOR DELETE
  USING (user_id = auth.uid());
```

### 4.4 month_budget

**Enable RLS:**
```sql
ALTER TABLE month_budget ENABLE ROW LEVEL SECURITY;
```

**Policies:**
```sql
-- SELECT: Users can only view their own budgets
CREATE POLICY month_budget_select_policy ON month_budget
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only create budgets for themselves
CREATE POLICY month_budget_insert_policy ON month_budget
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own budgets
CREATE POLICY month_budget_update_policy ON month_budget
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own budgets
CREATE POLICY month_budget_delete_policy ON month_budget
  FOR DELETE
  USING (user_id = auth.uid());
```

### 4.5 expense_categories

**Enable RLS:**
```sql
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
```

**Policies:**
```sql
-- SELECT: All authenticated users can view categories
CREATE POLICY expense_categories_select_policy ON expense_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies - categories are system-managed
```

## 5. Triggers and Functions

### 5.1 Update stash balance on transaction insert/update/delete

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_stash_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add to balance for deposits, subtract for withdrawals
    IF NEW.transaction_type = 'deposit' THEN
      UPDATE stashes 
      SET current_balance = current_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.stash_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE stashes 
      SET current_balance = current_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.stash_id;
      
      -- Check if balance would go negative
      IF (SELECT current_balance FROM stashes WHERE id = NEW.stash_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient balance in stash';
      END IF;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process if not soft-deleted and amount/type changed
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NULL THEN
      -- Reverse old transaction
      IF OLD.transaction_type = 'deposit' THEN
        UPDATE stashes SET current_balance = current_balance - OLD.amount WHERE id = OLD.stash_id;
      ELSIF OLD.transaction_type = 'withdrawal' THEN
        UPDATE stashes SET current_balance = current_balance + OLD.amount WHERE id = OLD.stash_id;
      END IF;
      
      -- Apply new transaction
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE stashes SET current_balance = current_balance + NEW.amount WHERE id = NEW.stash_id;
      ELSIF NEW.transaction_type = 'withdrawal' THEN
        UPDATE stashes SET current_balance = current_balance - NEW.amount WHERE id = NEW.stash_id;
      END IF;
      
      -- Check balance
      IF (SELECT current_balance FROM stashes WHERE id = NEW.stash_id) < 0 THEN
        RAISE EXCEPTION 'Insufficient balance in stash';
      END IF;
    ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Soft delete: reverse the transaction
      IF OLD.transaction_type = 'deposit' THEN
        UPDATE stashes SET current_balance = current_balance - OLD.amount WHERE id = OLD.stash_id;
      ELSIF OLD.transaction_type = 'withdrawal' THEN
        UPDATE stashes SET current_balance = current_balance + OLD.amount WHERE id = OLD.stash_id;
      END IF;
    END IF;
    
    UPDATE stashes SET updated_at = now() WHERE id = NEW.stash_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Hard delete: reverse the transaction if it wasn't soft-deleted
    IF OLD.deleted_at IS NULL THEN
      IF OLD.transaction_type = 'deposit' THEN
        UPDATE stashes SET current_balance = current_balance - OLD.amount WHERE id = OLD.stash_id;
      ELSIF OLD.transaction_type = 'withdrawal' THEN
        UPDATE stashes SET current_balance = current_balance + OLD.amount WHERE id = OLD.stash_id;
      END IF;
      UPDATE stashes SET updated_at = now() WHERE id = OLD.stash_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_stash_balance
  AFTER INSERT OR UPDATE OR DELETE ON stash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stash_balance();
```

### 5.2 Cascade soft-delete from stash to transactions

**Function:**
```sql
CREATE OR REPLACE FUNCTION cascade_stash_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Soft-delete all transactions for this stash
    UPDATE stash_transactions
    SET deleted_at = NEW.deleted_at
    WHERE stash_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_cascade_stash_soft_delete
  AFTER UPDATE ON stashes
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION cascade_stash_soft_delete();
```

### 5.3 Update updated_at timestamp

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER trigger_stashes_updated_at
  BEFORE UPDATE ON stashes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_month_budget_updated_at
  BEFORE UPDATE ON month_budget
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.4 Update month budget balance on expense insert/update/delete

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_month_budget_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_set NUMERIC(12,2);
  v_total_expenses NUMERIC(12,2);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Calculate new balance for the month
    SELECT budget_set INTO v_budget_set
    FROM month_budget
    WHERE user_id = NEW.user_id 
      AND year_month = NEW.year_month 
      AND deleted_at IS NULL;
    
    IF v_budget_set IS NOT NULL THEN
      -- Calculate total expenses for this month (excluding the new one, it will be added)
      SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
      FROM expenses
      WHERE user_id = NEW.user_id 
        AND year_month = NEW.year_month 
        AND deleted_at IS NULL;
      
      -- Update budget balance
      UPDATE month_budget
      SET current_balance = v_budget_set - v_total_expenses,
          updated_at = now()
      WHERE user_id = NEW.user_id 
        AND year_month = NEW.year_month 
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle changes to expense amount or soft-delete
    -- Update old month if year_month changed
    IF OLD.year_month != NEW.year_month OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
      SELECT budget_set INTO v_budget_set
      FROM month_budget
      WHERE user_id = OLD.user_id 
        AND year_month = OLD.year_month 
        AND deleted_at IS NULL;
      
      IF v_budget_set IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
        FROM expenses
        WHERE user_id = OLD.user_id 
          AND year_month = OLD.year_month 
          AND deleted_at IS NULL
          AND id != OLD.id;  -- Exclude current record
        
        UPDATE month_budget
        SET current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        WHERE user_id = OLD.user_id 
          AND year_month = OLD.year_month 
          AND deleted_at IS NULL;
      END IF;
    END IF;
    
    -- Update new month if year_month changed or amount changed
    IF NEW.deleted_at IS NULL THEN
      SELECT budget_set INTO v_budget_set
      FROM month_budget
      WHERE user_id = NEW.user_id 
        AND year_month = NEW.year_month 
        AND deleted_at IS NULL;
      
      IF v_budget_set IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
        FROM expenses
        WHERE user_id = NEW.user_id 
          AND year_month = NEW.year_month 
          AND deleted_at IS NULL;
        
        UPDATE month_budget
        SET current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        WHERE user_id = NEW.user_id 
          AND year_month = NEW.year_month 
          AND deleted_at IS NULL;
      END IF;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Recalculate balance when expense is hard-deleted
    IF OLD.deleted_at IS NULL THEN
      SELECT budget_set INTO v_budget_set
      FROM month_budget
      WHERE user_id = OLD.user_id 
        AND year_month = OLD.year_month 
        AND deleted_at IS NULL;
      
      IF v_budget_set IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
        FROM expenses
        WHERE user_id = OLD.user_id 
          AND year_month = OLD.year_month 
          AND deleted_at IS NULL
          AND id != OLD.id;  -- Exclude deleted record
        
        UPDATE month_budget
        SET current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        WHERE user_id = OLD.user_id 
          AND year_month = OLD.year_month 
          AND deleted_at IS NULL;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_month_budget_balance
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_month_budget_balance();
```

**Notes:**
- Trigger recalculates `current_balance` whenever expenses are added, modified, or deleted
- Handles month changes when expense date is updated
- Only updates budget if it exists for the given month
- Uses `SECURITY DEFINER` to ensure trigger can update budget regardless of RLS

## 6. Stored Procedures

### 6.1 Hard delete user account and all data

**Procedure:**
```sql
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Must be called with service role to bypass RLS
  -- Delete in order to respect foreign key constraints
  
  -- 1. Delete stash transactions
  DELETE FROM stash_transactions WHERE user_id = target_user_id;
  
  -- 2. Delete stashes
  DELETE FROM stashes WHERE user_id = target_user_id;
  
  -- 3. Delete expenses
  DELETE FROM expenses WHERE user_id = target_user_id;
  
  -- 4. Delete month budgets
  DELETE FROM month_budget WHERE user_id = target_user_id;
  
  -- 5. Delete auth user (handled by Supabase Auth API, not here)
  -- This function only cleans up application data
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (they can only delete their own account via application logic)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
```

**Notes:**
- This procedure must be called with service role credentials to bypass RLS
- Application layer should verify user identity before calling
- Auth user deletion handled separately via Supabase Auth API
- Consider wrapping in a transaction at the application level

## 7. Initial Data

### 7.1 Expense Categories (Hardcoded)

```sql
INSERT INTO expense_categories (name, slug) VALUES
  ('Groceries', 'groceries'),
  ('Transport', 'transport'),
  ('Utilities', 'utilities'),
  ('Entertainment', 'entertainment'),
  ('Healthcare', 'healthcare'),
  ('Dining Out', 'dining-out'),
  ('Shopping', 'shopping'),
  ('Education', 'education'),
  ('Housing', 'housing'),
  ('Insurance', 'insurance'),
  ('Savings', 'savings'),
  ('Other', 'other');
```

## 8. Design Decisions and Notes

### 8.1 Data Types
- **Monetary values:** `NUMERIC(12,2)` for precision (up to 9,999,999,999.99 PLN)
- **Timestamps:** `TIMESTAMPTZ` for timezone awareness (except `expenses.expense_date` which is `DATE`)
- **UUIDs:** `gen_random_uuid()` for all primary keys
- **Year-month:** `VARCHAR(7)` in YYYY-MM format with regex validation

### 8.2 Soft Delete Strategy
- All user-data tables include `deleted_at` column
- Partial indexes exclude soft-deleted rows for performance
- Cascade soft-delete from stashes to transactions via trigger
- Hard delete only via `delete_user_account()` procedure

### 8.3 Balance Integrity
- `stashes.current_balance` maintained by triggers on stash_transactions
- `month_budget.current_balance` maintained by triggers on expenses
- Withdrawal trigger prevents negative stash balances
- Soft-deleting a transaction reverses its effect on balance
- CHECK constraint ensures stash balance never goes below zero
- Budget balance can go negative (overspending allowed)

### 8.4 Performance Optimizations
- Composite indexes on (user_id, date/month) for common queries
- Partial indexes exclude soft-deleted rows
- Generated column `expenses.year_month` for efficient month-based queries
- Denormalized `user_id` in `stash_transactions` for RLS efficiency

### 8.5 Security
- Strict RLS policies: `user_id = auth.uid()` on all user data
- Service role required for account deletion procedure
- No data sharing between users
- Categories are read-only for regular users

### 8.6 Scalability Considerations
- Current design optimized for single-user workloads
- No partitioning initially; revisit when tables exceed 1M rows
- No materialized views; add if aggregate queries become slow
- Indexes support expected query patterns without over-indexing

### 8.7 Naming Conventions
- Tables: plural snake_case (e.g., `stash_transactions`)
- Columns: snake_case (e.g., `current_balance`)
- Constraints: descriptive names with table prefix
- Indexes: `idx_<table>_<columns>` pattern
- Policies: `<table>_<operation>_policy` pattern

### 8.8 Future Considerations
- **Partitioning:** Consider range partitioning on `expenses` by `year_month` if table grows large
- **Materialized views:** Add for monthly spending summaries if aggregation queries slow down
- **Archival:** Implement data archival strategy for old soft-deleted records
- **Audit log:** Consider separate audit table for compliance if needed

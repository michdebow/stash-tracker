-- ============================================================================
-- Migration: Initial Schema for StashTracker
-- Description: Creates all core tables, indexes, triggers, and RLS policies
-- Created: 2025-10-10 15:07:49 UTC
-- 
-- Tables Created:
--   - expense_categories (system-wide expense categories)
--   - stashes (user savings stashes)
--   - stash_transactions (deposits/withdrawals for stashes)
--   - month_budget (monthly budget tracking)
--   - expenses (user expenses)
--
-- Features:
--   - Row Level Security (RLS) enabled on all tables
--   - Soft-delete support via deleted_at column
--   - Automatic balance updates via triggers
--   - Optimized indexes for common query patterns
-- ============================================================================

-- ============================================================================
-- 1. EXPENSE CATEGORIES TABLE
-- ============================================================================
-- Purpose: System-wide expense categories (read-only for users)
-- Notes: No user_id FK; categories are shared across all users
-- ============================================================================

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  slug varchar(100) not null unique,
  display_name varchar(100) not null,
  created_at timestamptz not null default now()
);

-- Enable RLS for expense_categories
alter table expense_categories enable row level security;

-- RLS Policy: Allow all authenticated users to read categories
-- Rationale: Categories are system-wide and need to be visible to all users
create policy expense_categories_select_policy_authenticated on expense_categories
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to read categories
-- Rationale: Categories may need to be visible on public pages
create policy expense_categories_select_policy_anon on expense_categories
  for select
  to anon
  using (true);

-- Note: No INSERT/UPDATE/DELETE policies - categories are managed via migrations or admin tools

-- ============================================================================
-- 2. STASHES TABLE
-- ============================================================================
-- Purpose: User savings stashes with automatic balance tracking
-- Notes: current_balance is maintained by triggers on stash_transactions
-- ============================================================================

create table if not exists stashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  current_balance numeric(12,2) not null default 0.00 check (current_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- Create partial unique index for stash names per user (excluding soft-deleted)
-- Note: This enforces uniqueness only for non-deleted stashes
create unique index stashes_user_name_unique_idx 
  on stashes(user_id, name) 
  where deleted_at is null;

-- Enable RLS for stashes
alter table stashes enable row level security;

-- RLS Policy: Users can view their own stashes (authenticated)
-- Rationale: Users should only see stashes they own
create policy stashes_select_policy_authenticated on stashes
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can create stashes for themselves (authenticated)
-- Rationale: Users can only create stashes under their own account
create policy stashes_insert_policy_authenticated on stashes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own stashes (authenticated)
-- Rationale: Users can only modify their own stashes
create policy stashes_update_policy_authenticated on stashes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own stashes (authenticated)
-- Rationale: Users can only delete their own stashes
create policy stashes_delete_policy_authenticated on stashes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Indexes for stashes
-- Index: Optimize queries for user's stashes ordered by creation date
create index idx_stashes_user_created 
  on stashes(user_id, created_at desc) 
  where deleted_at is null;

-- Index: Optimize queries for finding stashes by user and name
create index idx_stashes_user_name 
  on stashes(user_id, name) 
  where deleted_at is null;

-- ============================================================================
-- 3. STASH TRANSACTIONS TABLE
-- ============================================================================
-- Purpose: Track deposits and withdrawals for stashes
-- Notes: user_id is denormalized for efficient RLS; triggers update stash balance
-- ============================================================================

create table if not exists stash_transactions (
  id uuid primary key default gen_random_uuid(),
  stash_id uuid not null references stashes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type varchar(20) not null check (transaction_type in ('deposit', 'withdrawal')),
  amount numeric(12,2) not null check (amount > 0),
  description text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- Enable RLS for stash_transactions
alter table stash_transactions enable row level security;

-- RLS Policy: Users can view their own transactions (authenticated)
-- Rationale: Users should only see transactions for their stashes
create policy stash_transactions_select_policy_authenticated on stash_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can create transactions for their stashes (authenticated)
-- Rationale: Users can only create transactions for stashes they own
create policy stash_transactions_insert_policy_authenticated on stash_transactions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own transactions (authenticated)
-- Rationale: Users can only modify transactions they created
create policy stash_transactions_update_policy_authenticated on stash_transactions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own transactions (authenticated)
-- Rationale: Users can only delete transactions they created
create policy stash_transactions_delete_policy_authenticated on stash_transactions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Indexes for stash_transactions
-- Index: Optimize queries for transactions by stash, ordered by creation date
create index idx_stash_transactions_stash_created 
  on stash_transactions(stash_id, created_at desc) 
  where deleted_at is null;

-- Index: Optimize queries for user's transactions ordered by creation date
create index idx_stash_transactions_user_created 
  on stash_transactions(user_id, created_at desc) 
  where deleted_at is null;

-- ============================================================================
-- 4. MONTH BUDGET TABLE
-- ============================================================================
-- Purpose: Track monthly budgets with automatic balance calculation
-- Notes: current_balance is maintained by triggers on expenses table
-- ============================================================================

create table if not exists month_budget (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month varchar(7) not null check (year_month ~ '^\d{4}-\d{2}$'),
  budget_set numeric(12,2) not null check (budget_set > 0),
  current_balance numeric(12,2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- Create partial unique index for budget per user per month (excluding soft-deleted)
-- Note: This enforces one budget per user per month for non-deleted budgets
create unique index month_budget_user_month_unique_idx 
  on month_budget(user_id, year_month) 
  where deleted_at is null;

-- Enable RLS for month_budget
alter table month_budget enable row level security;

-- RLS Policy: Users can view their own budgets (authenticated)
-- Rationale: Users should only see their own monthly budgets
create policy month_budget_select_policy_authenticated on month_budget
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can create budgets for themselves (authenticated)
-- Rationale: Users can only create budgets for their own account
create policy month_budget_insert_policy_authenticated on month_budget
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own budgets (authenticated)
-- Rationale: Users can only modify their own budgets
create policy month_budget_update_policy_authenticated on month_budget
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own budgets (authenticated)
-- Rationale: Users can only delete their own budgets
create policy month_budget_delete_policy_authenticated on month_budget
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Indexes for month_budget
-- Index: Optimize queries for user's budgets by month
create index idx_month_budget_user_month 
  on month_budget(user_id, year_month) 
  where deleted_at is null;

-- ============================================================================
-- 5. EXPENSES TABLE
-- ============================================================================
-- Purpose: Track user expenses with automatic month calculation
-- Notes: year_month is computed via trigger for efficient month-based queries
-- ============================================================================

-- Create immutable function to format date as YYYY-MM
-- This is needed because to_char() is not immutable due to locale dependency
create or replace function format_year_month(d date)
returns varchar(7) as $$
begin
  return to_char(d, 'YYYY-MM');
end;
$$ language plpgsql immutable;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references expense_categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  year_month varchar(7) not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  
  -- Validate year_month format
  constraint expenses_year_month_format check (year_month ~ '^\d{4}-\d{2}$')
);

-- Enable RLS for expenses
alter table expenses enable row level security;

-- RLS Policy: Users can view their own expenses (authenticated)
-- Rationale: Users should only see expenses they created
create policy expenses_select_policy_authenticated on expenses
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Users can create expenses for themselves (authenticated)
-- Rationale: Users can only create expenses for their own account
create policy expenses_insert_policy_authenticated on expenses
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Users can update their own expenses (authenticated)
-- Rationale: Users can only modify expenses they created
create policy expenses_update_policy_authenticated on expenses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Users can delete their own expenses (authenticated)
-- Rationale: Users can only delete expenses they created
create policy expenses_delete_policy_authenticated on expenses
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Indexes for expenses
-- Index: Optimize queries for user's expenses ordered by date
create index idx_expenses_user_date 
  on expenses(user_id, expense_date desc) 
  where deleted_at is null;

-- Index: Optimize queries for user's expenses by month
create index idx_expenses_user_year_month 
  on expenses(user_id, year_month) 
  where deleted_at is null;

-- Index: Optimize queries for user's expenses by category
create index idx_expenses_user_category 
  on expenses(user_id, category_id) 
  where deleted_at is null;

-- ============================================================================
-- 6. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Function: Set year_month from expense_date
-- ----------------------------------------------------------------------------
-- Purpose: Automatically populate year_month column from expense_date
-- Used by: expenses table
-- ----------------------------------------------------------------------------

create or replace function set_expense_year_month()
returns trigger as $$
begin
  new.year_month = format_year_month(new.expense_date);
  return new;
end;
$$ language plpgsql;

-- Apply trigger to expenses
create trigger trigger_set_expense_year_month
  before insert or update of expense_date on expenses
  for each row
  execute function set_expense_year_month();

-- ----------------------------------------------------------------------------
-- 6.2 Function: Update updated_at timestamp
-- ----------------------------------------------------------------------------
-- Purpose: Automatically update updated_at column on row updates
-- Used by: stashes, month_budget, expenses tables
-- ----------------------------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to stashes
create trigger trigger_stashes_updated_at
  before update on stashes
  for each row
  execute function update_updated_at_column();

-- Apply updated_at trigger to month_budget
create trigger trigger_month_budget_updated_at
  before update on month_budget
  for each row
  execute function update_updated_at_column();

-- Apply updated_at trigger to expenses
create trigger trigger_expenses_updated_at
  before update on expenses
  for each row
  execute function update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6.3 Function: Update stash balance on transaction changes
-- ----------------------------------------------------------------------------
-- Purpose: Maintain stash current_balance based on transactions
-- Behavior:
--   - INSERT: Add deposit or subtract withdrawal from balance
--   - UPDATE: Reverse old transaction and apply new one
--   - DELETE: Reverse transaction if not soft-deleted
--   - Prevents negative balances for withdrawals
-- Security: SECURITY DEFINER allows trigger to update stash despite RLS
-- ----------------------------------------------------------------------------

create or replace function update_stash_balance()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    -- Add to balance for deposits, subtract for withdrawals
    if new.transaction_type = 'deposit' then
      update stashes 
      set current_balance = current_balance + new.amount,
          updated_at = now()
      where id = new.stash_id;
    elsif new.transaction_type = 'withdrawal' then
      update stashes 
      set current_balance = current_balance - new.amount,
          updated_at = now()
      where id = new.stash_id;
      
      -- Check if balance would go negative (prevent overdraft)
      if (select current_balance from stashes where id = new.stash_id) < 0 then
        raise exception 'Insufficient balance in stash';
      end if;
    end if;
    return new;
    
  elsif tg_op = 'UPDATE' then
    -- Only process if not soft-deleted and amount/type changed
    if old.deleted_at is null and new.deleted_at is null then
      -- Reverse old transaction
      if old.transaction_type = 'deposit' then
        update stashes set current_balance = current_balance - old.amount where id = old.stash_id;
      elsif old.transaction_type = 'withdrawal' then
        update stashes set current_balance = current_balance + old.amount where id = old.stash_id;
      end if;
      
      -- Apply new transaction
      if new.transaction_type = 'deposit' then
        update stashes set current_balance = current_balance + new.amount where id = new.stash_id;
      elsif new.transaction_type = 'withdrawal' then
        update stashes set current_balance = current_balance - new.amount where id = new.stash_id;
      end if;
      
      -- Check balance (prevent negative balance)
      if (select current_balance from stashes where id = new.stash_id) < 0 then
        raise exception 'Insufficient balance in stash';
      end if;
    elsif old.deleted_at is null and new.deleted_at is not null then
      -- Soft delete: reverse the transaction
      if old.transaction_type = 'deposit' then
        update stashes set current_balance = current_balance - old.amount where id = old.stash_id;
      elsif old.transaction_type = 'withdrawal' then
        update stashes set current_balance = current_balance + old.amount where id = old.stash_id;
      end if;
    end if;
    
    update stashes set updated_at = now() where id = new.stash_id;
    return new;
    
  elsif tg_op = 'DELETE' then
    -- Hard delete: reverse the transaction if it wasn't soft-deleted
    if old.deleted_at is null then
      if old.transaction_type = 'deposit' then
        update stashes set current_balance = current_balance - old.amount where id = old.stash_id;
      elsif old.transaction_type = 'withdrawal' then
        update stashes set current_balance = current_balance + old.amount where id = old.stash_id;
      end if;
      update stashes set updated_at = now() where id = old.stash_id;
    end if;
    return old;
  end if;
end;
$$ language plpgsql security definer;

-- Apply trigger to stash_transactions
create trigger trigger_update_stash_balance
  after insert or update or delete on stash_transactions
  for each row
  execute function update_stash_balance();

-- ----------------------------------------------------------------------------
-- 6.4 Function: Cascade soft-delete from stash to transactions
-- ----------------------------------------------------------------------------
-- Purpose: When a stash is soft-deleted, soft-delete all its transactions
-- Rationale: Maintains data consistency and prevents orphaned transactions
-- ----------------------------------------------------------------------------

create or replace function cascade_stash_soft_delete()
returns trigger as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    -- Soft-delete all transactions for this stash
    update stash_transactions
    set deleted_at = new.deleted_at
    where stash_id = new.id and deleted_at is null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Apply trigger to stashes
create trigger trigger_cascade_stash_soft_delete
  after update on stashes
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function cascade_stash_soft_delete();

-- ----------------------------------------------------------------------------
-- 6.5 Function: Update month budget balance on expense changes
-- ----------------------------------------------------------------------------
-- Purpose: Maintain month_budget current_balance based on expenses
-- Behavior:
--   - Recalculates budget balance whenever expenses are added/modified/deleted
--   - Handles month changes when expense date is updated
--   - Only updates budget if it exists for the given month
--   - Allows negative balance (overspending)
-- Security: SECURITY DEFINER allows trigger to update budget despite RLS
-- ----------------------------------------------------------------------------

create or replace function update_month_budget_balance()
returns trigger as $$
declare
  v_budget_set numeric(12,2);
  v_total_expenses numeric(12,2);
begin
  if tg_op = 'INSERT' then
    -- Calculate new balance for the month
    select budget_set into v_budget_set
    from month_budget
    where user_id = new.user_id 
      and year_month = new.year_month 
      and deleted_at is null;
    
    if v_budget_set is not null then
      -- Calculate total expenses for this month (including the new one)
      select coalesce(sum(amount), 0) into v_total_expenses
      from expenses
      where user_id = new.user_id 
        and year_month = new.year_month 
        and deleted_at is null;
      
      -- Update budget balance
      update month_budget
      set current_balance = v_budget_set - v_total_expenses,
          updated_at = now()
      where user_id = new.user_id 
        and year_month = new.year_month 
        and deleted_at is null;
    end if;
    return new;
    
  elsif tg_op = 'UPDATE' then
    -- Handle changes to expense amount or soft-delete
    -- Update old month if year_month changed
    if old.year_month != new.year_month or (old.deleted_at is null and new.deleted_at is not null) then
      select budget_set into v_budget_set
      from month_budget
      where user_id = old.user_id 
        and year_month = old.year_month 
        and deleted_at is null;
      
      if v_budget_set is not null then
        select coalesce(sum(amount), 0) into v_total_expenses
        from expenses
        where user_id = old.user_id 
          and year_month = old.year_month 
          and deleted_at is null
          and id != old.id;  -- Exclude current record
        
        update month_budget
        set current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        where user_id = old.user_id 
          and year_month = old.year_month 
          and deleted_at is null;
      end if;
    end if;
    
    -- Update new month if year_month changed or amount changed
    if new.deleted_at is null then
      select budget_set into v_budget_set
      from month_budget
      where user_id = new.user_id 
        and year_month = new.year_month 
        and deleted_at is null;
      
      if v_budget_set is not null then
        select coalesce(sum(amount), 0) into v_total_expenses
        from expenses
        where user_id = new.user_id 
          and year_month = new.year_month 
          and deleted_at is null;
        
        update month_budget
        set current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        where user_id = new.user_id 
          and year_month = new.year_month 
          and deleted_at is null;
      end if;
    end if;
    return new;
    
  elsif tg_op = 'DELETE' then
    -- Recalculate balance when expense is hard-deleted
    if old.deleted_at is null then
      select budget_set into v_budget_set
      from month_budget
      where user_id = old.user_id 
        and year_month = old.year_month 
        and deleted_at is null;
      
      if v_budget_set is not null then
        select coalesce(sum(amount), 0) into v_total_expenses
        from expenses
        where user_id = old.user_id 
          and year_month = old.year_month 
          and deleted_at is null
          and id != old.id;  -- Exclude deleted record
        
        update month_budget
        set current_balance = v_budget_set - v_total_expenses,
            updated_at = now()
        where user_id = old.user_id 
          and year_month = old.year_month 
          and deleted_at is null;
      end if;
    end if;
    return old;
  end if;
end;
$$ language plpgsql security definer;

-- Apply trigger to expenses
create trigger trigger_update_month_budget_balance
  after insert or update or delete on expenses
  for each row
  execute function update_month_budget_balance();

-- ============================================================================
-- 7. STORED PROCEDURES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Function: Delete user account and all associated data
-- ----------------------------------------------------------------------------
-- Purpose: Hard delete all user data (for account deletion)
-- Usage: Must be called with service role to bypass RLS
-- Notes: 
--   - Application layer should verify user identity before calling
--   - Auth user deletion handled separately via Supabase Auth API
--   - Consider wrapping in a transaction at the application level
-- WARNING: This is a destructive operation and cannot be undone
-- ----------------------------------------------------------------------------

create or replace function delete_user_account(target_user_id uuid)
returns void as $$
begin
  -- Delete in order to respect foreign key constraints
  
  -- 1. Delete stash transactions (will be cascaded by FK, but explicit for clarity)
  delete from stash_transactions where user_id = target_user_id;
  
  -- 2. Delete stashes (will cascade to transactions via FK)
  delete from stashes where user_id = target_user_id;
  
  -- 3. Delete expenses
  delete from expenses where user_id = target_user_id;
  
  -- 4. Delete month budgets
  delete from month_budget where user_id = target_user_id;
  
  -- Note: Auth user deletion handled separately via Supabase Auth API
  -- This function only cleans up application data
  
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
-- Note: Application logic should verify user identity before calling
grant execute on function delete_user_account(uuid) to authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
--   1. Run seed data migration to populate expense_categories
--   2. Verify RLS policies are working as expected
--   3. Test triggers with sample data
-- ============================================================================

-- ============================================================================
-- Migration: Seed Expense Categories
-- Description: Populates the expense_categories table with default categories
-- Created: 2025-10-10 15:07:50 UTC
-- 
-- Categories:
--   - Groceries, Transport, Utilities, Entertainment, Healthcare
--   - Dining Out, Shopping, Education, Housing, Insurance
--   - Savings, Other
--
-- Display Names (Polish):
--   - Jedzenie, Transport, Media, Rozrywka, Zdrowie
--   - Restauracje, Zakupy, Edukacja, Mieszkanie, Ubezpieczenia
--   - Oszczędności, Inne
--
-- Notes:
--   - These are system-wide categories available to all users
--   - Categories are read-only for regular users
--   - Uses ON CONFLICT to make migration idempotent
-- ============================================================================

-- Insert default expense categories
-- Using ON CONFLICT to make this migration idempotent (safe to run multiple times)
insert into expense_categories (name, slug, display_name) values
  ('Groceries', 'groceries', 'Jedzenie'),
  ('Transport', 'transport', 'Transport'),
  ('Utilities', 'utilities', 'Media'),
  ('Entertainment', 'entertainment', 'Rozrywka'),
  ('Healthcare', 'healthcare', 'Zdrowie'),
  ('Dining Out', 'dining-out', 'Restauracje'),
  ('Shopping', 'shopping', 'Zakupy'),
  ('Education', 'education', 'Edukacja'),
  ('Housing', 'housing', 'Mieszkanie'),
  ('Insurance', 'insurance', 'Ubezpieczenia'),
  ('Savings', 'savings', 'Oszczędności'),
  ('Other', 'other', 'Inne')
on conflict (slug) do nothing;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Result: 12 expense categories available for all users
-- ============================================================================

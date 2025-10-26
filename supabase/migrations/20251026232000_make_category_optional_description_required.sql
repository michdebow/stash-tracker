-- ============================================================================
-- Migration: Make category_id optional and description required in expenses
-- Description: Allows expenses without a category but requires a description
-- Created: 2025-10-26 23:20:00 UTC
-- ============================================================================

-- Make category_id nullable (allow expenses without category)
ALTER TABLE expenses 
  ALTER COLUMN category_id DROP NOT NULL;

-- Make description required (not null)
ALTER TABLE expenses 
  ALTER COLUMN description SET NOT NULL;

-- Update the foreign key constraint to allow null category_id
-- First drop the existing constraint
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_category_id_fkey;

-- Re-add the constraint with proper handling of nulls
ALTER TABLE expenses 
  ADD CONSTRAINT expenses_category_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES expense_categories(id) 
  ON DELETE RESTRICT;

-- ============================================================================
-- Migration Complete
-- ============================================================================

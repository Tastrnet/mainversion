# Fix: Ambiguous Column Reference Error (42702)

## Problem
**Error:** `column reference "id" is ambiguous` (PostgreSQL error 42702)

This happens when PostgreSQL can't determine which table/CTE a column belongs to because multiple sources have the same column name.

## Root Cause
In the SQL function, the CTE `restaurants_with_distance` had columns like `id`, `name`, etc., and the final SELECT was trying to use these without proper qualification, causing ambiguity with the RETURN TABLE columns.

## Solution
✅ **Fixed by using unique column aliases in the CTE and qualifying all references**

The fix:
1. Uses unique aliases in the CTE (`restaurant_id`, `restaurant_name`, etc.)
2. Qualifies all column references with the CTE alias (`rwd.restaurant_id`)
3. Maps back to expected names using AS aliases in the final SELECT

## Migration File
The fix is in: `supabase/migrations/20251211021738_fix_stack_overflow_single_function.sql`

## Apply the Fix
Run the migration in Supabase SQL Editor - it's already updated with the fix!



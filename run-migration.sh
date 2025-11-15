#!/bin/bash

# Migration: Add token breakdown columns to positions table

SQL="ALTER TABLE positions
ADD COLUMN IF NOT EXISTS token0_amount NUMERIC,
ADD COLUMN IF NOT EXISTS token1_amount NUMERIC,
ADD COLUMN IF NOT EXISTS token0_value NUMERIC,
ADD COLUMN IF NOT EXISTS token1_value NUMERIC,
ADD COLUMN IF NOT EXISTS token0_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS token1_percentage NUMERIC;"

echo "📋 Copying SQL to clipboard..."
echo "$SQL" | pbcopy

echo ""
echo "✅ SQL copied to clipboard!"
echo ""
echo "📝 Next steps:"
echo "  1. Opening Supabase SQL Editor in your browser..."
echo "  2. Paste the SQL (Cmd+V) and click 'Run'"
echo ""
echo "SQL to run:"
echo "$SQL"
echo ""

# Open Supabase SQL editor
open "https://supabase.com/dashboard/project/mbshzqwskqvzuiegfmkr/sql/new"

echo "⏳ Waiting for you to run the SQL..."
echo ""
echo "Press Enter after you've run the SQL in the browser..."
read

echo ""
echo "✅ Migration should be complete!"
echo "📝 Next: Recapture your CLM positions to populate the new columns."

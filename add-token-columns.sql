-- Add token breakdown columns to positions table
-- Run this in your Supabase SQL editor

ALTER TABLE positions
ADD COLUMN IF NOT EXISTS token0_amount NUMERIC,
ADD COLUMN IF NOT EXISTS token1_amount NUMERIC,
ADD COLUMN IF NOT EXISTS token0_value NUMERIC,
ADD COLUMN IF NOT EXISTS token1_value NUMERIC,
ADD COLUMN IF NOT EXISTS token0_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS token1_percentage NUMERIC;

-- Add comment for documentation
COMMENT ON COLUMN positions.token0_amount IS 'Amount of token0 in the position';
COMMENT ON COLUMN positions.token1_amount IS 'Amount of token1 in the position';
COMMENT ON COLUMN positions.token0_value IS 'USD value of token0';
COMMENT ON COLUMN positions.token1_value IS 'USD value of token1';
COMMENT ON COLUMN positions.token0_percentage IS 'Percentage of position value in token0';
COMMENT ON COLUMN positions.token1_percentage IS 'Percentage of position value in token1';

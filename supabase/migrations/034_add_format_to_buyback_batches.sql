-- Migration 027: Add format column to buyback_batches
-- Tracks which bank transfer format was used to generate the batch file.

ALTER TABLE buyback_batches ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'standard';

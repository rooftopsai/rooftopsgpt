-- Add UNIQUE constraint to user_id in subscriptions table
-- This allows upsert operations to work correctly (one subscription per user)

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

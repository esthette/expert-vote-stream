-- Add unique constraint to prevent duplicate session joins
ALTER TABLE experts
ADD CONSTRAINT unique_user_per_session
UNIQUE (user_id, session_id);
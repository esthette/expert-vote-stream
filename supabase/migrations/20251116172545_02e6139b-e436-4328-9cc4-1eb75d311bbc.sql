-- Fix vote fraud vulnerability: Replace overly permissive vote policy
-- Drop the insecure policy that allows anyone to vote as any expert
DROP POLICY IF EXISTS "Anyone can vote" ON votes;

-- Create secure policy: Users can only vote as their own expert records
CREATE POLICY "Experts can only vote as themselves" ON votes
FOR INSERT
WITH CHECK (
  expert_id IN (
    SELECT id FROM experts 
    WHERE user_id = auth.uid()
  )
);
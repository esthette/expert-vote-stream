-- Fix objects table RLS policy to restrict INSERT to only session creators
DROP POLICY IF EXISTS "Anyone can create objects" ON objects;

CREATE POLICY "Only session creator can create objects" ON objects
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT created_by FROM sessions 
    WHERE id = session_id AND created_by IS NOT NULL
  )
);
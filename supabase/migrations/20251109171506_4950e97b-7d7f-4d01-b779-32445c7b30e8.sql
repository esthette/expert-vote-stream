-- Add created_by column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update the RLS policy for UPDATE to only allow the creator to update
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

CREATE POLICY "Only session creator can update sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Allow authenticated users to update their own sessions
CREATE POLICY "Authenticated users can update their sessions" 
ON public.sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by);
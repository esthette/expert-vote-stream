-- Add user_id column to experts table to link experts to their anonymous auth session
ALTER TABLE public.experts 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update the RLS policy for UPDATE to only allow experts to update their own records
DROP POLICY IF EXISTS "Experts can update themselves" ON public.experts;

CREATE POLICY "Experts can only update their own records" 
ON public.experts 
FOR UPDATE 
USING (auth.uid() = user_id);
-- Add DELETE policies to prevent unauthorized data deletion

-- Sessions: Only creator can delete their sessions
CREATE POLICY "Only session creator can delete sessions"
ON public.sessions
FOR DELETE
USING (auth.uid() = created_by);

-- Experts: Users can remove themselves from sessions
CREATE POLICY "Experts can delete their own records"
ON public.experts
FOR DELETE
USING (auth.uid() = user_id);

-- Objects: Only session creator can delete objects
CREATE POLICY "Only session creator can delete objects"
ON public.objects
FOR DELETE
USING (
  auth.uid() IN (
    SELECT created_by 
    FROM public.sessions 
    WHERE id = objects.session_id
  )
);

-- Votes: Experts can delete their own votes
CREATE POLICY "Experts can delete their own votes"
ON public.votes
FOR DELETE
USING (
  expert_id IN (
    SELECT id 
    FROM public.experts 
    WHERE user_id = auth.uid()
  )
);
-- Fix vote manipulation vulnerability: restrict vote updates to own votes only
DROP POLICY IF EXISTS "Anyone can update votes" ON public.votes;

CREATE POLICY "Experts can only update their own votes"
ON public.votes
FOR UPDATE
USING (
  expert_id IN (
    SELECT id FROM public.experts WHERE user_id = auth.uid()
  )
);

-- Fix expert records RLS bypass: make user_id NOT NULL
ALTER TABLE public.experts 
ALTER COLUMN user_id SET NOT NULL;
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  session_code TEXT UNIQUE NOT NULL,
  experts_count INTEGER NOT NULL,
  objects_count INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('ranking', 'pairwise', 'direct', 'churchman')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'voting', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create experts table
CREATE TABLE public.experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  has_voted BOOLEAN DEFAULT false,
  UNIQUE(session_id, nickname)
);

-- Create objects table
CREATE TABLE public.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  object_name TEXT NOT NULL,
  object_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  vote_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, expert_id, object_id)
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);

CREATE POLICY "Experts are viewable by everyone" ON public.experts FOR SELECT USING (true);
CREATE POLICY "Anyone can join as expert" ON public.experts FOR INSERT WITH CHECK (true);
CREATE POLICY "Experts can update themselves" ON public.experts FOR UPDATE USING (true);

CREATE POLICY "Objects are viewable by everyone" ON public.objects FOR SELECT USING (true);
CREATE POLICY "Anyone can create objects" ON public.objects FOR INSERT WITH CHECK (true);

CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON public.votes FOR UPDATE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.experts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.objects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;

-- Create function to generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.sessions WHERE session_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
-- Enable full replica identity for sessions table to capture all column changes
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
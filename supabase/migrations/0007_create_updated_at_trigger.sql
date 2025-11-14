-- Migration: Create updated_at trigger function and triggers
-- This migration creates a trigger function to automatically update the updated_at column
-- and applies it to all tables

-- Create trigger function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $FUNCTION$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $FUNCTION$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create triggers for each table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
    AND tgrelid = 'public.advertisers'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.advertisers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
    AND tgrelid = 'public.influencers'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.influencers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
    AND tgrelid = 'public.campaigns'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at'
    AND tgrelid = 'public.applications'::regclass
  ) THEN
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

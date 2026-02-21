import { createClient } from '@supabase/supabase-js';

// ---- JOUW ECHTE SUPABASE PROJECT ----
// (uit jouw bericht — deze twee MOETEN bij elkaar horen)

const SUPABASE_URL = 'https://myvxnozclbxyukctksno.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dnhub3pjbGJ4eXVrY3Rrc25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTQ2MjcsImV4cCI6MjA4MDY5MDYyN30.X6gMzDJRGzGao8JP_cLQGwZsOcmDDnn02OEekbzYT9c';

// ---- OFFICIËLE ENIGE CLIENT ----

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- OPTIONAL COMPATIBILITY WRAPPER ----

export type DatabaseClient = typeof supabase;
export const databaseClient: DatabaseClient = supabase;

// data/supabaseClient.js
// Ponto único de configuração do Supabase.
// Nunca importe @supabase/supabase-js em outro lugar do projeto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://hpemkfzqbhbzjepbxvwh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZW1rZnpxYmhiemplcGJ4dndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjEzNDcsImV4cCI6MjEwNDAzNzM0N30.CzlL1NH5RZeqUSgsk2YXZ8_-OuIkebStFEsXNNw7Ehw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
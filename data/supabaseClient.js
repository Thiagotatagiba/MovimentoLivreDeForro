// data/supabaseClient.js
// Ponto único de configuração do Supabase.
// Nunca importe @supabase/supabase-js em outro lugar do projeto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'COLOQUE_SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'COLOQUE_SUA_ANON_KEY_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// services/authService.js
// Camada de autenticação. Páginas e componentes nunca falam
// direto com o supabase.auth — sempre passam por aqui.

import { supabase } from '../data/supabaseClient.js';

export async function loginComMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function loginComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw error;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function obterUsuarioAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Callback é chamado com o usuário (ou null) sempre que a sessão muda:
// login, logout, refresh de token, retorno do magic link/OAuth.
export function aoMudarAutenticacao(callback) {
  const { data: subscription } = supabase.auth.onAuthStateChange((_evento, sessao) => {
    callback(sessao?.user ?? null);
  });
  return subscription;
}

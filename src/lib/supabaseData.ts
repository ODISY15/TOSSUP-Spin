import supabase from './supabase';

export type ThemeRow = {
  id: number;
  slug: string;
  name: string;
  symbol: string;
  variants: unknown;
};

export type SuggestionRow = { id: number; label: string };
export type CollectionRow = { id: number; category: string; name: string; mode: string; options: string[] };
export type ResultMessageRow = { id: number; message: string; animation: string };
export type PresetRow = { id: number; name: string; options: string[]; created_at: string };

const ordered = async <T>(table: string) => {
  const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true });
  if (error) throw error;
  return (data || []) as T[];
};

/** Browser-safe reads. Public catalog tables have anonymous SELECT policies in schema.sql. */
export const loadFrontendCatalog = async () => {
  const [themes, suggestions, collections, resultMessages] = await Promise.all([
    ordered<ThemeRow>('themes'),
    ordered<SuggestionRow>('suggestions'),
    ordered<CollectionRow>('option_collections'),
    ordered<ResultMessageRow>('result_messages'),
  ]);
  return { themes, suggestions, collections, resultMessages };
};

/** User-owned presets use the browser session and are constrained by Supabase RLS. */
export const loadPresets = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('presets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PresetRow[];
};

export const savePreset = async (name: string, options: string[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to use presets.');
  const { count, error: countError } = await supabase.from('presets').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (countError) throw countError;
  if ((count || 0) >= 30) throw new Error('Maximum of 30 saved wheels reached. Delete one to save another.');
  const { data, error } = await supabase.from('presets').insert({ user_id: user.id, name, options }).select('*').single();
  if (error) throw error;
  return data as PresetRow;
};

export const deletePreset = async (id: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to use presets.');
  const { error } = await supabase.from('presets').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
};

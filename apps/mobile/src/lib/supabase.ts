import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Reemplaza estas constantes con las de tu proyecto de Supabase si no usas variables de entorno (.env)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jkoxmyefjmokdycjlfqb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb3hteWVmam1va2R5Y2psZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDc4MjcsImV4cCI6MjEwNDEyMzgyN30.bHXjMvEIOylLCX1WiPf1zg5Z7WX1NLESN1UgZhbwz90';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

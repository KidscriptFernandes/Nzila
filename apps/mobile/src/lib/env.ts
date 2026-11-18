const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const env = {
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
  whatsappNumber: (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER ?? "244923000000").replace(/\D/g, ""),
  devAuthToken: process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN ?? "",
  devAuthEmail: process.env.EXPO_PUBLIC_DEV_AUTH_EMAIL ?? "cliente1@nzila.ao",
  devAuthUserId: process.env.EXPO_PUBLIC_DEV_AUTH_USER_ID ?? "",
};

export const supabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const env = {
  apiUrl: rawApiUrl.replace(/\/+$/, ""),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
  whatsappNumber: (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER ?? "244923000000").replace(/\D/g, ""),
};

export const supabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DRIVER_DOCS_BUCKET = "driver-docs";
export const DRIVER_PHOTOS_BUCKET = "driver-photos";
export const PUBLIC_ASSETS_BUCKET = "public-assets";

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabaseConfigured } from "./env";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export class GoogleAuthNotConfiguredError extends Error {
  constructor() {
    super("Supabase not configured for Google authentication");
    this.name = "GoogleAuthNotConfiguredError";
  }
}

function extractCallbackParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [withoutHash = "", hash = ""] = url.split("#");
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";

  for (const part of [query, hash]) {
    if (!part) continue;
    const parsed = new URLSearchParams(part);
    parsed.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

export async function authenticateWithGoogle(): Promise<string | null> {
  if (!supabaseConfigured) {
    throw new GoogleAuthNotConfiguredError();
  }

  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data?.url) {
    throw error ?? new Error("Não foi possível iniciar a autenticação Google.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    return null;
  }

  const params = extractCallbackParams(result.url);
  const oauthError = params.get("error_description") ?? params.get("error");
  if (oauthError) {
    throw new Error(oauthError);
  }

  const code = params.get("code");
  if (code) {
    const { data: exchanged, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError || !exchanged.session?.access_token) {
      throw exchangeError ?? new Error("Falha ao concluir sessão Google.");
    }
    return exchanged.session.access_token;
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken) {
    throw new Error("Token Google não recebido.");
  }

  if (refreshToken) {
    await supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .catch(() => undefined);
  }

  return accessToken;
}


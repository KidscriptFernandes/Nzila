import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Nzila Concierge",
  slug: "nzila",
  owner: "filipe_fernandes",
  scheme: "nzila",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "ao.nzila.concierge",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    },
  },
  android: {
    package: "ao.nzila.concierge",
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: "#F7F0E3",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
      },
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#F7F0E3",
      },
    ],
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission:
          "A Nzila usa as tuas fotos apenas para anexar imagens à conversa do local.",
      },
    ],
    "expo-localization",
    ["expo-notifications", { color: "#CC092F" }],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Usamos a tua localização para sugerir pontos de recolha em Luanda.",
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    eas: {
      projectId: "3ac9a26b-f47e-4e27-b1e1-e748ea6d1b9c",
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
    whatsappNumber: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER ?? "244923000000",
  },
});

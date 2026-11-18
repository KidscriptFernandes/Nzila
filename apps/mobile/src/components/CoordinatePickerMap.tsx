import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { buildOsmPickerHtml } from "@/lib/osm-map";

export function CoordinatePickerMap({
  value,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  onPick: (coordinate: { lat: number; lng: number }) => void;
}) {
  const { t } = useTranslation();
  const [html] = useState(() => buildOsmPickerHtml(value, t("map.mapUnavailable")));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        lat?: number;
        lng?: number;
      };
      if (data.type !== "pick" || typeof data.lat !== "number" || typeof data.lng !== "number") {
        return;
      }
      onPick({ lat: data.lat, lng: data.lng });
    } catch {
      return;
    }
  };

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1, backgroundColor: "#efe7d8" }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onMessage={handleMessage}
    />
  );
}

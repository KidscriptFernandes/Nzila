import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { PlaceDTO } from "@nzila/shared";
import { buildOsmPlacesHtml } from "@/lib/osm-map";

export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceDTO[];
  selectedId: string | null;
  onSelect: (place: PlaceDTO) => void;
}) {
  const { t } = useTranslation();
  const unavailable = t("map.mapUnavailable");
  const html = useMemo(
    () => buildOsmPlacesHtml(places, selectedId, unavailable),
    [places, selectedId, unavailable],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
      };
      if (data.type !== "select" || !data.id) return;
      const place = places.find((item) => item.id === data.id);
      if (place) onSelect(place);
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

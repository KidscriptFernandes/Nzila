import { useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export function CoordinatePickerMap({
  value,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  onPick: (coordinate: { lat: number; lng: number }) => void;
}) {
  const { t } = useTranslation();
  const [lat, setLat] = useState(value ? String(value.lat) : "-8.839");
  const [lng, setLng] = useState(value ? String(value.lng) : "13.289");

  return (
    <View className="flex-1 justify-center gap-3 rounded-2xl border border-line bg-surface p-4 dark:border-night-line dark:bg-coal">
      <Text className="font-body text-sm text-ink-soft dark:text-night-muted">
        {t("map.mapUnavailable")}
      </Text>
      <Input label="Latitude" value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
      <Input label="Longitude" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
      <Button
        label={t("common.confirm")}
        onPress={() => {
          const latitude = Number(lat);
          const longitude = Number(lng);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            onPick({ lat: latitude, lng: longitude });
          }
        }}
      />
    </View>
  );
}

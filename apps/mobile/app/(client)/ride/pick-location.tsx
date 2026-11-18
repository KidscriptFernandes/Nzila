import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CoordinatePickerMap } from "@/components/CoordinatePickerMap";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { notify } from "@/lib/dialogs";
import { useRideDraft } from "@/store/ride-draft";

type Coordinate = { lat: number; lng: number };

async function labelFor(coordinate: Coordinate): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coordinate.lat,
      longitude: coordinate.lng,
    });
    if (!place) return `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`;
    const label = [place.name ?? place.street, place.city, place.region]
      .filter(Boolean)
      .join(", ");
    return label || `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`;
  } catch {
    return `${coordinate.lat.toFixed(4)}, ${coordinate.lng.toFixed(4)}`;
  }
}

export default function PickLocationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = params.kind === "destination" ? "destination" : "origin";
  const originPin = useRideDraft((state) => state.originPin);
  const destinationPin = useRideDraft((state) => state.destinationPin);
  const setOriginPin = useRideDraft((state) => state.setOriginPin);
  const setDestinationPin = useRideDraft((state) => state.setDestinationPin);
  const existing = kind === "origin" ? originPin : destinationPin;
  const [coordinate, setCoordinate] = useState<Coordinate | null>(
    existing ? { lat: existing.lat, lng: existing.lng } : null,
  );
  const [loadingLocation, setLoadingLocation] = useState(false);

  const useCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        notify(t("common.error"), t("rideForm.locationDenied"));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordinate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      notify(t("common.error"), t("rideForm.locationDenied"));
    } finally {
      setLoadingLocation(false);
    }
  };

  const confirm = async () => {
    if (!coordinate) return;
    const label = await labelFor(coordinate);
    const pin = { ...coordinate, label };
    if (kind === "origin") setOriginPin(pin);
    else setDestinationPin(pin);
    router.back();
  };

  return (
    <Screen>
      <ScreenHeader
        back
        title={kind === "origin" ? t("rideForm.pinOrigin") : t("rideForm.pinDestination")}
        subtitle={t("rideForm.pickHint")}
      />

      <View className="mx-5 flex-1 overflow-hidden rounded-2xl border border-line dark:border-night-line">
        <CoordinatePickerMap
          value={coordinate}
          onPick={(next) => setCoordinate(next)}
        />
      </View>

      <View className="gap-3 px-5 pb-4 pt-4">
        {coordinate ? (
          <Card className="py-3">
            <Text className="font-body text-sm text-ink dark:text-nzila-sand">
              {t("rideForm.coordinates", {
                lat: coordinate.lat.toFixed(5),
                lng: coordinate.lng.toFixed(5),
              })}
            </Text>
          </Card>
        ) : null}

        <Button
          label={t("rideForm.useMyLocation")}
          variant="outline"
          leftIcon={<Crosshair size={17} color="#CC092F" />}
          loading={loadingLocation}
          onPress={() => void useCurrentLocation()}
        />
        <Button
          label={t("rideForm.confirmPin")}
          size="lg"
          fullWidth
          disabled={!coordinate}
          onPress={() => void confirm()}
        />
      </View>
    </Screen>
  );
}

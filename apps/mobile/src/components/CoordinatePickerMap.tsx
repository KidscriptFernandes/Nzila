import { useState } from "react";
import { Pressable, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";

const LUANDA = {
  latitude: -8.839,
  longitude: 13.289,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export function CoordinatePickerMap({
  value,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  onPick: (coordinate: { lat: number; lng: number }) => void;
}) {
  const [preview, setPreview] = useState(value);

  const handlePress = (event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;
    const next = { lat: coordinate.latitude, lng: coordinate.longitude };
    setPreview(next);
    onPick(next);
  };

  return (
    <View className="flex-1 overflow-hidden rounded-2xl">
      <MapView
        style={{ flex: 1 }}
        initialRegion={
          value
            ? {
                latitude: value.lat,
                longitude: value.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : LUANDA
        }
        onPress={handlePress}
        toolbarEnabled={false}
      >
        {preview ? (
          <Marker
            coordinate={{ latitude: preview.lat, longitude: preview.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Pressable className="h-7 w-7 rounded-full border-4 border-white bg-nzila-red" />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

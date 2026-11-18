import { useEffect, useRef } from "react";
import MapView, { Marker } from "react-native-maps";
import { View } from "react-native";
import { PLACE_CATEGORY_META, type PlaceDTO } from "@nzila/shared";

const LUANDA = {
  latitude: -8.839,
  longitude: 13.289,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export function PlacesMap({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceDTO[];
  selectedId: string | null;
  onSelect: (place: PlaceDTO) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const selected = places.find((place) => place.id === selectedId) ?? null;
  const focusLat = selected?.lat;
  const focusLng = selected?.lng;

  useEffect(() => {
    if (focusLat === undefined || focusLng === undefined) return;
    mapRef.current?.animateToRegion(
      {
        latitude: focusLat,
        longitude: focusLng,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      },
      450,
    );
  }, [focusLat, focusLng]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={LUANDA}
      toolbarEnabled={false}
      showsCompass={false}
      showsPointsOfInterests={false}
    >
      {places.map((place) => {
        const meta = PLACE_CATEGORY_META[place.category];
        const isSelected = place.id === selectedId;
        return (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={() => onSelect(place)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: isSelected ? 28 : 18,
                height: isSelected ? 28 : 18,
                borderRadius: 999,
                backgroundColor: meta.color,
                borderWidth: 3,
                borderColor: "#FFFFFF",
              }}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}

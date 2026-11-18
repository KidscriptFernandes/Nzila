import { createElement, useMemo } from "react";
import { View } from "react-native";
import type { PlaceDTO } from "@nzila/shared";

const LUANDA = { lat: -8.839, lng: 13.289 };

export function PlacesMap({
  places,
  selectedId,
}: {
  places: PlaceDTO[];
  selectedId: string | null;
  onSelect: (place: PlaceDTO) => void;
}) {
  const src = useMemo(() => {
    const target = places.find((place) => place.id === selectedId) ?? places[0];
    const center = target ? { lat: target.lat, lng: target.lng } : LUANDA;
    const delta = target ? 0.02 : 0.18;
    const bbox = [
      center.lng - delta,
      center.lat - delta,
      center.lng + delta,
      center.lat + delta,
    ]
      .map((value) => value.toFixed(5))
      .join("%2C");

    const marker = target
      ? `&marker=${target.lat.toFixed(5)}%2C${target.lng.toFixed(5)}`
      : "";

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
  }, [places, selectedId]);

  return (
    <View className="flex-1">
      {createElement("iframe", {
        src,
        title: "Mapa de Luanda",
        loading: "lazy",
        style: {
          border: 0,
          width: "100%",
          height: "100%",
        },
      })}
    </View>
  );
}

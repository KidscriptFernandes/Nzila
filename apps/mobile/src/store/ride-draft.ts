import { create } from "zustand";

export interface PickedLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface RideDraftState {
  originPin: PickedLocation | null;
  destinationPin: PickedLocation | null;
  setOriginPin: (pin: PickedLocation | null) => void;
  setDestinationPin: (pin: PickedLocation | null) => void;
  clearPins: () => void;
}

export const useRideDraft = create<RideDraftState>((set) => ({
  originPin: null,
  destinationPin: null,
  setOriginPin: (originPin) => set({ originPin }),
  setDestinationPin: (destinationPin) => set({ destinationPin }),
  clearPins: () => set({ originPin: null, destinationPin: null }),
}));

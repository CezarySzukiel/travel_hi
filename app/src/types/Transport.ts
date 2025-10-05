export type TransportMode = "walk" | "bike" | "car" | "train" | "tram" | "unknown";

export type Sample = {
  ts: number;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speedFromAPI?: number | null;
};

export type DetectResult = {
  mode: TransportMode;
  speedKmh: number;
  samples: Sample[];
  nearbyHint?: string | null;
  alternates?: TransportMode[];
};
export type TransportMode = "walk" | "bike" | "car" | "train" | "unknown";

export type Sample = { ts: number; lat: number; lng: number; speedFromAPI?: number | null };
export type DetectResult = { mode: TransportMode; speedKmh: number; samples: Sample[] };
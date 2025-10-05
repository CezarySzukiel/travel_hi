import type { DetectResult, Sample, TransportMode } from "../types/Transport";

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

export function estimateSpeedKmh(samples: Sample[]): number {
  const MIN_DT_S = 1.0;
  const MIN_MOVE_M = 8;
  const MAX_JUMP_MPS = 40; // ~144 km/h
  const MAX_ACC_M = 50;

  const speedsMs: number[] = [];

  for (const s of samples) {
    if (typeof s.speedFromAPI === "number" && isFinite(s.speedFromAPI) && s.speedFromAPI >= 0 && (s.accuracy ?? 0) <= MAX_ACC_M) {
      speedsMs.push(s.speedFromAPI);
    }
  }

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const dt = (b.ts - a.ts) / 1000;
    if (dt < MIN_DT_S) continue;

    const accA = a.accuracy ?? 0;
    const accB = b.accuracy ?? 0;
    if ((accA && accA > MAX_ACC_M) || (accB && accB > MAX_ACC_M)) continue;

    const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    const accGate = Math.max(MIN_MOVE_M, accA, accB);
    if (dist < accGate) continue;

    const v = dist / dt;
    if (!isFinite(v) || v < 0) continue;
    if (v > MAX_JUMP_MPS) continue;

    speedsMs.push(v);
  }

  if (speedsMs.length === 0) return 0;
  speedsMs.sort((x, y) => x - y);
  return percentile(speedsMs, 0.6) * 3.6; // km/h
}

export function isStationary(samples: Sample[]): boolean {
  if (samples.length < 3) return false;
  const MAX_RADIUS_M = 25;
  const lat0 = samples[0].lat, lng0 = samples[0].lng;
  let maxDist = 0;
  for (const s of samples) maxDist = Math.max(maxDist, haversineMeters(lat0, lng0, s.lat, s.lng));
  return maxDist <= MAX_RADIUS_M;
}

export function classifyMode(speedKmh: number): TransportMode {
  if (!isFinite(speedKmh) || speedKmh <= 0) return "unknown";
  if (speedKmh < 6) return "walk";
  if (speedKmh < 20) return "bike";
  if (speedKmh < 90) return "car";
  return "train";
}

export function alternatesFor(speedKmh: number): TransportMode[] {
  const out: TransportMode[] = [];
  if (speedKmh >= 2 && speedKmh < 10) out.push("walk", "bike");
  else if (speedKmh >= 10 && speedKmh < 40) out.push("bike", "car");
  else if (speedKmh >= 40 && speedKmh < 120) out.push("car", "train");
  else if (speedKmh >= 120) out.push("train", "car");
  return Array.from(new Set(out));
}

export function makeUnknownResult(): DetectResult {
  return {
    mode: "unknown",
    speedKmh: 0,
    samples: [],
    nearbyHint: null,
    alternates: ["walk", "bike", "car", "train"],
  };
}

export async function findTransitHint(sample: Sample): Promise<string | null> {
  const g = (window as any).google;
  if (!g?.maps?.places) return null;

  const loc = new g.maps.LatLng(sample.lat, sample.lng);
  const svc = new g.maps.places.PlacesService(document.createElement("div"));

  return new Promise((resolve) => {
    svc.nearbySearch(
      { location: loc, radius: 250, type: ["transit_station", "train_station", "bus_station", "subway_station", "light_rail_station"] } as any,
      (results: any[], status: any) => {
        if (status === g.maps.places.PlacesServiceStatus.OK && results?.length) {
          resolve(`W pobliżu: ${results[0]?.name ?? "przystanek/stacja"}`);
        } else {
          resolve(null);
        }
      }
    );
  });
}
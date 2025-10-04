import type { TransportMode, Sample} from "../types/Transport"


export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3, toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateSpeedKmh(samples: Sample[]): number {
    const speedsMs: number[] = [];
    for (const s of samples) if (typeof s.speedFromAPI === "number" && isFinite(s.speedFromAPI) && s.speedFromAPI >= 0) speedsMs.push(s.speedFromAPI);
    for (let i = 1; i < samples.length; i++) {
        const a = samples[i - 1], b = samples[i], dt = (b.ts - a.ts) / 1000;
        if (dt > 0) {
            const v = haversineMeters(a.lat, a.lng, b.lat, b.lng) / dt;
            if (isFinite(v) && v >= 0) speedsMs.push(v);
        }
    }
    if (!speedsMs.length) return 0;
    speedsMs.sort((x, y) => x - y);
    const mid = Math.floor(speedsMs.length / 2);
    const medianMs = speedsMs.length % 2 ? speedsMs[mid] : (speedsMs[mid - 1] + speedsMs[mid]) / 2;
    return medianMs * 3.6;
}

export function classifyMode(v: number): TransportMode {
    if (!isFinite(v) || v <= 0) return "unknown";
    if (v < 6) return "walk";
    if (v < 20) return "bike";
    if (v < 90) return "car";
    return "train";
}
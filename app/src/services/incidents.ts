export type Incident = {
    id: string;
    title: string;
    description?: string | null;
    lat: number;
    lng: number;
    created_at?: string;
};

export async function fetchIncidents(limit = 20): Promise<Incident[]> {
    const res = await fetch(`/api/v1/incidents?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
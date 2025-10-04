export type Severity = "low" | "medium" | "high";

export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: Severity;
    lat: number;
    lng: number;
}

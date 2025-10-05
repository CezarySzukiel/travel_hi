import { ENV } from "../config/env";

export interface User {
    id: number;
    name: string;
    email: string;
    points: number;
}

export interface Incident {
    id: number;
    title: string;
    created_at: string;
    status: "pending" | "verified" | "resolved";
}

export async function getUserProfile(): Promise<User> {
    const token = localStorage.getItem("token");
    const res = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) throw new Error(`Błąd API: ${res.status}`);
    return res.json();
}

export async function getUserIncidents(page = 1, limit = 5): Promise<{ data: Incident[]; total: number }> {
    const res = await fetch(`${ENV.API_BASE_URL}/users/me/incidents?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Błąd API: ${res.status}`);
    return res.json();
}

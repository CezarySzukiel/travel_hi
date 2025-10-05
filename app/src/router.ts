import {createBrowserRouter, redirect} from "react-router-dom";

function isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
}

export async function protectedLoader() {
    if (!isAuthenticated()) {
        throw redirect("/login?next=/dashboard");
    }
    return null;
}

export async function rootLoader() {
    const user = isAuthenticated() ? {name: "Paweł"} : null;
    return {user};
}

export const router = createBrowserRouter([
    {
        id: "root",
        path: "/",
        loader: rootLoader,
        lazy: async () => {
            const mod = await import("./pages/RootLayout");
            const err = await import("./pages/Errors");
            return {Component: mod.RootLayout, ErrorBoundary: err.RootErrorBoundary};
        },
        children: [
            // Home
            {
                index: true,
                lazy: async () => ({Component: (await import("./pages/Intro")).default}),
            },
            // Dashboard
            {
                path: "events",
                lazy: async () => ({Component: (await import("./pages/Home")).default}),
            },
            // Incidents
            {
                path: "travel",
                lazy: async () => ({Component: (await import("./pages/Incidents")).default}),
            },
            // Debug
            {
                path: "debug",
                lazy: async () => ({Component: (await import("./pages/GeoDebug")).default}),
            },
            {
                path: "profile",
                //loader: protectedLoader, // 🔒 dostęp tylko po zalogowaniu
                lazy: async () => {
                    const mod = await import("./pages/UserProfile");
                    return {Component: mod.default};
                },
            },
            {
                path: "login",
                lazy: async () => {
                    const mod = await import("./pages/LoginPage");
                    return {Component: mod.default};
                },
            },
            {
                path: "planner",
                lazy: async () => ({Component: (await import("./pages/Planner")).default}),
            },
            // 404
            {
                path: "*",
                lazy: async () => ({Component: (await import("./pages/NotFound")).default}),
            },
        ],
    },
]);
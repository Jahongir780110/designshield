const BASE_URL = "http://localhost:5000/api";

export const getStoredToken = () => localStorage.getItem("ds_web_token") || "";
export const setStoredToken = (token: string) => localStorage.setItem("ds_web_token", token);
export const clearStoredToken = () => localStorage.removeItem("ds_web_token");

/**
 * Universal fetch wrapper with automatic JWT authorization header injection
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getStoredToken();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "An unexpected API error occurred");
    }

    return data;
}
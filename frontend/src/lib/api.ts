/**
 * API utilities for making authenticated requests
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
}

/**
 * Make an authenticated API request
 */
export async function fetchAPI(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    // Merge existing headers
    if (options.headers) {
        const existingHeaders = new Headers(options.headers);
        existingHeaders.forEach((value, key) => {
            headers[key] = value;
        });
    }

    // Add Authorization header if token exists
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            window.location.href = "/login";
        }
        throw new Error("Unauthorized");
    }

    return response;
}

/**
 * GET request with authentication
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
    const response = await fetchAPI(endpoint);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * POST request with authentication
 */
export async function apiPost<T = any>(
    endpoint: string,
    data?: any
): Promise<T> {
    const response = await fetchAPI(endpoint, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * PUT request with authentication
 */
export async function apiPut<T = any>(
    endpoint: string,
    data?: any
): Promise<T> {
    const response = await fetchAPI(endpoint, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * DELETE request with authentication
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
    const response = await fetchAPI(endpoint, {
        method: "DELETE",
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

export { API_URL };

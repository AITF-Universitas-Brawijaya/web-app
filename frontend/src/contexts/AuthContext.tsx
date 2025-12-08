"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ParticlesBackground } from "@/components/ui/ParticlesBackground";

interface User {
    id: number;
    username: string;
    full_name: string;
    email?: string;
    phone?: string;
    role: string;
    created_at?: string;
    last_login?: string;
    dark_mode?: boolean;
    compact_mode?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const router = useRouter();

    // Load auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem("auth_token");
        const storedUser = localStorage.getItem("auth_user");

        if (storedToken && storedUser) {
            setToken(storedToken);
            const userData = JSON.parse(storedUser);
            setUser(userData);

            // Apply user preferences to DOM
            applyUserPreferences(userData);
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Login failed");
            }

            const data = await response.json();

            // Store token and user info
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("auth_user", JSON.stringify(data.user));

            setToken(data.access_token);
            setUser(data.user);

            // Apply user preferences to DOM
            applyUserPreferences(data.user);
        } catch (error: any) {
            console.error("Login error:", error);
            throw error;
        }
    };

    // Helper function to apply user preferences
    const applyUserPreferences = (userData: User) => {
        // Apply dark mode
        if (userData.dark_mode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }

        // Apply compact mode
        localStorage.setItem("compactMode", userData.compact_mode ? "true" : "false");
    };

    const logout = () => {
        setIsLoggingOut(true);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        setToken(null);
        setUser(null);

        // Small delay for visual feedback
        setTimeout(() => {
            router.push("/login");
            setIsLoggingOut(false);
        }, 500);
    };

    const value: AuthContextType = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            {isLoggingOut && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
                >
                    <ParticlesBackground />
                    <div className="relative z-10">
                        <p className="text-white text-lg">Logging out...</p>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

"use client"

import ProtectedAdminRoute from "@/components/auth/ProtectedAdminRoute"
import { useAuth } from "@/contexts/AuthContext"
import UserManagementSection from "@/components/admin/UserManagementSection"
import GeneratorSettingsSection from "@/components/admin/GeneratorSettingsSection"
import DomainManagementSection from "@/components/admin/DomainManagementSection"
import FeedbackSection from "@/components/admin/FeedbackSection"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

export default function AdminPage() {
    const { user, logout } = useAuth()
    const router = useRouter()

    return (
        <ProtectedAdminRoute>
            <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}>
                {/* Header */}
                <header className="border-b bg-card/95 backdrop-blur-sm">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Admin Panel</h1>
                            <p className="text-sm text-muted-foreground">
                                Logged in as: {user?.full_name} ({user?.username})
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                Back to Dashboard
                            </Button>
                            <Button variant="destructive" onClick={logout}>
                                Logout
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8">
                    <div className="space-y-8">
                        {/* Feedback */}
                        <FeedbackSection />

                        {/* User Management */}
                        <UserManagementSection />

                        {/* Generator Settings */}
                        <GeneratorSettingsSection />

                        {/* Domain Management */}
                        <DomainManagementSection />
                    </div>
                </main>
            </div>
        </ProtectedAdminRoute>
    )
}

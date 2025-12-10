"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { ParticlesBackground } from "@/components/ui/ParticlesBackground"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    // Loading state while checking authentication
    return (
      <div
        className="relative flex items-center justify-center min-h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
      >
        <ParticlesBackground />
        <div className="relative z-10">
          <p className="text-white text-lg">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

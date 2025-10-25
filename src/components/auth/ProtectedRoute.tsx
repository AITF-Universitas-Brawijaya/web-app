"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) {
      router.replace("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (isAuthenticated === null) {
    // Loading state biar gak flicker
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Memeriksa sesi pengguna...</p>
      </div>
    )
  }

  return <>{children}</>
}

"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ParticlesBackground } from "@/components/ui/ParticlesBackground"


export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(username, password)
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.replace("/dashboard")
      }, 100)
    } catch (err: any) {
      setError(err.message || "Username atau password salah")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, router])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}>
      <ParticlesBackground />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <Card
          className="w-full max-w-sm p-6 shadow-lg border border-gray-200"
          style={{
            background: 'white'
          }}
        >
          <h1 className="text-2xl font-semibold text-center mb-4 text-gray-800">Masuk ke PRD Analyst</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Username</label>
              <Input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                style={{ backgroundColor: 'white' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ backgroundColor: 'white' }}
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <Button
              type="submit"
              className="w-full text-white font-semibold"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #1DC0EB 0%, #1199DA 50%, #0B88D3 100%)'
              }}
            >
              {loading ? "Memproses..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>Akun Testing:</p>
            <p className="mt-1"><strong>admin</strong> / secret</p>
            <p><strong>verif1</strong> / secret</p>
          </div>
        </Card>

        <div className="w-full max-w-sm">
          <img
            src="/assets/footer.webp"
            alt="Footer"
            className="w-full h-auto rounded-xl"
          />
        </div>
      </div>
    </div>
  )
}

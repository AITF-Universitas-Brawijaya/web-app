"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm p-6 shadow-lg border border-border">
        <h1 className="text-2xl font-semibold text-center mb-4">Masuk ke PRD Analyst</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/80">Username</label>
            <Input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground/80">Password</label>
            <Input
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
            {loading ? "Memproses..." : "Login"}
          </Button>
        </form>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>Akun Testing:</p>
          <p className="mt-1"><strong>admin</strong> / secret</p>
          <p><strong>verif1</strong> / secret</p>
        </div>
      </Card>
    </div>
  )
}

"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Call backend API for authentication
      const formData = new URLSearchParams()
      formData.append('username', email) // OAuth2 uses 'username' field but we pass email
      formData.append('password', password)

      const response = await fetch('http://localhost:8000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()

      // Store token and user info
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', email)

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Email atau password salah")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm p-6 shadow-lg border border-border">
        <h1 className="text-2xl font-semibold text-center mb-4">Masuk ke PRD Analyst</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/80">Email</label>
            <Input
              type="email"
              placeholder="Masukkan email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  )
}

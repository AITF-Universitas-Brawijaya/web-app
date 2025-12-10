"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

export default function ThemeToggle() {
  const [isDark, setDark] = useState<boolean>(
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  )

  return (
    <Button
      variant="outline"
      className="w-full bg-transparent"
      onClick={() => {
        const next = !isDark
        setDark(next)
        if (next) {
          document.documentElement.classList.add("dark")
          localStorage.setItem("theme", "dark")
        } else {
          document.documentElement.classList.remove("dark")
          localStorage.setItem("theme", "light")
        }
      }}
    >
      {isDark ? "Light Mode" : "Dark Mode"}
    </Button>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  LogOut,
  ChevronDown,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Flag,
  BarChart3,
  Moon,
  Sun,
} from "lucide-react"

export default function Sidebar({ activeTab, setActiveTab, tabs, onLogout }: any) {
  const [openProfileMenu, setOpenProfileMenu] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDark, setDark] = useState(false)

  // 🔹 Sync dark mode dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const dark = saved === "dark" || document.documentElement.classList.contains("dark")
    setDark(dark)
  }, [])

  const toggleDarkMode = () => {
    const next = !isDark
    setDark(next)
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const sidebarWidth = isCollapsed ? "w-20" : "w-64"

  const tabIcons: Record<string, any> = {
    all: Home,
    verified: CheckCircle,
    unverified: AlertTriangle, // ⚠️
    "false-positive": XCircle, // ❌
    flagged: Flag,
    summary: BarChart3,
  }

  return (
    <>
      {/* 🔹 Tombol toggle sidebar (mobile only) */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Sidebar"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* 🔹 Sidebar utama */}
      <aside
        className={cn(
          "fixed lg:static top-0 left-0 h-full border-r border-border bg-card flex flex-col transform transition-all duration-300 z-40",
          sidebarWidth,
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header profil kiri atas */}
<div
  className={cn(
    "border-b border-border flex items-center justify-between relative",
    isCollapsed ? "px-2 py-3" : "p-4"
  )}
>
  {!isCollapsed && (
    <div
      className="flex items-center gap-2 cursor-pointer"
      onClick={() => setOpenProfileMenu(!openProfileMenu)}
    >
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
        P
      </div>
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold">PRD Analyst</h1>
        <span className="text-xs text-muted-foreground">Administrator</span>
      </div>
      <ChevronDown
        className={cn(
          "w-4 h-4 text-muted-foreground ml-1 transition-transform",
          openProfileMenu && "rotate-180"
        )}
      />
    </div>
  )}

  {/* Tombol collapse (selalu sejajar) */}
  <Button
    size="icon"
    variant="ghost"
    className={cn(
      "transition-all",
      isCollapsed ? "ml-auto" : "absolute right-2"
    )}
    onClick={() => setIsCollapsed(!isCollapsed)}
    aria-label="Collapse Sidebar"
  >
    {isCollapsed ? (
      <ChevronRight className="h-4 w-4" />
    ) : (
      <ChevronLeft className="h-4 w-4" />
    )}
  </Button>

  {/* Dropdown profil */}
  {openProfileMenu && !isCollapsed && (
    <div className="absolute top-[calc(100%+0.5rem)] left-4 bg-popover border border-border rounded-md shadow-md w-48 z-50 animate-in fade-in slide-in-from-top-1">
      <button
        onClick={() => {
          setOpenProfileMenu(false)
          onLogout()
        }}
        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-muted transition"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  )}
</div>


        {/* Navigasi tab */}
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto thin-scroll">
          {tabs.map((t: any) => {
            const active = activeTab === t.key
            const Icon = tabIcons[t.key] || Home
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key)
                  setIsMobileOpen(false)
                }}
                title={isCollapsed ? t.label : undefined}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-muted text-foreground font-semibold"
                    : "hover:bg-muted/60 text-foreground/80",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && t.label}
              </button>
            )
          })}
        </nav>

        {/* Footer: Dark Mode Toggle */}
        <div
          className={cn(
            "mt-auto p-2 border-t border-border flex flex-col gap-2 transition-all duration-300",
            isCollapsed && "items-center"
          )}
        >
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
            {!isCollapsed && (
              <span className="ml-2">{isDark ? "Light Mode" : "Dark Mode"}</span>
            )}
          </Button>
        </div>
      </aside>

      {/* Overlay hitam (mobile only) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

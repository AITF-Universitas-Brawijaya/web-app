"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
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
  Settings,
} from "lucide-react"

export default function Sidebar({ activeTab, setActiveTab, tabs, onLogout }: any) {
  const router = useRouter()
  const { user } = useAuth()
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

  // Custom SVG Icon Components
  const AllIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M128 128C92.7 128 64 156.7 64 192L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 192C576 156.7 547.3 128 512 128L128 128zM224 384C224 401.7 209.7 416 192 416C174.3 416 160 401.7 160 384C160 366.3 174.3 352 192 352C209.7 352 224 366.3 224 384zM192 288C174.3 288 160 273.7 160 256C160 238.3 174.3 224 192 224C209.7 224 224 238.3 224 256C224 273.7 209.7 288 192 288zM312 232L456 232C469.3 232 480 242.7 480 256C480 269.3 469.3 280 456 280L312 280C298.7 280 288 269.3 288 256C288 242.7 298.7 232 312 232zM312 360L456 360C469.3 360 480 370.7 480 384C480 397.3 469.3 408 456 408L312 408C298.7 408 288 397.3 288 384C288 370.7 298.7 360 312 360z" />
    </svg>
  )

  const VerifiedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160C96 124.7 124.7 96 160 96L480 96zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 283 440.5 289.9 440C296.8 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z" />
    </svg>
  )

  const UnverifiedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 384C302.3 384 288 398.3 288 416C288 433.7 302.3 448 320 448C337.7 448 352 433.7 352 416C352 398.3 337.7 384 320 384zM320 192C301.8 192 287.3 207.5 288.6 225.7L296 329.7C296.9 342.3 307.4 352 319.9 352C332.5 352 342.9 342.3 343.8 329.7L351.2 225.7C352.5 207.5 338.1 192 319.8 192z" />
    </svg>
  )

  const FalsePositiveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM231 231C240.4 221.6 255.6 221.6 264.9 231L319.9 286L374.9 231C384.3 221.6 399.5 221.6 408.8 231C418.1 240.4 418.2 255.6 408.8 264.9L353.8 319.9L408.8 374.9C418.2 384.3 418.2 399.5 408.8 408.8C399.4 418.1 384.2 418.2 374.9 408.8L319.9 353.8L264.9 408.8C255.5 418.2 240.3 418.2 231 408.8C221.7 399.4 221.6 384.2 231 374.9L286 319.9L231 264.9C221.6 255.5 221.6 240.3 231 231z" />
    </svg>
  )

  const FlaggedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M155.7 160C170.3 150.8 180 134.5 180 116C180 87.3 156.7 64 128 64C99.3 64 76 87.3 76 116C76 132.7 83.8 147.5 96 157L96 576L160 576L160 512L533.6 512C548.2 512 560 500.2 560 485.6C560 481.9 559.2 478.3 557.7 474.9L496 336L557.7 197.1C559.2 193.7 560 190.1 560 186.4C560 171.8 548.2 160 533.6 160L155.7 160z" />
    </svg>
  )

  const SummaryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M96 96C113.7 96 128 110.3 128 128L128 464C128 472.8 135.2 480 144 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L144 544C99.8 544 64 508.2 64 464L64 128C64 110.3 78.3 96 96 96zM304 160C310.7 160 317.1 162.8 321.7 167.8L392.8 245.3L439 199C448.4 189.6 463.6 189.6 472.9 199L536.9 263C541.4 267.5 543.9 273.6 543.9 280L543.9 392C543.9 405.3 533.2 416 519.9 416L215.9 416C202.6 416 191.9 405.3 191.9 392L191.9 280C191.9 274 194.2 268.2 198.2 263.8L286.2 167.8C290.7 162.8 297.2 160 303.9 160z" />
    </svg>
  )

  const ManualIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM544 160C557.3 160 568 170.7 568 184L568 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L568 280L568 328C568 341.3 557.3 352 544 352C530.7 352 520 341.3 520 328L520 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232L520 232L520 184C520 170.7 530.7 160 544 160z" />
    </svg>
  )

  const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-4 w-4" fill="currentColor">
      <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z" />
    </svg>
  )

  const tabIcons: Record<string, any> = {
    all: AllIcon,
    verified: VerifiedIcon,
    unverified: UnverifiedIcon,
    "false-positive": FalsePositiveIcon,
    flagged: FlaggedIcon,
    manual: ManualIcon,
    summary: SummaryIcon,
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
          "fixed lg:static top-0 left-0 h-full border-r border-border flex flex-col transform transition-all duration-300 z-40",
          sidebarWidth,
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          backgroundImage: 'url(/assets/sidebar.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Header profil kiri atas */}
        <div
          className={cn(
            "flex items-center justify-between relative",
            isCollapsed ? "px-2 py-3" : "p-4"
          )}
        >
          {isCollapsed ? (
            // Collapsed state: show only logo centered
            <div className="flex items-center justify-center w-full">
              <img
                src="/assets/logo.webp"
                alt="PRD Analyst Logo"
                className="h-8 w-8 object-cover"
              />
            </div>
          ) : (
            // Expanded state: show full profile section
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setOpenProfileMenu(!openProfileMenu)}
            >
              <img
                src="/assets/logo.webp"
                alt="PRD Analyst Logo"
                className="h-8 w-8 object-cover"
              />
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-white">PRD Analyst</h1>
                <span className="text-xs text-white/80">{user?.username || 'User'}</span>
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
              "transition-all hover:bg-transparent",
              isCollapsed ? "ml-auto" : "absolute right-2"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Collapse Sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-white" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-white" />
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
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-muted transition text-foreground"
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
                    ? "bg-white/20 text-white font-semibold"
                    : "hover:bg-white/10 text-white/90",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && t.label}
              </button>
            )
          })}

          {/* Admin Panel Link - Only for administrators */}
          {user?.role === "administrator" && (
            <>
              <div className="" />
              <button
                onClick={() => {
                  router.push("/admin")
                  setIsMobileOpen(false)
                }}
                title={isCollapsed ? "Admin Panel" : undefined}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition",
                  "hover:bg-white/10 text-white/90",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <AdminIcon />
                {!isCollapsed && "Admin Panel"}
              </button>
            </>
          )}
        </nav>

        {/* Footer: Dark Mode Toggle */}
        <div
          className={cn(
            "mt-auto p-2 flex flex-col gap-2 transition-all duration-300",
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
              <span className="ml-2 text-white">{isDark ? "Light Mode" : "Dark Mode"}</span>
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

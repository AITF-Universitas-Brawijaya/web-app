"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LineBase from "@/components/charts/base/LineBaseChart"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { LinkRecord } from "@/types/linkRecord"
import { StaticParticlesBackground } from "@/components/ui/StaticParticlesBackground"
import { useAuth } from "@/contexts/AuthContext"

type TimePeriod = "all-time" | "this-year" | "this-month" | "this-week" | "this-day"

interface Announcement {
    id: number
    title: string
    content: string
    category: string
    created_by: string
    created_at: string
    updated_at: string
}

interface SummaryProps {
    data: LinkRecord[]
    onGoToAll?: () => void // pindah ke tab "all"
}

export default function SummaryDashboard({ data, onGoToAll }: SummaryProps) {
    const router = useRouter()
    const { user } = useAuth()
    const [timePeriod, setTimePeriod] = useState<TimePeriod>("all-time")

    // Announcement states
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [announcementPage, setAnnouncementPage] = useState(1)
    const [totalAnnouncements, setTotalAnnouncements] = useState(0)
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
    const announcementsPerPage = 3

    // Fetch announcements
    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                setLoadingAnnouncements(true)
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

                // Fetch announcements
                const response = await fetch(
                    `${apiUrl}/api/announcements?page=${announcementPage}&limit=${announcementsPerPage}`
                )

                if (response.ok) {
                    const data = await response.json()
                    setAnnouncements(data)
                }

                // Fetch total count
                const countResponse = await fetch(`${apiUrl}/api/announcements/count`)
                if (countResponse.ok) {
                    const countData = await countResponse.json()
                    setTotalAnnouncements(countData.total)
                }
            } catch (error) {
                console.error("Failed to fetch announcements:", error)
            } finally {
                setLoadingAnnouncements(false)
            }
        }

        fetchAnnouncements()
    }, [announcementPage])

    if (!data) return null

    const formatDay = (isoString: string) => isoString.split("T")[0]
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Helper function to check if a date is within the selected period
    const isInPeriod = (dateStr: string, period: TimePeriod): boolean => {
        const date = new Date(dateStr)
        const now = new Date()

        switch (period) {
            case "all-time":
                return true
            case "this-day":
                return formatDay(dateStr) === todayStr
            case "this-week":
                const weekAgo = new Date(now)
                weekAgo.setDate(now.getDate() - 7)
                return date >= weekAgo
            case "this-month":
                return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                )
            case "this-year":
                return date.getFullYear() === now.getFullYear()
            default:
                return true
        }
    }

    if (data.length === 0) {
        return (
            <div className="p-6 space-y-4">
                {/* HEADER GRADIENT */}
                <Card
                    className="p-4 flex items-center justify-between relative overflow-hidden mb-1"
                    style={{
                        background: "linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)",
                        border: "none",
                    }}
                >
                    <StaticParticlesBackground />
                    <div className="relative z-10">
                        <h2 className="text-lg font-semibold text-white">Summary</h2>
                    </div>
                </Card>

                <Card className="p-6">
                    <p className="text-sm text-muted-foreground">
                        Belum ada data. Tambahkan domain atau jalankan crawler untuk mengisi dashboard.
                    </p>
                </Card>
            </div>
        )
    }

    // =====================
    // AGREGASI
    // =====================
    const crawledPerDay: Record<string, number> = {}
    const verifiedPerDay: Record<string, number> = {}
    let verified = 0
    let unverified = 0
    let falsePositive = 0
    const verifiedByMap: Record<string, number> = {}

    data.forEach((d) => {
        const day = formatDay(d.tanggal)
        crawledPerDay[day] = (crawledPerDay[day] || 0) + 1

        if (d.status === "verified") verified++
        else if (d.status === "unverified") unverified++
        else if (d.status === "false-positive") falsePositive++

        // Track verifications per day
        if (d.status !== "unverified") {
            const verifiedDay = formatDay(d.lastModified ? d.lastModified : d.tanggal)
            verifiedPerDay[verifiedDay] = (verifiedPerDay[verifiedDay] || 0) + 1
        }

        // Filter verifiedByMap based on selected time period
        if (d.modifiedBy && d.status !== "unverified") {
            const baseDate = d.lastModified ? d.lastModified : d.tanggal
            if (isInPeriod(baseDate, timePeriod)) {
                verifiedByMap[d.modifiedBy] = (verifiedByMap[d.modifiedBy] || 0) + 1
            }
        }
    })

    // Get all unique dates from both crawled and verified
    const allDates = new Set([...Object.keys(crawledPerDay), ...Object.keys(verifiedPerDay)])
    const crawledLabels = Array.from(allDates).sort()
    const crawledValues = crawledLabels.map((d) => crawledPerDay[d] || 0)
    const verifiedValues = crawledLabels.map((d) => verifiedPerDay[d] || 0)

    const totalCrawledToday = crawledPerDay[todayStr] ?? 0
    const verifiedRate =
        data.length > 0 ? ((verified / data.length) * 100).toFixed(1) : "0"

    // 10 Domain Terbaru
    const latest = [...data]
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
        .slice(0, 10)

    // Verifikasi Hari Ini
    const verifToday = data.filter((d) => {
        if (d.status === "unverified") return false
        const baseDate = d.lastModified ? d.lastModified : d.tanggal
        return formatDay(baseDate) === todayStr
    })

    const totalVerifHariIni = verifToday.length

    const verifByUserToday: Record<string, number> = {}
    verifToday.forEach((d) => {
        if (d.modifiedBy) {
            verifByUserToday[d.modifiedBy] = (verifByUserToday[d.modifiedBy] || 0) + 1
        }
    })

    let topVerifikatorName = "-"
    let topVerifikatorCount = 0
    Object.entries(verifByUserToday).forEach(([name, count]) => {
        if (count > topVerifikatorCount) {
            topVerifikatorName = name
            topVerifikatorCount = count
        }
    })

    // Data Charts
    const verStatusLabels = ["Terverifikasi", "Belum Terverifikasi", "False Positive"]
    const verStatusValues = [verified, unverified, falsePositive]

    // Sort verifikator by count (descending)
    const verUserEntries = Object.entries(verifiedByMap).sort((a, b) => b[1] - a[1])
    const verUserLabels = verUserEntries.map(([name]) => name)
    const verUserValues = verUserEntries.map(([, count]) => count)

    return (
        <div className="p-6">
            {/* Header */}
            <Card
                className="py-7 px-6 flex justify-between relative overflow-hidden mb-4 rounded-lg"
                style={{
                    background: "linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)",
                    border: "none",
                }}
            >
                <StaticParticlesBackground />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white tracking-wide">
                        Selamat datang, {user?.full_name?.split(' ')[0] || 'User'}
                    </h2>
                    {/* <p className="text-sm text-white/80 mt-1">Dashboard Overview</p> */}
                </div>
            </Card>

            {/* KPI Cards*/}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-4 mb-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Domains</p>
                    <p className="text-2xl font-bold">{data.length}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold">{verified}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">False Positive</p>
                    <p className="text-2xl font-bold">{falsePositive}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Unverified</p>
                    <p className="text-2xl font-bold">{unverified}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Generator Service</p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xl font-bold">Aktif</p>
                    </div>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Reasoning Service</p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xl font-bold">Aktif</p>
                    </div>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">Detection Service</p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <p className="text-xl font-bold">Off</p>
                    </div>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-2">ChatAI Service</p>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xl font-bold">Aktif</p>
                    </div>
                </Card>

            </div>

            {/* Domain Masuk Per Hari */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <LineBase
                    title="Domain masuk & Verifikasi per hari"
                    labels={crawledLabels}
                    datasets={[
                        {
                            label: "Domain Masuk",
                            values: crawledValues,
                            borderColor: "#003D7D",
                            backgroundColor: "rgba(0, 61, 125, 0.1)",
                        },
                        {
                            label: "Total Verifikasi",
                            values: verifiedValues,
                            borderColor: "#16a34a",
                            backgroundColor: "rgba(22, 163, 74, 0.1)",
                        },
                    ]}
                />

                {/* Announcement from Admin */}
                <Card className="p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold">Pengumuman</h2>
                        {user?.role === "administrator" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    router.push("/admin")
                                }}
                            >
                                Kelola
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                        {loadingAnnouncements ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-sm text-muted-foreground">Memuat pengumuman...</p>
                            </div>
                        ) : announcements.length > 0 ? (
                            announcements.map((announcement) => {
                                const categoryColors: Record<string, string> = {
                                    info: "border-primary",
                                    warning: "border-orange-500",
                                    urgent: "border-red-500",
                                    success: "border-green-500",
                                }
                                const borderColor = categoryColors[announcement.category] || "border-primary"

                                return (
                                    <div key={announcement.id} className={`border-l-4 ${borderColor} pl-3 py-2`}>
                                        <h3 className="font-semibold text-sm mb-1">
                                            {announcement.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {announcement.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground italic">
                                            {announcement.created_by} • {new Date(announcement.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Belum ada pengumuman
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalAnnouncements > announcementsPerPage && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAnnouncementPage(prev => Math.max(1, prev - 1))}
                                disabled={announcementPage === 1}
                                className="text-xs"
                            >
                                ← Prev
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Page {announcementPage} of {Math.ceil(totalAnnouncements / announcementsPerPage)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAnnouncementPage(prev => prev + 1)}
                                disabled={announcementPage >= Math.ceil(totalAnnouncements / announcementsPerPage)}
                                className="text-xs"
                            >
                                Next →
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            {/* 10 Domain Terbaru & Verifikasi per Verifikator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Domain terbaru diproses</h2>
                            <p className="text-xs text-muted-foreground">
                                {latest.length} Domain Terbaru
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (onGoToAll) {
                                    onGoToAll()
                                } else {
                                    router.push("/all")
                                }
                            }}
                        >
                            Lihat semua →
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b">
                                <tr className="text-left">
                                    <th className="py-2 pr-4">Domain</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latest.map((d) => (
                                    <tr
                                        key={d.id}
                                        className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                                        onClick={() => router.push(`/links/${d.id}`)}
                                    >
                                        <td className="py-2 pr-4 max-w-[240px] truncate">{d.link}</td>
                                        <td className="py-2 pr-4 capitalize">{d.status}</td>
                                        <td className="py-2 pr-4">{formatDay(d.tanggal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Top Verifikator</h2>
                            <p className="text-xs text-muted-foreground">
                                Berdasarkan jumlah verifikasi
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: "all-time" as TimePeriod, label: "All Time" },
                                { value: "this-year" as TimePeriod, label: "Year" },
                                { value: "this-month" as TimePeriod, label: "Month" },
                                { value: "this-week" as TimePeriod, label: "Week" },
                                { value: "this-day" as TimePeriod, label: "Day" },
                            ].map((period) => (
                                <button
                                    key={period.value}
                                    onClick={() => setTimePeriod(period.value)}
                                    className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${timePeriod === period.value
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                        }`}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>
                        {/* Time Period Filter */}
                    </div>


                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b">
                                <tr className="text-left">
                                    <th className="py-2 pr-2 text-center w-12">#</th>
                                    <th className="py-2 pr-4">Verifikator</th>
                                    <th className="py-2 pr-4 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verUserLabels.length > 0 ? (
                                    verUserLabels.map((verifikator, idx) => (
                                        <tr
                                            key={verifikator}
                                            className="border-b last:border-0 hover:bg-muted/40"
                                        >
                                            <td className="py-2 pr-2 text-center w-12">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-4">{verifikator}</td>
                                            <td className="py-2 pr-4 text-right font-semibold">
                                                {verUserValues[idx]}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                            Belum ada data verifikasi
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    )
}

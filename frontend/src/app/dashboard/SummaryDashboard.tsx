"use client"

import { useRouter } from "next/navigation"
import PieBase from "@/components/charts/base/PieBaseChart"
import BarBase from "@/components/charts/base/BarBaseChart"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { LinkRecord } from "@/types/linkRecord"
import { StaticParticlesBackground } from "@/components/ui/StaticParticlesBackground"

interface SummaryProps {
    data: LinkRecord[]
    onGoToAll?: () => void // pindah ke tab "all"
}

export default function SummaryDashboard({ data, onGoToAll }: SummaryProps) {
    const router = useRouter()

    if (!data) return null

    const formatDay = (isoString: string) => isoString.split("T")[0]
    const today = new Date().toISOString().split("T")[0]

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

        if (d.modifiedBy && d.status !== "unverified") {
            verifiedByMap[d.modifiedBy] = (verifiedByMap[d.modifiedBy] || 0) + 1
        }
    })

    const crawledLabels = Object.keys(crawledPerDay).sort()
    const crawledValues = crawledLabels.map((d) => crawledPerDay[d])

    const totalCrawledToday = crawledPerDay[today] ?? 0
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
        return formatDay(baseDate) === today
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

    const verUserLabels = Object.keys(verifiedByMap)
    const verUserValues = verUserLabels.map((k) => verifiedByMap[k])

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <Card
                className="py-7 px-6 flex items-center justify-between relative overflow-hidden mb-3 rounded-lg"
                style={{
                    background: "linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)",
                    border: "none",
                }}
            >
                <StaticParticlesBackground />
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white tracking-wide">Dashboard Overview</h2>
                </div>
            </Card>

            {/* KPI Cards*/}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total domain</p>
                    <p className="text-3xl font-bold">{data.length}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Crawling hari ini</p>
                    <p className="text-3xl font-bold">{totalCrawledToday}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Terverifikasi</p>
                    <p className="text-3xl font-bold">{verified}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Rasio verifikasi</p>
                    <p className="text-3xl font-bold">{verifiedRate}%</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Belum terverifikasi</p>
                    <p className="text-3xl font-bold">{unverified}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">False positive</p>
                    <p className="text-3xl font-bold">{falsePositive}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total verifikasi hari ini</p>
                    <p className="text-3xl font-bold">{totalVerifHariIni}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Top verifikator hari ini</p>
                    <p className="text-xl font-semibold">{topVerifikatorName}</p>
                    {topVerifikatorName !== "-" && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {topVerifikatorCount} verifikasi
                        </p>
                    )}
                </Card>
            </div>

            {/* Domain Masuk Per Hari */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarBase
                    title="Domain masuk per hari"
                    labels={crawledLabels}
                    values={crawledValues}
                />

                <PieBase
                    title="Ringkasan status verifikasi"
                    labels={verStatusLabels}
                    values={verStatusValues}
                />
            </div>

            {/* 10 Domain Terbaru & Verifikasi per Verifikator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
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
                <BarBase
                    title="Jumlah Verifikasi per Verifikator"
                    labels={verUserLabels}
                    values={verUserValues}
                />
            </div>
        </div>
    )
}

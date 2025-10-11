"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

type Status = "verified" | "unverified" | "false-positive"
type Jenis = "Judi" | "Pornografi" | "Penipuan"

export type LinkRecord = {
  id: number
  link: string
  jenis: Jenis
  kepedean: number
  status: Status
  tanggal: string
  lastModified: string
  reasoning: string
  image: string
  flagged: boolean
}

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch ${url}`)
    return r.json()
  })

const STATUS_LABEL: Record<Status, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-secondary text-foreground" },
  unverified: { label: "Unverified", className: "bg-primary/10 text-primary" },
  "false-positive": { label: "False Positive", className: "bg-destructive/10 text-destructive-foreground" },
}

const TAB_ORDER = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
  { key: "false-positive", label: "False Positive" },
  { key: "flagged", label: "Flagged" },
  { key: "summary", label: "Summary" },
] as const
type TabKey = (typeof TAB_ORDER)[number]["key"]

function confidenceBarColor(v: number) {
  if (v >= 95) return "bg-primary"
  if (v >= 85) return "bg-foreground/60"
  if (v >= 70) return "bg-foreground/40"
  return "bg-foreground/20"
}

function formatDate(d: string | Date) {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export default function PRDDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [search, setSearch] = useState("")
  const [jenisFilter, setJenisFilter] = useState<ReadonlyArray<Jenis>>(["Judi", "Pornografi", "Penipuan"])
  const [sortCol, setSortCol] = useState<"tanggal" | "kepedean">("tanggal")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)

  const { data, error, isLoading, mutate } = useSWR<LinkRecord[]>("/api/links", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  })

  const filtered = useMemo(() => {
    const list = data ?? []
    return list.filter((it) => {
      const matchTab =
        activeTab === "all" ? true : activeTab === "flagged" ? it.flagged : (it.status as string) === activeTab
      const matchJenis = jenisFilter.includes(it.jenis)
      const matchSearch = it.link.toLowerCase().includes(search.toLowerCase())
      return matchTab && matchJenis && matchSearch
    })
  }, [data, activeTab, jenisFilter, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const A = sortCol === "tanggal" ? a.tanggal : a.kepedean
      const B = sortCol === "tanggal" ? b.tanggal : b.kepedean
      const cmp = A > B ? 1 : A < B ? -1 : 0
      return sortOrder === "desc" ? -cmp : cmp
    })
    return list
  }, [filtered, sortCol, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage)

  const [detail, setDetail] = useState<LinkRecord | null>(null)

  const activeCount = useMemo(() => {
    if (!data) return 0
    return data.filter((it) => {
      if (activeTab === "all") return true
      if (activeTab === "flagged") return it.flagged
      return it.status === activeTab
    }).length
  }, [data, activeTab])

  function resetPagination() {
    setPage(1)
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <h1 className="text-base font-semibold text-balance">PRD Engine</h1>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {TAB_ORDER.map((t) => {
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key)
                  resetPagination()
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition",
                  active ? "bg-muted text-foreground font-semibold" : "hover:bg-muted/60 text-foreground/80",
                )}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto p-2 border-t border-border">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden bg-background">
        {/* List view */}
        {activeTab !== "summary" && (
          <div className="h-full flex flex-col gap-4 p-4">
            {/* Control panel */}
            <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">
                  {TAB_ORDER.find((t) => t.key === activeTab)?.label} ({activeCount})
                </h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    // soft revalidate from server
                    mutate()
                  }}
                >
                  Ask AI
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      resetPagination()
                    }}
                    className="pl-8 h-8 text-sm"
                  />
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>

                <SortMenu
                  sortCol={sortCol}
                  sortOrder={sortOrder}
                  onApply={(c, o) => {
                    setSortCol(c)
                    setSortOrder(o)
                  }}
                />

                <FilterMenu
                  value={jenisFilter}
                  onApply={(v) => {
                    setJenisFilter(v)
                    resetPagination()
                  }}
                />

                <Button size="sm" variant="default">
                  Crawling
                </Button>
              </div>
            </Card>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-foreground/80">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium w-[28%]">Link</th>
                    <th className="px-4 py-3 text-left font-medium">Jenis</th>
                    <th className="px-4 py-3 text-left font-medium">Kepercayaan</th>
                    <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                    <th className="px-4 py-3 text-left font-medium">Tgl Berubah</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-foreground/60">
                        Loading...
                      </td>
                    </tr>
                  )}
                  {error && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-destructive">
                        Failed to load data
                      </td>
                    </tr>
                  )}
                  {!isLoading && !error && pageItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-foreground/60">
                        Tidak ada data yang cocok dengan kriteria.
                      </td>
                    </tr>
                  )}
                  {pageItems.map((it) => {
                    const conf = it.kepedean
                    return (
                      <tr key={it.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">
                          <div className="truncate">{it.link}</div>
                        </td>
                        <td className="px-4 py-3">{it.jenis}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-right">{conf}%</span>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={cn("h-2 rounded-full", confidenceBarColor(conf))}
                                style={{ width: `${conf}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{it.tanggal}</td>
                        <td className="px-4 py-3">{it.lastModified}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn("font-semibold", STATUS_LABEL[it.status].className)}>
                            {STATUS_LABEL[it.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-primary hover:underline font-medium" onClick={() => setDetail(it)}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm">
              <PerPage value={perPage} onChange={setPerPage} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary view */}
        {activeTab === "summary" && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <JenisChart data={data ?? []} />
            <TpFpChart data={data ?? []} />
            <ConfidenceChart data={data ?? []} />
          </div>
        )}
      </main>

      {/* Detail modal with chatbot */}
      <DetailModal item={detail} onClose={() => setDetail(null)} onMutate={mutate} />
    </div>
  )
}

function PerPage({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [10, 20, 50]
  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground/70">Rows:</span>
      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <Button key={opt} variant={opt === value ? "default" : "outline"} size="sm" onClick={() => onChange(opt)}>
            {opt}
          </Button>
        ))}
      </div>
    </div>
  )
}

function SortMenu({
  sortCol,
  sortOrder,
  onApply,
}: {
  sortCol: "tanggal" | "kepedean"
  sortOrder: "asc" | "desc"
  onApply: (col: "tanggal" | "kepedean", order: "asc" | "desc") => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        value={sortCol}
        onChange={(e) => onApply(e.target.value as any, sortOrder)}
      >
        <option value="tanggal">Tanggal</option>
        <option value="kepedean">Kepercayaan</option>
      </select>
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        value={sortOrder}
        onChange={(e) => onApply(sortCol, e.target.value as any)}
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </div>
  )
}

function FilterMenu({
  value,
  onApply,
}: {
  value: ReadonlyArray<Jenis>
  onApply: (v: ReadonlyArray<Jenis>) => void
}) {
  const opts: Jenis[] = ["Judi", "Pornografi", "Penipuan"]
  return (
    <div className="flex items-center gap-2">
      {opts.map((o) => {
        const active = value.includes(o)
        return (
          <Button
            key={o}
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => {
              if (active) onApply(value.filter((v) => v !== o))
              else onApply([...value, o])
            }}
          >
            {o}
          </Button>
        )
      })}
    </div>
  )
}

function JenisChart({ data }: { data: LinkRecord[] }) {
  const counts = useMemo(() => {
    const acc: Record<Jenis, number> = { Judi: 0, Pornografi: 0, Penipuan: 0 }
    data.forEach((d) => (acc[d.jenis] += 1))
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [data])

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--chart-5))"]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Distribusi Jenis Konten</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie dataKey="value" data={counts} label>
              {counts.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}

function TpFpChart({ data }: { data: LinkRecord[] }) {
  const tp = data.filter((d) => d.status === "verified").length
  const fp = data.filter((d) => d.status === "false-positive").length
  const rows = [
    { name: "True Positive", value: tp },
    { name: "False Positive", value: fp },
  ]
  const colors = ["hsl(var(--chart-2))", "hsl(var(--destructive))"]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Rasio True Positive vs False Positive</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie dataKey="value" data={rows} label>
              {rows.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}

function ConfidenceChart({ data }: { data: LinkRecord[] }) {
  const bins = { "<85%": 0, "85-94%": 0, ">=95%": 0 }
  data.forEach((d) => {
    if (d.kepedean < 85) bins["<85%"]++
    else if (d.kepedean < 95) bins["85-94%"]++
    else bins[">=95%"]++
  })
  const rows = Object.entries(bins).map(([bucket, value]) => ({ bucket, value }))

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-base mb-4">Distribusi Skor Kepercayaan</h3>
      <ChartContainer config={{}} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  )
}

function ThemeToggle() {
  // minimal theme toggle with localStorage (no SSR dependency)
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

function DetailModal({
  item,
  onClose,
  onMutate,
}: {
  item: LinkRecord | null
  onClose: () => void
  onMutate: () => void
}) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([
    ...(item
      ? [
          {
            role: "assistant" as const,
            text: "Halo, saya siap membantu menganalisis kasus ini. Apa yang ingin Anda ketahui?",
          },
        ]
      : []),
  ])

  if (!item) return null

  async function send() {
    const content = message.trim()
    if (!content) return
    setChat((c) => [...c, { role: "user", text: content }])
    setMessage("")
    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content, item }),
      })
      const data = await res.json()
      setChat((c) => [...c, { role: "assistant", text: data.reply ?? "Maaf, tidak ada balasan." }])
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", text: "Terjadi kesalahan saat menghubungi AI." }])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(next: Status) {
    await fetch("/api/links/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { status: next, lastModified: formatDate(new Date()) } }),
    })
    onMutate()
    onClose()
  }

  async function toggleFlag() {
    await fetch("/api/links/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { flagged: !item.flagged, lastModified: formatDate(new Date()) } }),
    })
    onMutate()
  }

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Info Detail</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs font-semibold mb-2">Link</div>
              <div className="flex items-center gap-2">
                <Input readOnly value={item.link} className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(item.link)}
                  aria-label="Copy link"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 16h8a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Button>
                <Button variant={item.flagged ? "default" : "outline"} size="sm" onClick={toggleFlag}>
                  {item.flagged ? "Unflag" : "Flag"}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">Reasoning</div>
              <div className="text-sm border border-border rounded-md p-3 bg-card">{item.reasoning}</div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-2">Gambar Terkait</div>
              <img
                src={`/placeholder.svg?height=240&width=360&query=Gambar%20terkait%20kasus`}
                alt="Gambar terkait kasus"
                className="rounded-md w-full h-auto object-cover"
              />
            </div>

            <div className="mt-auto">
              <div className="text-xs font-semibold mb-2">Verifikasi Status Laporan Mesin</div>
              {item.status === "unverified" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full" onClick={() => updateStatus("verified")}>
                    Confirm
                  </Button>
                  <Button className="w-full" variant="destructive" onClick={() => updateStatus("false-positive")}>
                    False Positive
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {item.status !== "false-positive" && (
                    <Button variant="destructive" onClick={() => updateStatus("false-positive")}>
                      Ubah ke False Positive
                    </Button>
                  )}
                  {item.status !== "verified" && (
                    <Button onClick={() => updateStatus("verified")}>Ubah ke Verified</Button>
                  )}
                  {item.status !== "unverified" && (
                    <Button variant="outline" onClick={() => updateStatus("unverified")}>
                      Ubah ke Unverified
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Chat */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.map((m, i) => (
                <div key={i} className={cn("text-sm flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[75%]",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-foreground/60">...</div>}
            </div>
            <div className="border-t border-border p-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tanya tentang kasus ini..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <Button onClick={send} disabled={loading}>
                  Kirim
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

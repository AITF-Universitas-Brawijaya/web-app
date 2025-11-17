"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"

// layout & controls
import Sidebar from "@/components/layout/Sidebar"
import ThemeToggle from "@/components/layout/ThemeToggle"
import { SortMenu } from "@/components/controls/SortMenu"
import { FilterMenu } from "@/components/controls/FilterMenu"
import { PerPage } from "@/components/controls/PerPage"

// charts & modal
import JenisChart from "@/components/charts/JenisChart"
import TpFpChart from "@/components/charts/TpFpChart"
import ConfidenceChart from "@/components/charts/ConfidenceChart"
import DetailModal from "@/components/modals/DetailModal"

import { LinkRecord } from "@/types/linkRecord"

// const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())
const API_BASE = process.env.NEXT_PUBLIC_API_URL

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`, { cache: "no-store" }).then((r) => r.json())
console.log("🧠 NEXT_PUBLIC_API_URL:", API_BASE)


const TAB_ORDER = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
  { key: "false-positive", label: "False Positive" },
  { key: "flagged", label: "Flagged" },
  { key: "summary", label: "Summary" },
] as const
type TabKey = (typeof TAB_ORDER)[number]["key"]

export default function PRDDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [search, setSearch] = useState("")
  const [jenisFilter, setJenisFilter] = useState<string[]>(["Judi", "Pornografi", "Penipuan"])
  const [sortCol, setSortCol] = useState<"tanggal" | "kepercayaan">("tanggal")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [detail, setDetail] = useState<LinkRecord | null>(null)

  const { data, error, isLoading, mutate } = useSWR<LinkRecord[]>("/api/data/", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true, 
  })

console.log("🔍 DEBUG API_BASE:", API_BASE)
console.log("🔍 SWR Data:", data)
console.log("🔍 SWR Error:", error)
console.log("🔍 SWR Loading:", isLoading)


  const filtered = useMemo(() => {
    const list = data ?? []
    return list.filter((it) => {
      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "flagged"
          ? it.flagged
          : (it.status as string) === activeTab
      const matchJenis = jenisFilter.includes(it.jenis)
      const matchSearch = it.link.toLowerCase().includes(search.toLowerCase())
      return matchTab && matchJenis && matchSearch
    })
  }, [data, activeTab, jenisFilter, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const A = sortCol === "tanggal" ? a.tanggal : a.kepercayaan
      const B = sortCol === "tanggal" ? b.tanggal : b.kepercayaan
      const cmp = A > B ? 1 : A < B ? -1 : 0
      return sortOrder === "desc" ? -cmp : cmp
    })
    return list
  }, [filtered, sortCol, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage)

  const handleLogout = () => {
    localStorage.removeItem("user")
    window.location.href = "/login"
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={TAB_ORDER}
          onLogout={handleLogout}
        >
          <ThemeToggle />
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 bg-background overflow-y-auto">
          {activeTab !== "summary" && (
            <div className="flex flex-col h-full p-4 gap-4">
              {/* Control Panel */}
              <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-sm font-semibold">
                    {TAB_ORDER.find((t) => t.key === activeTab)?.label} ({sorted.length})
                  </h2>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                    <SortMenu
                      sortCol={sortCol}
                      sortOrder={sortOrder}
                      onApply={(c, o) => {
                        setSortCol(c)
                        setSortOrder(o)
                      }}
                    />
                    <FilterMenu value={jenisFilter} onApply={setJenisFilter} />
                    <Button
                    size="sm"
                    variant="outline"
                    className="bg-black text-white hover:bg-[rgba(0, 0, 0, 0.30)] border border-border h-8 px-3"
                  >
                    Crawling
                  </Button>
                  </div>
                </div>
              </Card>

              {/* Data Table */}
              <div className="rounded-lg border border-border overflow-x-auto flex-1">
                <DetailModal.Table
                  pageItems={pageItems}
                  isLoading={isLoading}
                  error={error}
                  setDetail={setDetail}
                />
              </div>

              {/* Pagination */}
              <div className="shrink-0 flex items-center justify-between text-sm pb-4">
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

          {activeTab === "summary" && (
            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <JenisChart data={data ?? []} />
              <TpFpChart data={data ?? []} />
              <ConfidenceChart data={data ?? []} />
            </div>
          )}
        </main>

        {/* Detail Modal */}
        <DetailModal item={detail} onClose={() => setDetail(null)} onMutate={mutate} />
      </div>
    </ProtectedRoute>
  )
}

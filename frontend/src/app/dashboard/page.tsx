"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"

// layout & controls
import Sidebar from "@/components/layout/Sidebar"
import ThemeToggle from "@/components/layout/ThemeToggle"
import { SortMenu } from "@/components/controls/SortMenu"
import { PerPage } from "@/components/controls/PerPage"

// charts & modal
import JenisChart from "@/components/charts/JenisChart"
import TpFpChart from "@/components/charts/TpFpChart"
import ConfidenceChart from "@/components/charts/ConfidenceChart"
import DetailModal from "@/components/modals/DetailModal"
import CrawlingModal from "@/components/modals/CrawlingModal"

import { LinkRecord } from "@/types/linkRecord"
import { apiGet } from "@/lib/api"

// Authenticated fetcher that includes JWT token
const fetcher = async (url: string) => {
  const response = await apiGet(url)
  return response
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

export default function PRDDashboardPage() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [search, setSearch] = useState("")
  const [sortCol, setSortCol] = useState<"tanggal" | "kepercayaan">("tanggal")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [detail, setDetail] = useState<LinkRecord | null>(null)
  const [crawlingModalOpen, setCrawlingModalOpen] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<LinkRecord[]>("/api/data/", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  })

  const filtered = useMemo(() => {
    const list = Array.isArray(data) ? data : []
    return list.filter((it) => {
      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "flagged"
            ? it.flagged
            : (it.status as string) === activeTab

      // Enhanced search logic for ID and link
      let matchSearch = false
      const searchTerm = search.trim()

      if (searchTerm) {
        // Convert ID to hex format for comparison
        const hexId = `#${Math.max(1, Number(it.id)).toString(16).toUpperCase().padStart(7, "0")}`

        if (searchTerm.startsWith("#")) {
          // Exact ID match when search starts with #
          matchSearch = hexId.toLowerCase() === searchTerm.toLowerCase()
        } else {
          // Partial match: check if search term appears in link OR in the hex ID
          const linkMatch = it.link.toLowerCase().includes(searchTerm.toLowerCase())
          const idMatch = hexId.includes(searchTerm.toUpperCase())
          matchSearch = linkMatch || idMatch
        }
      } else {
        matchSearch = true
      }

      return matchTab && matchSearch
    })
  }, [data, activeTab, search])

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

  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={TAB_ORDER}
          onLogout={logout}
        >
          <ThemeToggle />
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 bg-background overflow-y-auto">
          {activeTab !== "summary" && (
            <div className="flex flex-col h-full p-4 gap-4">
              {/* Control Panel */}
              <Card
                className="p-3 flex flex-wrap items-center justify-between gap-3"
                style={{
                  background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)',
                  border: 'none'
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-sm font-semibold text-white">
                    {TAB_ORDER.find((t) => t.key === activeTab)?.label} ({sorted.length})
                  </h2>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm bg-white dark:bg-background"
                    />
                    <SortMenu
                      sortCol={sortCol}
                      sortOrder={sortOrder}
                      onApply={(c, o) => {
                        setSortCol(c)
                        setSortOrder(o)
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-white border-none hover:opacity-90 hover:text-white transition-opacity"
                      style={{
                        background: 'linear-gradient(135deg, #1DC0EB 0%, #1199DA 50%, #0B88D3 100%)'
                      }}
                      onClick={() => setCrawlingModalOpen(true)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mr-0.5"
                      >
                        {/* Diamond/Sparkle shape similar to Gemini logo */}
                        <path
                          d="M12 2L16 8L22 12L16 16L12 22L8 16L2 12L8 8L12 2Z"
                          fill="white"
                        />
                        <path
                          d="M12 6L14 10L18 12L14 14L12 18L10 14L6 12L10 10L12 6Z"
                          fill="white"
                          opacity="0.6"
                        />
                      </svg>
                      Generate
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

        {/* Crawling Modal */}
        <CrawlingModal open={crawlingModalOpen} onClose={() => setCrawlingModalOpen(false)} />
      </div>
    </ProtectedRoute>
  )
}

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
import { PerPage } from "@/components/controls/PerPage"

// charts & modal
import JenisChart from "@/components/charts/JenisChart"
import TpFpChart from "@/components/charts/TpFpChart"
import ConfidenceChart from "@/components/charts/ConfidenceChart"
import DetailModal from "@/components/modals/DetailModal"
import CrawlingModal from "@/components/modals/CrawlingModal"
import { StaticParticlesBackground } from "@/components/ui/StaticParticlesBackground"

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
  { key: "manual", label: "Manual" },
  { key: "summary", label: "Summary" },
] as const
type TabKey = (typeof TAB_ORDER)[number]["key"]

export default function PRDDashboardPage() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [search, setSearch] = useState("")
  const [sortCol, setSortCol] = useState<"tanggal" | "kepercayaan" | "lastModified" | "modifiedBy">("tanggal")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [detail, setDetail] = useState<LinkRecord | null>(null)
  const [crawlingModalOpen, setCrawlingModalOpen] = useState(false)
  const [addManualModalOpen, setAddManualModalOpen] = useState(false)
  const [manualDomainInput, setManualDomainInput] = useState("")
  const [addingManual, setAddingManual] = useState(false)

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
            : activeTab === "manual"
              ? it.isManual
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
      let A: string | number
      let B: string | number

      switch (sortCol) {
        case "tanggal":
          A = a.tanggal
          B = b.tanggal
          break
        case "kepercayaan":
          A = a.kepercayaan
          B = b.kepercayaan
          break
        case "lastModified":
          A = a.lastModified
          B = b.lastModified
          break
        case "modifiedBy":
          A = a.modifiedBy
          B = b.modifiedBy
          break
        default:
          A = a.tanggal
          B = b.tanggal
      }

      const cmp = A > B ? 1 : A < B ? -1 : 0
      return sortOrder === "desc" ? -cmp : cmp
    })
    return list
  }, [filtered, sortCol, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage)

  async function handleAddManualDomain() {
    const domain = manualDomainInput.trim()
    if (!domain) return

    setAddingManual(true)
    try {
      const { apiPost } = await import("@/lib/api")
      await apiPost("/api/manual-domain/add", { url: domain })

      // Reset and close modal
      setManualDomainInput("")
      setAddManualModalOpen(false)

      // Refresh data
      mutate()
    } catch (err: any) {
      alert(err.message || "Failed to add manual domain")
    } finally {
      setAddingManual(false)
    }
  }

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
                className="p-3 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)',
                  border: 'none'
                }}
              >
                {/* Static Particles Background */}
                <StaticParticlesBackground />
                <div className="flex items-center justify-between w-full relative z-10">
                  <h2 className="text-sm font-semibold text-white">
                    {TAB_ORDER.find((t) => t.key === activeTab)?.label} ({sorted.length})
                  </h2>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm bg-transparent border-gray-400 text-gray-300 placeholder:text-gray-400 focus-visible:bg-white focus-visible:text-foreground focus-visible:border-ring dark:focus-visible:bg-background dark:focus-visible:text-foreground"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 bg-white dark:bg-gray-100 border-2 border-white dark:border-gray-200 hover:opacity-90 transition-opacity shadow-md"
                      onClick={() => setAddManualModalOpen(true)}
                      title="Add Manual Domain"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00336A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </Button>
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
                  sortCol={sortCol}
                  sortOrder={sortOrder}
                  onSort={(col: "tanggal" | "kepercayaan" | "lastModified" | "modifiedBy") => {
                    if (sortCol === col) {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    } else {
                      setSortCol(col)
                      setSortOrder("desc")
                    }
                  }}
                />
              </div>

              {/* Pagination */}
              <div className="shrink-0 flex items-center justify-between text-sm">
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

        {/* Add Manual Domain Modal */}
        {addManualModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setAddManualModalOpen(false)
              setManualDomainInput("")
            }}
          >
            <div
              className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Add Manual Domain</h3>
              <Input
                placeholder="Enter domain (e.g., example.com)"
                value={manualDomainInput}
                onChange={(e) => setManualDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addingManual) {
                    handleAddManualDomain()
                  }
                }}
                className="mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddManualModalOpen(false)
                    setManualDomainInput("")
                  }}
                  disabled={addingManual}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddManualDomain}
                  disabled={addingManual || !manualDomainInput.trim()}
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
                >
                  {addingManual ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

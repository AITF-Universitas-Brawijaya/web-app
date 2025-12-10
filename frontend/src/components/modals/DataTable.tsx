"use client"

import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { LinkRecord } from "@/types/linkRecord"

const STATUS_LABEL = {
  verified: { label: "Verified", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }, // Changed to blue
  unverified: { label: "Unverified", className: "bg-primary/10 text-primary" },
  "false-positive": { label: "False", className: "bg-destructive/10 text-destructive-foreground" },
}

// Fallback untuk status yang tidak terdefinisi
function getStatusLabel(status: string) {
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] || {
    label: "Unknown",
    className: "bg-muted text-foreground/60"
  }
}

function formatDateOnly(d: string) {
  const date = new Date(d)
  return date.toISOString().split("T")[0]
}


function confidenceBarColor(v: number) {
  if (v >= 95) return "bg-[#00336A]" // Darkest blue (highest confidence)
  if (v >= 85) return "bg-[#003D7D]" // Medium-dark blue
  if (v >= 70) return "bg-[#1199DA]" // Medium blue
  return "bg-[#1DC0EB]" // Light blue (lowest confidence)
}


function toHexId(n: number) {
  const hex = Math.max(1, Number(n)).toString(16).toUpperCase().padStart(7, "0")
  return `#${hex}`
}

export default function DataTable({
  pageItems,
  isLoading,
  error,
  setDetail,
  sortCol,
  sortOrder,
  onSort,
  compactMode = false,
}: {
  pageItems: LinkRecord[]
  isLoading: boolean
  error: any
  setDetail: (item: LinkRecord) => void
  sortCol?: "tanggal" | "kepercayaan" | "lastModified" | "modifiedBy"
  sortOrder?: "asc" | "desc"
  onSort?: (col: "tanggal" | "kepercayaan" | "lastModified" | "modifiedBy") => void
  compactMode?: boolean
}) {
  const SortIcon = ({ column }: { column: "tanggal" | "kepercayaan" | "lastModified" | "modifiedBy" }) => {
    if (sortCol !== column) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block mr-1 opacity-40">
          <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
        </svg>
      )
    }

    if (sortOrder === "asc") {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block mr-1">
          <path d="M7 14l5-5 5 5" />
        </svg>
      )
    }

    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block mr-1">
        <path d="M7 10l5 5 5-5" />
      </svg>
    )
  }

  return (
    <table className={cn("w-full", compactMode ? "text-xs" : "text-sm")}>
      <thead className="bg-muted text-foreground/80">
        <tr>
          <th className={cn("px-4 text-left font-medium w-[31%]", compactMode ? "py-2" : "py-3")}>Link</th>
          <th
            className={cn("px-4 text-left font-medium w-[12%]", compactMode ? "py-2" : "py-3", onSort ? 'cursor-pointer hover:bg-muted-foreground/10 select-none' : '')}
            onClick={() => onSort?.("tanggal")}
          >
            {onSort && <SortIcon column="tanggal" />}
            Tanggal
          </th>
          <th
            className={cn("px-4 text-left font-medium w-[12%]", compactMode ? "py-2" : "py-3", onSort ? 'cursor-pointer hover:bg-muted-foreground/10 select-none' : '')}
            onClick={() => onSort?.("lastModified")}
          >
            {onSort && <SortIcon column="lastModified" />}
            Tgl Berubah
          </th>
          <th
            className={cn("px-4 text-left font-medium w-[10%]", compactMode ? "py-2" : "py-3", onSort ? 'cursor-pointer hover:bg-muted-foreground/10 select-none' : '')}
            onClick={() => onSort?.("modifiedBy")}
          >
            {onSort && <SortIcon column="modifiedBy" />}
            Diubah Oleh
          </th>
          <th
            className={cn("px-4 text-left font-medium w-[18%]", compactMode ? "py-2" : "py-3", onSort ? 'cursor-pointer hover:bg-muted-foreground/10 select-none' : '')}
            onClick={() => onSort?.("kepercayaan")}
          >
            {onSort && <SortIcon column="kepercayaan" />}
            Kepercayaan
          </th>
          <th className={cn("px-4 text-left font-medium w-[10%]", compactMode ? "py-2" : "py-3")}>Status</th>
          <th className={cn("px-4 text-left font-medium w-[7%]", compactMode ? "py-2" : "py-3")} />
        </tr>
      </thead>
      <tbody>
        {isLoading && (
          <tr>
            <td colSpan={7} className="px-4 py-6 text-center text-foreground/60">Loading...</td>
          </tr>
        )}
        {error && (
          <tr>
            <td colSpan={7} className="px-4 py-6 text-center text-destructive">Failed to load data</td>
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
          const conf = it.kepercayaan
          const cellPadding = compactMode ? "py-1.5" : "py-3"
          return (
            <tr key={it.id} className="border-t border-border hover:bg-muted/40">
              <td className={cn("px-4 font-medium w-[31%] max-w-0", cellPadding)}>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {it.isNew && (
                      <Badge className="bg-blue-900/20 text-blue-900 dark:text-blue-300 text-[10px] px-1.5 py-0 font-semibold">
                        Baru
                      </Badge>
                    )}
                    <div className="text-xs text-foreground/50">{toHexId(it.id)}</div>
                    {it.flagged && (
                      <span title="Flagged">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-primary"
                        >
                          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="truncate overflow-hidden text-ellipsis whitespace-nowrap" title={it.link}>{it.link}</div>
                </div>
              </td>
              <td className={cn("px-4 w-[12%]", cellPadding)}>{formatDateOnly(it.tanggal)}</td>
              <td className={cn("px-4 w-[12%]", cellPadding)}>{formatDateOnly(it.lastModified)}</td>
              <td className={cn("px-4 text-foreground/70 w-[10%]", cellPadding)}>{it.modifiedBy}</td>
              <td className={cn("px-4 w-[18%]", cellPadding)}>
                {it.isManual ? (
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-right text-foreground/50">-</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-10 text-right">{conf}%</span>
                    <div className={cn("w-full bg-muted rounded-full", compactMode ? "h-1.5" : "h-2")}>
                      <div
                        className={cn("rounded-full", compactMode ? "h-1.5" : "h-2", confidenceBarColor(conf))}
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                  </div>
                )}
              </td>
              <td className={cn("px-4 w-[10%]", cellPadding)}>
                {it.isManual ? (
                  <Badge className="bg-secondary text-foreground font-semibold">
                    Manual
                  </Badge>
                ) : (
                  <Badge className={cn("font-semibold", getStatusLabel(it.status).className)}>
                    {getStatusLabel(it.status).label}
                  </Badge>
                )}
              </td>
              <td className={cn("px-4 w-[7%]", cellPadding)}>
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => setDetail(it)}
                >
                  Detail
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

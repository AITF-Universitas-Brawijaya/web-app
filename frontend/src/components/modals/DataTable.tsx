"use client"

import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { LinkRecord } from "@/types/linkRecord"

const STATUS_LABEL = {
  verified: { label: "Verified", className: "bg-secondary text-foreground" },
  unverified: { label: "Unverified", className: "bg-primary/10 text-primary" },
  "false-positive": { label: "False Positive", className: "bg-destructive/10 text-destructive-foreground" },
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
  if (v >= 95) return "bg-primary"
  if (v >= 85) return "bg-foreground/60"
  if (v >= 70) return "bg-foreground/40"
  return "bg-foreground/20"
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
}: {
  pageItems: LinkRecord[]
  isLoading: boolean
  error: any
  setDetail: (item: LinkRecord) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted text-foreground/80">
        <tr>
          <th className="px-4 py-3 text-left font-medium w-[28%]">Link</th>
          <th className="px-4 py-3 text-left font-medium">Tanggal</th>
          <th className="px-4 py-3 text-left font-medium">Tgl Berubah</th>
          <th className="px-4 py-3 text-left font-medium">Modified By</th>
          <th className="px-4 py-3 text-left font-medium">Kepercayaan</th>
          <th className="px-4 py-3 text-left font-medium">Status</th>
          <th className="px-4 py-3 text-left font-medium" />
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
          return (
            <tr key={it.id} className="border-t border-border hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1.5">
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
                <div className="truncate max-w-[28ch]" title={it.link}>{it.link}</div>
              </td>
              <td className="px-4 py-3">{formatDateOnly(it.tanggal)}</td>
              <td className="px-4 py-3">{formatDateOnly(it.lastModified)}</td>
              <td className="px-4 py-3 text-foreground/70">{it.modifiedBy}</td>
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
              <td className="px-4 py-3">
                <Badge className={cn("font-semibold", getStatusLabel(it.status).className)}>
                  {getStatusLabel(it.status).label}
                </Badge>
              </td>
              <td className="px-4 py-3">
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

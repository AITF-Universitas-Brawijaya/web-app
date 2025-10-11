import { NextResponse } from "next/server"

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

const overrides = new Map<number, Partial<LinkRecord>>()

export async function GET(req: Request) {
  const csvUrl = new URL("/assets/data/links.csv", req.url)
  const res = await fetch(csvUrl.toString(), { cache: "no-store" })
  if (!res.ok) return NextResponse.json({ error: "CSV not found" }, { status: 500 })

  const text = await res.text()
  const rows = parseCSV(text)
  const data: LinkRecord[] = rows.map((r) => {
    const base: LinkRecord = {
      id: Number(r.id),
      link: r.link,
      jenis: r.jenis as Jenis,
      kepedean: Number(r.kepedean),
      status: r.status as Status,
      tanggal: r.tanggal,
      lastModified: r.lastModified,
      reasoning: r.reasoning,
      image: r.image,
      flagged: String(r.flagged).toLowerCase() === "true",
    }
    const patch = overrides.get(base.id)
    return patch ? { ...base, ...patch } : base
  })

  const response = NextResponse.json(data)
  response.headers.set("Cache-Control", "no-store")
  return response
}

// Robust-enough CSV parser for quoted fields and commas
function parseCSV(input: string): Record<string, string>[] {
  const lines = input.trim().split(/\r?\n/)
  if (lines.length === 0) return []
  const headers = splitCSVLine(lines[0])

  return lines.slice(1).map((line) => {
    const cells = splitCSVLine(line)
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => (rec[h] = cells[i] ?? ""))
    return rec
  })
}

function splitCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^\s*"|"\s*$/g, ""))
}

export function applyOverride(id: number, patch: Partial<LinkRecord>) {
  const prev = overrides.get(id) ?? {}
  overrides.set(id, { ...prev, ...patch })
}

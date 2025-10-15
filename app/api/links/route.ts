import { NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL || ''

type Status = 'verified' | 'unverified' | 'false-positive'
type Jenis = 'Judi' | 'Pornografi' | 'Penipuan' | 'Lainnya'

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

function mapBackendItem(item: any): LinkRecord {
  return {
    id: Number(item.id || 0),
    link: item.url || item.link || '',
    jenis: (item.category || 'Lainnya') as Jenis,
    kepedean: Math.round((item.confidence ?? 0) * 100),
    status:
      String(item.status || 'unverified').toLowerCase() === 'verified'
        ? 'verified'
        : String(item.status || '').toLowerCase().includes('false')
          ? 'false-positive'
          : 'unverified',
    tanggal: item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '',
    lastModified: item.updated_at ? new Date(item.updated_at).toISOString().slice(0, 10) : '',
    reasoning: item.reasoning || '',
    image: item.image || '',
    flagged: Boolean(item.flagged),
  }
}

// GET: proxy to backend if configured, otherwise serve bundled CSV
export async function GET(req: Request) {
  // If BACKEND is set, forward query params
  if (BACKEND) {
    try {
      const url = new URL(req.url)
      const params = url.search
      const backendRes = await fetch(`${BACKEND.replace(/\/$/, '')}/crawled${params}`)
      const text = await backendRes.text()
      if (!backendRes.ok) {
        return NextResponse.json({ error: text }, { status: backendRes.status })
      }
      const data = JSON.parse(text)
      const mapped = Array.isArray(data) ? data.map(mapBackendItem) : []
      const res = NextResponse.json(mapped)
      res.headers.set('Cache-Control', 'no-store')
      return res
    } catch (err: any) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // Fallback: read bundled CSV
  try {
    const csvUrl = new URL('/assets/data/links.csv', req.url)
    const r = await fetch(csvUrl.toString(), { cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ error: 'CSV not found' }, { status: 500 })
    const text = await r.text()
    const rows = parseCSV(text)
    const data: LinkRecord[] = rows.map((r) => {
      const base: LinkRecord = {
        id: Number(r.id),
        link: r.link,
        jenis: (r.jenis || 'Lainnya') as Jenis,
        kepedean: Number(r.kepedean) || 0,
        status: (r.status as Status) || 'unverified',
        tanggal: r.tanggal,
        lastModified: r.lastModified,
        reasoning: r.reasoning || '',
        image: r.image || '',
        flagged: String(r.flagged).toLowerCase() === 'true',
      }
      const patch = overrides.get(base.id)
      return patch ? { ...base, ...patch } : base
    })
    const res = NextResponse.json(data)
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Robust-enough CSV parser for quoted fields and commas
function parseCSV(input: string): Record<string, string>[] {
  const lines = input.trim().split(/\r?\n/)
  if (lines.length === 0) return []
  const headers = splitCSVLine(lines[0])

  return lines.slice(1).map((line) => {
    const cells = splitCSVLine(line)
    const rec: Record<string, string> = {}
    headers.forEach((h, i) => (rec[h] = cells[i] ?? ''))
    return rec
  })
}

function splitCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
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
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim().replace(/^\s*"|"\s*$/g, ''))
}

export function applyOverride(id: number, patch: Partial<LinkRecord>) {
  const prev = overrides.get(id) ?? {}
  overrides.set(id, { ...prev, ...patch })
}

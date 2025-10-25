import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"
import { overrides } from "../_shared/store"

export async function GET() {
  try {
    // Lokasi file CSV
    const filePath = path.join(process.cwd(), "public", "data", "links.csv")
    const csvData = fs.readFileSync(filePath, "utf-8")

    // Parse CSV → array of object
    const records = parse(csvData, {
      columns: (header) => header.map((h: string) => h.toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    })

    // Format jadi objek sesuai LinkRecord
    const formatted = records.map((row: any, i: number) => ({
      id: i + 1,
      link: row.link || row.url || "",
      jenis: row.jenis || "Judi",
      kepedean: Number(row.kepedean || 90),
      status: row.status || "unverified",
      tanggal: row.tanggal || new Date().toISOString().slice(0, 10),
      lastModified: row.lastmodified || new Date().toISOString().slice(0, 10),
      reasoning: row.reasoning || "-",
      image: row.image || "",
      flagged: String(row.flagged).toLowerCase() === "true",
    }))

    // Terapkan override (update sementara dari /update route)
    const merged = formatted.map((item) =>
      overrides.has(item.id) ? { ...item, ...overrides.get(item.id) } : item
    )

    

    return NextResponse.json(merged)
  } catch (error: any) {
    console.error("Error reading CSV:", error)
    return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { GET as getAll } from "../route"

// 🔹 Ambil data berdasarkan ID (per baris)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Ambil semua data dulu dari route utama
    const all = await getAll()
    const data = await all.json()
    const id = Number(params.id)

    // Cari item dengan ID yang cocok
    const item = Array.isArray(data) ? data.find((r: any) => r.id === id) : null

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (err) {
    console.error("Error fetching item:", err)
    return NextResponse.json({ error: "Failed to get item" }, { status: 500 })
  }
}

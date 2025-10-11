import { NextResponse } from "next/server"
import { addHistory, ensureInit, getHistory } from "./store"

export async function GET(req: Request) {
    const url = new URL(req.url)
    const id = Number(url.searchParams.get("id"))
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })
    ensureInit(id)
    return NextResponse.json({ events: getHistory(id) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))
    const id = Number(body?.id)
    const text = String(body?.text || "")
    if (!id || !text) return NextResponse.json({ error: "invalid payload" }, { status: 400 })
    addHistory(id, text)
    return NextResponse.json({ ok: true })
}

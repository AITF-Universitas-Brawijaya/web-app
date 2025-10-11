import { NextResponse } from "next/server"
import { applyOverride } from "@/app/api/links/route"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const id = Number(body?.id)
  const patch = body?.patch ?? {}
  if (!id || typeof patch !== "object") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }
  applyOverride(id, patch)
  return NextResponse.json({ ok: true })
}

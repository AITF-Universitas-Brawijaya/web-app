import { NextResponse } from "next/server"
import { applyOverride } from "@/app/api/_shared/store"
import { addHistory } from "@/app/api/history/store" // log history on updates

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const id = Number(body?.id)
  const patch = body?.patch ?? {}
  if (!id || typeof patch !== "object") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }
  console.log("UPDATE called:", id, patch)

  applyOverride(id, patch)

  if (typeof patch.flagged === "boolean") {
    addHistory(id, patch.flagged ? "Flagged" : "Unflagged")
  }
  if (typeof patch.status === "string") {
    if (patch.status === "verified") addHistory(id, "Updated to Verified")
    else if (patch.status === "unverified") addHistory(id, "Changed to Unverified")
    else if (patch.status === "false-positive") addHistory(id, "Marked as False Positive")
  }

  return NextResponse.json({ ok: true })
}
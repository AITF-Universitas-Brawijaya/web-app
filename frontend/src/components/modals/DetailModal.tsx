"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import DataTable from "./DataTable"
import { LinkRecord, Status } from "@/types/linkRecord"
import type { Jenis } from "@/types/linkRecord"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

function formatDate(d: string | Date) {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`
}

function toHexId(n: number) {
  const hex = Math.max(1, Number(n)).toString(16).toUpperCase().padStart(7, "0")
  return `#${hex}`
}

export default function DetailModal({
  item,
  onClose,
  onMutate,
}: {
  item: LinkRecord | null
  onClose: () => void
  onMutate: () => void
}) {
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  type ChatMsg = { role: "user" | "assistant"; text: string; ts: number; link: string }
  const [chat, setChat] = useState<ChatMsg[]>([])
  const chatKey = item ? `prd-chat-${item.id}` : ""

  const [contextMode, setContextMode] = useState(false)
  const [selectedContexts, setSelectedContexts] = useState<string[]>([])

  useEffect(() => {
    setContextMode(false)
    setSelectedContexts([])
  }, [item])

  const kontakList = [
    { type: "Rekening BCA", value: "1234567890 a.n. John Doe" },
    { type: "OVO", value: "085712345678" },
    { type: "GoPay", value: "081234567890" },
  ]

  // Load chat
  useEffect(() => {
    if (!item) return
    const saved = localStorage.getItem(chatKey)
    if (saved) {
      try {
        setChat(JSON.parse(saved))
        return
      } catch {}
    }
    setChat([
      {
        role: "assistant",
        text: "Halo, saya siap membantu menganalisis kasus ini. Apa yang ingin Anda ketahui?",
        ts: Date.now(),
        link: item.link,
      },
    ])
  }, [chatKey, item])

  useEffect(() => {
    if (item) localStorage.setItem(chatKey, JSON.stringify(chat))
  }, [chat, chatKey, item])

  const [flaggedLocal, setFlaggedLocal] = useState<boolean>(!!item?.flagged)
  const [pendingLabel, setPendingLabel] = useState<Jenis | null>(null)
  const [overrideReason, setOverrideReason] = useState("")

  const overrideRef = useRef<HTMLDivElement | null>(null)

  function scrollToOverride() {
    setTimeout(() => {
      overrideRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  useEffect(() => {
    setPendingLabel(null)
    setOverrideReason("")
  }, [item])

  useEffect(() => {
    if (item) setFlaggedLocal(item.flagged)
  }, [item])

  const { data: history, mutate: mutateHistory } = useSWR<{ events: { time: string; text: string }[] }>(
    item ? `${process.env.NEXT_PUBLIC_API_URL}/api/history?id=${item.id}` : null,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  )

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chat])

  function toggleContext(text: string) {
    if (!contextMode) return
    setSelectedContexts((prev) => (prev.includes(text) ? prev.filter((x) => x !== text) : [...prev, text]))
  }

  async function send() {
    if (!item) return
    const content = message.trim()
    if (!content) return

    let finalMsg = content
    if (contextMode && selectedContexts.length > 0) {
      finalMsg = `Gunakan konteks berikut untuk menjawab:\n${selectedContexts
        .map((c, i) => `${i + 1}. ${c}`)
        .join("\n")}\n\nPertanyaan: ${content}`
    }

    setChat((c) => [...c, { role: "user", text: finalMsg, ts: Date.now(), link: item.link }])
    setMessage("")
    setLoading(true)
    setContextMode(false)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalMsg, item }),
      })
      const data = await res.json()
      setChat((c) => [
        ...c,
        { role: "assistant", text: data.reply ?? "Maaf, tidak ada balasan.", ts: Date.now(), link: item.link },
      ])
    } catch {
      setChat((c) => [
        ...c,
        { role: "assistant", text: "Terjadi kesalahan saat menghubungi AI.", ts: Date.now(), link: item.link },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(next: Status) {
    if (!item) return
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { status: next, lastModified: formatDate(new Date()) } }),
    })

    await mutateHistory?.()
    onMutate()
    onClose()
  }

  async function toggleFlag() {
    if (!item) return
    const nextVal = !flaggedLocal
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { flagged: nextVal, lastModified: formatDate(new Date()) } }),
    })
    setFlaggedLocal(nextVal)

    if (nextVal) {
      scrollToOverride()
    }

    await mutateHistory?.()
    onMutate()
  }

  if (!item) return null

  return (
    <Dialog
      open={!!item}
      onOpenChange={(v) => {
        if (!v) {
          setPendingLabel(null)
          setOverrideReason("")
        }
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-[min(95vw,1200px)] sm:max-w-[min(95vw,1200px)] max-h-screen">
        <DialogHeader>
          <DialogTitle>
            {toHexId(item.id)} · Info Detail
            <span className="ml-2 text-xs font-normal text-foreground/60">
              | Label: <b>{item.jenis}</b> • Status: <b>{item.status}</b>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 h-[80vh]">
          {/* LEFT */}
          <div className="flex flex-col gap-4 md:col-span-4 overflow-y-auto thin-scroll pr-1">
            {/* Link */}
            <div className="flex items-center gap-2">
              <Input readOnly value={item.link} className="text-xs" title={item.link} />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    navigator.clipboard
                      .writeText(item.link)
                      .then(() => console.log("Link copied:", item.link))
                      .catch((err) => console.error("Clipboard error:", err))
                  } else {
                    const textarea = document.createElement("textarea")
                    textarea.value = item.link
                    document.body.appendChild(textarea)
                    textarea.select()
                    try {
                      document.execCommand("copy")
                      console.log("Fallback copy success:", item.link)
                    } catch (err) {
                      console.error("Fallback copy failed:", err)
                    }
                    document.body.removeChild(textarea)
                  }
                }}
                aria-label="Copy link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 16h8a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2" />
                </svg>
              </Button>
              <Button
                variant={flaggedLocal ? "default" : "outline"}
                size="sm"
                className="text-xs md:text-sm whitespace-nowrap"
                onClick={toggleFlag}
              >
                {flaggedLocal ? "Unflag" : "Flag"}
              </Button>
            </div>

            {/* Verifikasi */}
            <div className="mt-auto space-y-3" ref={overrideRef}>
              <div className="text-xs font-semibold mb-2">Label Prediksi</div>

              {/* Dropdown Label – selaras dengan tipe lama */}
              <select
                className="border border-border rounded-md text-sm p-2 w-full"
                value={pendingLabel ?? item.jenis}
                onChange={(e) => {
                  const newLabel = e.target.value as Jenis
                  if (newLabel !== item.jenis) {
                    setPendingLabel(newLabel)
                  } else {
                    setPendingLabel(null)
                    setOverrideReason("")
                  }
                }}
              >
                <option value="Judi">Judi</option>
                <option value="Pornografi">Pornografi</option>
                <option value="Penipuan">Penipuan</option>
              </select>
              
              {/* Override Reason Input */}
              {pendingLabel && (
                <div className="border border-border rounded-md p-3 bg-card space-y-2">
                  <div className="text-xs font-semibold">Alasan Override</div>

                  <textarea
                    className="border border-border rounded-md text-sm p-2 h-20 w-full"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder={`Kenapa label AI diubah dari "${item.jenis}" ke "${pendingLabel}"?`}
                  />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        if (!overrideReason.trim()) return alert("Tulis alasan override dulu.")
                        if (!item) return

                        // 1️⃣ Update ke backend
                        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/update`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: item.id,
                            patch: {
                              jenis: pendingLabel,
                              reasoningadmin: overrideReason,
                              lastModified: formatDate(new Date()),
                            },
                          }),
                        })

                        // 2️⃣ (Opsional) Simpan event ke riwayat
                        try {
                          const form = new URLSearchParams()
                          form.set("id", String(item.id))
                          form.set("text", `Override label: ${item.jenis} → ${pendingLabel}. Alasan: ${overrideReason}`)

                          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/history/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: form.toString(),
                          })
                        } catch {}

                        // 3️⃣ Update state lokal biar UI langsung berubah
                        item.jenis = pendingLabel!
                        item.reasoningadmin = overrideReason
                        item.lastModified = formatDate(new Date())

                        // 4️⃣ Refresh riwayat dan tabel
                        await mutateHistory?.()
                        onMutate()

                        // 5️⃣ Reset form override
                        setPendingLabel(null)
                        setOverrideReason("")
                      }}
                    >
                      Simpan Override
                    </Button>


                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setPendingLabel(null)
                        setOverrideReason("")
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              )}

            {/* === Reasoning Admin (muncul hanya setelah submit override) === */}
{Boolean(item.reasoningadmin?.trim()) ? (
  <div>
    <div className="text-xs font-semibold mb-2">Reasoning Admin</div>
    <div
      className={cn(
        "border border-border rounded-md p-3 bg-card",
        contextMode && "cursor-pointer hover:bg-muted",
        selectedContexts.includes(item.reasoningadmin) && "bg-muted border-primary"
      )}
      onClick={() => toggleContext(item.reasoningadmin!)}
    >
      <div className="text-sm">{item.reasoningadmin}</div>
    </div>
  </div>
) : null}

{/* === Reasoning (model) — juga conditional biar gak ada kotak kosong === */}
{Boolean(item.reasoning?.trim()) ? (
  <div>
    <div className="text-xs font-semibold mb-2">Reasoning</div>
    <div
      className={cn(
        "border border-border rounded-md p-3 bg-card",
        contextMode && "cursor-pointer hover:bg-muted",
        selectedContexts.includes(item.reasoning) && "bg-muted border-primary"
      )}
      onClick={() => toggleContext(item.reasoning!)}
    >
      <div className="text-sm">{item.reasoning}</div>
    </div>
  </div>
) : null}


            {/* Gambar */}
            <div
              className={cn(
                "cursor-default",
                contextMode && "cursor-pointer hover:opacity-80",
                selectedContexts.includes("Gambar Terkait") && "border-2 border-primary rounded-md p-1"
              )}
              onClick={() => toggleContext("Gambar Terkait")}
            >
              <div className="text-xs font-semibold mb-2">Gambar Terkait</div>
              <img
                src={item.image ? item.image : `assets/placeholder.svg?height=240&width=360&query=Gambar%20terkait%20kasus`}
                alt="Hasil deteksi gambar"
                className="rounded-md mx-auto w-full max-w-md h-auto object-contain border"
              />
            </div>

            {/* Kontak */}
            <div>
              <div className="text-xs font-semibold mb-2">Kontak Terkait</div>
              <div className="border border-border rounded-md p-3 bg-card flex flex-col gap-2">
                {kontakList.map((k, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex justify-between items-center text-xs border border-muted-foreground/20 rounded-md px-3 py-1",
                      contextMode && "cursor-pointer hover:bg-muted",
                      selectedContexts.includes(`${k.type}: ${k.value}`) && "bg-muted border-primary"
                    )}
                    onClick={() => toggleContext(`${k.type}: ${k.value}`)}
                  >
                    <span>{k.type}</span>
                    <span className="font-medium">{k.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat */}
            <div>
              <div className="text-xs font-semibold mb-2">Riwayat Aktivitas</div>
              <div className="border border-border rounded-md p-3 bg-card max-h-40 overflow-auto">
                {history?.events?.length ? (
                  <ul className="space-y-1">
                    {history.events.map((ev, idx) => (
                      <li key={idx} className="text-xs">
                        <span className="text-foreground/50 mr-2">{new Date(ev.time).toLocaleString()}</span>
                        {ev.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-foreground/60">Memuat riwayat...</div>
                )}
              </div>
            </div>

              {/* Status Mesin */}
              <div>
                <div className="text-xs font-semibold mb-2">Status Laporan Mesin</div>
                {item.status === "unverified" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="w-full text-xs" onClick={() => updateStatus("verified")}>
                      Confirm
                    </Button>
                    <Button
                      className="w-full text-xs"
                      variant="destructive"
                      onClick={() => updateStatus("false-positive")}
                    >
                      False Positive
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.status !== "false-positive" && (
                      <Button className="text-xs" variant="destructive" onClick={() => updateStatus("false-positive")}>
                        Ubah ke False Positive
                      </Button>
                    )}
                    {item.status !== "verified" && (
                      <Button className="text-xs" onClick={() => updateStatus("verified")}>
                        Ubah ke Verified
                      </Button>
                    )}
                    <Button className="text-xs" variant="outline" onClick={() => updateStatus("unverified")}>
                      Ubah ke Unverified
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden md:col-span-3 h-full">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <div className="text-xs font-semibold">Chat AI</div>
              <Button
                size="sm"
                variant={contextMode ? "default" : "outline"}
                onClick={() => {
                  if (contextMode) setSelectedContexts([])
                  setContextMode(!contextMode)
                }}
              >
                {`Ask with Context${selectedContexts.length > 0 ? ` (${selectedContexts.length})` : ""}`}
              </Button>
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto thin-scroll p-3 space-y-2">
              {chat.map((m, i) => (
                <div key={i} className={cn("text-sm flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[85%]",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <div className="text-[10px] opacity-70 mb-1">{new Date(m.ts).toLocaleTimeString()}</div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-foreground/60">...</div>}
            </div>

            <div className="border-t border-border p-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tanya tentang kasus ini..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <Button onClick={() => send()} disabled={loading}>
                  Kirim
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

DetailModal.Table = DataTable
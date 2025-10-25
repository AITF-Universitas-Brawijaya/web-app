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
  useEffect(() => {
    if (item) setFlaggedLocal(item.flagged)
  }, [item])

  const { data: history, mutate: mutateHistory } = useSWR<{ events: { time: string; text: string }[] }>(
    item ? `/api/history?id=${item.id}` : null,
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
    setSelectedContexts((prev) =>
      prev.includes(text) ? prev.filter((x) => x !== text) : [...prev, text]
    )
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
      const res = await fetch("/api/analyze", {
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
    await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { status: next, lastModified: formatDate(new Date()) } }),
    })
    onMutate()
    await mutateHistory()
    onClose()
  }

  async function toggleFlag() {
    if (!item) return
    const nextVal = !flaggedLocal
    await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, patch: { flagged: nextVal, lastModified: formatDate(new Date()) } }),
    })
    setFlaggedLocal(nextVal)
    onMutate()
    await mutateHistory()
  }

  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[min(95vw,1200px)] sm:max-w-[min(95vw,1200px)] max-h-screen">
        <DialogHeader>
          <DialogTitle>{toHexId(item.id)} · Info Detail</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 h-[80vh]">
          {/* LEFT */}
          <div className="flex flex-col gap-4 md:col-span-4 overflow-y-auto thin-scroll pr-1">

            {/* Link */}
            <div className="flex items-center gap-2">
              <Input readOnly value={item.link} className="text-xs" title={item.link} />
              <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(item.link)}>
                📋
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

            {/* Reasoning */}
            <div
              className={cn(
                "border border-border rounded-md p-3 bg-card",
                contextMode && "cursor-pointer hover:bg-muted",
                selectedContexts.includes(item.reasoning) && "bg-muted border-primary"
              )}
              onClick={() => toggleContext(item.reasoning)}
            >
              <div className="text-xs font-semibold mb-2">Reasoning</div>
              <div className="text-sm">{item.reasoning}</div>
            </div>

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
                src={`assets/placeholder.svg?height=240&width=360&query=Gambar%20terkait%20kasus`}
                alt="Gambar terkait kasus"
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

            {/* Verifikasi */}
            <div className="mt-auto">
              <div className="text-xs font-semibold mb-2">Verifikasi Status Laporan Mesin</div>
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

          {/* RIGHT */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden md:col-span-3 h-full">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <div className="text-xs font-semibold">Chat AI</div>
              <Button
                size="sm"
                variant={contextMode ? "default" : "outline"}
                onClick={() => {
                  // toggle context mode, reset selections if turned off
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

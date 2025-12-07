"use client"

import { useEffect, useRef, useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import DataTable from "./DataTable"
import { LinkRecord, Status } from "@/types/linkRecord"
import { apiPost, apiGet, apiPut, apiDelete } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

const fetcher = async (url: string) => await apiGet(url)

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

  // Load chat
  useEffect(() => {
    if (!item) return
    const saved = localStorage.getItem(chatKey)
    if (saved) {
      try {
        setChat(JSON.parse(saved))
        return
      } catch { }
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

  // Notes state and fetching
  type Note = { id: number; id_domain: number; note_text: string; created_by: string; created_at: string; updated_at: string }
  const { data: notes, mutate: mutateNotes } = useSWR<Note[]>(
    item ? `/api/notes/${item.id}` : null,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: true }
  )
  const [newNote, setNewNote] = useState("")
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [editNoteText, setEditNoteText] = useState("")
  const [openMenuNoteId, setOpenMenuNoteId] = useState<number | null>(null)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const { user } = useAuth()

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
    setLoading(true)
    try {
      const data = await apiPost("/api/update/", {
        id: item.id,
        patch: { status: next },
      })

      console.log("[updateStatus] response:", data)

      // Close modal immediately for better UX
      onClose()

      // Update history and refresh data in background
      await mutateHistory()
      try {
        onMutate()
      } catch (err) {
        console.warn("onMutate failed or not provided:", err)
      }
    } catch (err: any) {
      console.error("Update status failed:", err)
      alert(`Gagal update status: ${err.message || "Unknown error"}`)
      setLoading(false)
    }
  }


  async function toggleFlag() {
    if (!item) return
    const nextVal = !flaggedLocal
    setFlaggedLocal(nextVal)

    try {
      const data = await apiPost("/api/update/", {
        id: item.id,
        patch: { flagged: nextVal },
      })

      console.log("[toggleFlag] response:", data)

      await mutateHistory()
      try {
        onMutate()
      } catch (err) {
        console.warn("onMutate failed or not provided:", err)
      }
    } catch (err: any) {
      console.error("Toggle flag failed:", err)
      setFlaggedLocal(!nextVal)
      alert(`Gagal mengubah flag: ${err.message || "Unknown error"}`)
    }
  }

  // Notes functions
  async function handleAddNote() {
    if (!item || !newNote.trim()) return
    setLoading(true)

    try {
      await apiPost(`/api/notes/${item.id}`, { note_text: newNote })
      setNewNote("")
      mutateNotes()
    } catch (err: any) {
      alert(`Gagal menambahkan catatan: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateNote() {
    if (!editingNote || !editNoteText.trim()) return
    setLoading(true)

    try {
      await apiPut(`/api/notes/${editingNote.id}`, { note_text: editNoteText })
      setEditingNote(null)
      setEditNoteText("")
      mutateNotes()
    } catch (err: any) {
      alert(`Gagal mengupdate catatan: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!confirm("Hapus catatan ini?")) return
    setLoading(true)

    try {
      await apiDelete(`/api/notes/${noteId}`)
      mutateNotes()
    } catch (err: any) {
      alert(`Gagal menghapus catatan: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }


  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[min(95vw,1000px)] sm:max-w-[min(95vw,1000px)] max-h-screen">
        <DialogHeader>
          <DialogTitle>{toHexId(item.id)} · Info Detail</DialogTitle>
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
                    navigator.clipboard.writeText(item.link)
                      .then(() => console.log("Link copied:", item.link))
                      .catch((err) => console.error("Clipboard error:", err));
                  } else {
                    // fallback untuk browser lama
                    const textarea = document.createElement("textarea");
                    textarea.value = item.link;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                      document.execCommand("copy");
                      console.log("Fallback copy success:", item.link);
                    } catch (err) {
                      console.error("Fallback copy failed:", err);
                    }
                    document.body.removeChild(textarea);
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
                variant="outline"
                size="icon"
                onClick={() => window.open(item.link, "_blank", "noopener,noreferrer")}
                aria-label="Open domain in new tab"
                title="Open domain"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
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
              <div className="text-xs font-semibold mb-2">Object Detection</div>
              {item.image ? (
                <img
                  src={(() => {
                    // Extract filename from path
                    // Path format: ~/tim5_prd_workdir/Gambling-Pipeline/results/inference/filename.jpg
                    const pathParts = item.image.split('/')
                    const filename = pathParts[pathParts.length - 1]

                    // Construct API URL
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                    return `${apiUrl}/api/images/detection/${filename}`
                  })()}
                  alt="Hasil deteksi object detection"
                  className="rounded-md mx-auto w-full max-w-md h-auto object-contain border"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.src = `/assets/placeholder.svg?height=240&width=360&query=Gambar%20tidak%20tersedia`
                  }}
                />
              ) : (
                <div className="rounded-md mx-auto w-full max-w-md h-48 flex items-center justify-center border bg-muted text-muted-foreground text-sm">
                  Tidak ada gambar object detection
                </div>
              )}
            </div>

            {/* Catatan */}
            <div>
              <div className="text-xs font-semibold mb-2">Catatan</div>
              <div className="border border-border rounded-md p-3 bg-card space-y-2">
                {/* Existing notes */}
                {notes && notes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-auto mb-2">
                    {notes.map((note) => (
                      <div key={note.id} className="border-b pb-2 last:border-b-0">
                        {editingNote?.id === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full p-2 border rounded text-xs"
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleUpdateNote} disabled={loading}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingNote(null)
                                  setEditNoteText("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs mb-1">{note.note_text}</div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-foreground/50">
                                {note.created_by} · {new Date(note.created_at).toLocaleString()}
                              </span>
                              {user?.username === note.created_by && (
                                <div className="flex items-center gap-1">
                                  <button
                                    className="h-6 w-6 flex items-center justify-center hover:bg-muted rounded"
                                    onClick={() => setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id)}
                                    aria-label="Note options"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="5" r="2" />
                                      <circle cx="12" cy="12" r="2" />
                                      <circle cx="12" cy="19" r="2" />
                                    </svg>
                                  </button>
                                  {openMenuNoteId === note.id && (
                                    <>
                                      <button
                                        className="px-2 py-1 text-xs hover:bg-muted rounded border border-border"
                                        onClick={() => {
                                          setEditingNote(note)
                                          setEditNoteText(note.note_text)
                                          setOpenMenuNoteId(null)
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="px-2 py-1 text-xs hover:bg-muted rounded border border-border text-destructive"
                                        onClick={() => {
                                          handleDeleteNote(note.id)
                                          setOpenMenuNoteId(null)
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new note button and input */}
                {!showNoteInput ? (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="text-[11px] text-white"
                      style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
                      onClick={() => setShowNoteInput(true)}
                    >
                      Tambah
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full p-2 border rounded text-xs"
                      placeholder="Tambahkan catatan..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => {
                        handleAddNote()
                        setShowNoteInput(false)
                      }} disabled={loading || !newNote.trim()}>
                        Simpan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowNoteInput(false)
                        setNewNote("")
                      }}>
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
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
                  <Button
                    className="w-full text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
                    onClick={() => updateStatus("verified")}
                  >
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
            <div
              className="flex items-center justify-between p-2 border-b border-border"
              style={{ background: 'linear-gradient(135deg, #1DC0EB 0%, #1199DA 50%, #0B88D3 100%)' }}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0"
                >
                  {/* Diamond/Sparkle shape similar to Gemini logo */}
                  <path
                    d="M12 2L16 8L22 12L16 16L12 22L8 16L2 12L8 8L12 2Z"
                    fill="white"
                  />
                  <path
                    d="M12 6L14 10L18 12L14 14L12 18L10 14L6 12L10 10L12 6Z"
                    fill="white"
                    opacity="0.6"
                  />
                </svg>
                <div className="text-xs font-semibold text-white">Chat AI</div>
              </div>
              <Button
                size="sm"
                className="text-[11px] h-7 px-2 py-1"
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
                <Button
                  onClick={() => send()}
                  disabled={loading}
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, #00336A 0%, #003D7D 50%, #003F81 100%)' }}
                >
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

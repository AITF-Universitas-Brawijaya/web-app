"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuth } from "@/contexts/AuthContext"
import { apiPost } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

type Tab = "detail" | "generating" | "result"

interface GeneratorSummary {
    status: string
    timestamp: string
    time_elapsed: string
    domains_generated: { success: number; total: number }
    screenshot: { success: number; failed: number; skipped: number; total: number }
    domains_inserted: number
    keywords: string[]
}

export default function CrawlingModal({
    open,
    onClose,
    onComplete,
}: {
    open: boolean
    onClose: () => void
    onComplete?: () => void
}) {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>("detail")
    const [domainCount, setDomainCount] = useState(15)
    const [keywords, setKeywords] = useState("")
    const [isEditingKeywords, setIsEditingKeywords] = useState(false)
    const [tempKeywords, setTempKeywords] = useState(keywords)
    const [generatingKeywords, setGeneratingKeywords] = useState(false)
    const [showKeywordInput, setShowKeywordInput] = useState(false)
    const [baseKeyword, setBaseKeyword] = useState("")

    // Load keywords from user preferences on mount
    useEffect(() => {
        if (user?.generator_keywords) {
            setKeywords(user.generator_keywords)
            setTempKeywords(user.generator_keywords)
        } else {
            // Default keywords if user has no saved preferences
            const defaultKeywords = "judi online, slot gacor, casino online, poker online, togel online, situs judi, agen bola, bandar togel, slot deposit, judi bola"
            setKeywords(defaultKeywords)
            setTempKeywords(defaultKeywords)
        }
    }, [user])

    // Generating tab state
    const [logs, setLogs] = useState<string[]>([])
    const [timeElapsed, setTimeElapsed] = useState(0)
    const [jobId, setJobId] = useState<string | null>(null)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [countdown, setCountdown] = useState(3)
    const [isCancelling, setIsCancelling] = useState(false)

    // Result tab state
    const [summary, setSummary] = useState<GeneratorSummary | null>(null)

    const logsEndRef = useRef<HTMLDivElement>(null)
    const eventSourceRef = useRef<EventSource | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Auto-scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    // Timer for elapsed time
    useEffect(() => {
        if (activeTab === "generating" && !timerRef.current) {
            timerRef.current = setInterval(() => {
                setTimeElapsed((t) => t + 1)
            }, 1000)
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [activeTab])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close()
            }
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [])

    // Auto-transition countdown after completion
    useEffect(() => {
        if (isCompleted && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(c => c - 1)
                // Update the last log line with new countdown
                setLogs((prev) => {
                    const newLogs = [...prev]
                    if (newLogs.length > 0 && newLogs[newLogs.length - 1].includes("automatically continue")) {
                        newLogs[newLogs.length - 1] = `[INFO] Crawling completed! This will automatically continue in ${countdown - 1} seconds...`
                    }
                    return newLogs
                })
            }, 1000)
            return () => clearTimeout(timer)
        } else if (isCompleted && countdown === 0) {
            // Auto-transition to result tab
            setActiveTab("result")
            setIsCompleted(false)
            setCountdown(3)
        }
    }, [isCompleted, countdown])

    // Request notification permission
    useEffect(() => {
        if (open && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
        }
    }, [open])

    // Reset isMinimized when modal is reopened
    useEffect(() => {
        if (open) {
            setIsMinimized(false)
        }
    }, [open])


    const keywordList = keywords.split(/[,\n]/).map(k => k.trim()).filter(k => k)

    function handleEditKeywords() {
        setIsEditingKeywords(true)
        setTempKeywords(keywords)
    }

    async function handleSaveKeywords() {
        setKeywords(tempKeywords)
        setIsEditingKeywords(false)

        // Save to user preferences in database
        try {
            await apiPost("/api/auth/preferences", {
                generator_keywords: tempKeywords
            })

            // Update localStorage to persist the change
            const storedUser = localStorage.getItem("auth_user")
            if (storedUser) {
                const userData = JSON.parse(storedUser)
                userData.generator_keywords = tempKeywords
                localStorage.setItem("auth_user", JSON.stringify(userData))
            }
        } catch (err) {
            console.error("Failed to save keywords to preferences:", err)
        }
    }

    function handleOpenKeywordGenerator() {
        setShowKeywordInput(true)
        setBaseKeyword("")
    }

    async function handleGenerateKeywords() {
        try {
            if (!baseKeyword || !baseKeyword.trim()) {
                alert("Masukkan keyword dasar terlebih dahulu")
                return
            }

            setGeneratingKeywords(true)

            // Get auth token
            const token = localStorage.getItem("auth_token")
            if (!token) {
                alert("Not authenticated")
                return
            }

            // Call keyword generation API
            const res = await fetch(`${API_BASE}/api/keywords/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    keyword: baseKeyword.trim()
                }),
            })

            if (!res.ok) {
                let errorMessage = "Failed to generate keywords";
                try {
                    const error = await res.json();
                    errorMessage = error.detail || errorMessage;
                } catch {
                    // Fallback to text if JSON parsing fails
                    const textError = await res.text();
                    errorMessage = textError || `HTTP Error ${res.status}`;
                    console.error("Non-JSON error response:", textError);
                }
                throw new Error(errorMessage);
            }

            const data = await res.json()

            // Update keywords with comma-separated format
            const generatedKeywords = data.keywords.join(", ")
            setKeywords(generatedKeywords)
            setTempKeywords(generatedKeywords)

            // Save to user preferences in database
            try {
                await apiPost("/api/auth/preferences", {
                    generator_keywords: generatedKeywords
                })

                // Update localStorage to persist the change
                const storedUser = localStorage.getItem("auth_user")
                if (storedUser) {
                    const userData = JSON.parse(storedUser)
                    userData.generator_keywords = generatedKeywords
                    localStorage.setItem("auth_user", JSON.stringify(userData))
                }
            } catch (err) {
                console.error("Failed to save keywords to preferences:", err)
            }

            // Close input and reset
            setShowKeywordInput(false)
            setBaseKeyword("")

        } catch (err) {
            alert(`Failed to generate keywords: ${err instanceof Error ? err.message : "Unknown error"}`)
        } finally {
            setGeneratingKeywords(false)
        }
    }

    async function handleGenerate() {
        try {
            setLogs([])
            setTimeElapsed(0)
            setSummary(null)
            setIsCompleted(false)
            setCountdown(3)
            setActiveTab("generating")

            // Add initial log
            setLogs(["[INFO] Starting..."])

            // Get auth token
            const token = localStorage.getItem("auth_token")
            if (!token) {
                setLogs((prev) => [...prev, "[ERROR] Not authenticated"])
                return
            }

            // Start crawler
            const res = await fetch(`${API_BASE}/api/crawler/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    domain_count: domainCount,
                    keywords: keywordList,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.detail || "Failed to start crawler")
            }

            const data = await res.json()
            setJobId(data.job_id)

            // Start streaming logs
            const eventSource = new EventSource(`${API_BASE}/api/crawler/logs/${data.job_id}`)
            eventSourceRef.current = eventSource

            eventSource.onmessage = (event) => {
                const line = event.data

                if (line === "[DONE]") {
                    eventSource.close()
                    eventSourceRef.current = null

                    // Show notification
                    if ("Notification" in window && Notification.permission === "granted") {
                        const notification = new Notification("Generation Complete", {
                            body: `Successfully generated ${domainCount} domains`,
                            icon: "/favicon.ico"
                        })

                        notification.onclick = () => {
                            window.focus()
                            setIsMinimized(false)
                        }
                    }

                    // Refresh dashboard data
                    if (onComplete) {
                        onComplete()
                    }

                    return
                }

                // Parse summary if present
                if (line.startsWith("[SUMMARY]")) {
                    const summaryJson = line.replace("[SUMMARY]", "").trim()
                    try {
                        const parsedSummary = JSON.parse(summaryJson)
                        setSummary(parsedSummary)
                        setIsCompleted(true)
                        setLogs((prev) => [...prev, "", `[INFO] Generation completed! This will automatically continue in ${countdown} seconds...`])
                    } catch (e) {
                        console.error("Failed to parse summary:", e)
                    }
                }

                // Add log line
                setLogs((prev) => [...prev, line])
            }

            eventSource.onerror = (error) => {
                console.error("EventSource error:", error)
                eventSource.close()
                eventSourceRef.current = null
                setLogs((prev) => [...prev, "[ERROR] Connection lost"])
            }
        } catch (err) {
            setLogs((prev) => [...prev, `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`])
        }
    }

    async function handleCancel() {
        if (!jobId) return

        try {
            setIsCancelling(true)
            setLogs((prev) => [...prev, "[INFO] Cancelling generation process..."])

            const token = localStorage.getItem("auth_token")
            await fetch(`${API_BASE}/api/crawler/cancel/${jobId}`, {
                method: "POST",
                headers: token ? { "Authorization": `Bearer ${token}` } : {},
            })

            if (eventSourceRef.current) {
                eventSourceRef.current.close()
                eventSourceRef.current = null
            }

            setLogs((prev) => [...prev, "[CANCELLED] Generation process cancelled by user"])

            // Wait 1.5 seconds before closing
            setTimeout(() => {
                setIsCancelling(false)
                handleClose()
            }, 1500)
        } catch (err) {
            console.error("Failed to cancel:", err)
            setIsCancelling(false)
        }
    }

    function handleContinue() {
        // Skip countdown and go directly to result
        setIsCompleted(false)
        setCountdown(3)
        setActiveTab("result")
    }

    function handleMinimize() {
        setIsMinimized(true)
        onClose()
    }

    function handleClose() {
        // Only allow close if not generating or if cancelling
        if (activeTab !== "generating" || isCancelling) {
            setActiveTab("detail")
            setLogs([])
            setTimeElapsed(0)
            setSummary(null)
            setJobId(null)
            setIsMinimized(false)
            setIsCompleted(false)
            setCountdown(3)
            setIsCancelling(false)
            onClose()
        }
    }

    function handleDone() {
        handleClose()
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    return (
        <Dialog
            open={open && !isMinimized}
            onOpenChange={(v) => {
                if (!v) {
                    if (activeTab === "generating" && !isCancelling) {
                        // Minimize instead of closing when generating
                        handleMinimize()
                    } else if (activeTab !== "generating") {
                        handleClose()
                    }
                }
            }}
        >
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Domain Generator</DialogTitle>
                </DialogHeader>


                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto pt-4" style={{ minHeight: "330px", maxHeight: "330px" }}>
                    {/* Tab 1: Crawling Detail */}
                    {activeTab === "detail" && (
                        <div className="space-y-4">
                            {/* Domain Count */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Domain Generate</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDomainCount((c) => Math.max(1, c - 1))}
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        value={domainCount}
                                        onChange={(e) => setDomainCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-24 text-center"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDomainCount((c) => c + 1)}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Keyword</label>
                                    <div className="flex gap-2">
                                        {isEditingKeywords ? (
                                            <Button size="sm" onClick={handleSaveKeywords}>
                                                Save
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="text-white border-none hover:opacity-90 hover:text-white transition-opacity"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #1DC0EB 0%, #1199DA 50%, #0B88D3 100%)'
                                                    }}
                                                    onClick={handleOpenKeywordGenerator}
                                                    disabled={generatingKeywords}
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        className="mr-1"
                                                    >
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
                                                    Keyword Generator
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={handleEditKeywords}>
                                                    Edit
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Keyword Generator Input */}
                                {showKeywordInput && (
                                    <div className="p-3 border border-primary rounded-md bg-primary/5 space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Masukkan keyword dasar untuk generate trending keywords:
                                        </label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={baseKeyword}
                                                onChange={(e) => setBaseKeyword(e.target.value)}
                                                placeholder="Contoh: judi online"
                                                className="flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !generatingKeywords) {
                                                        handleGenerateKeywords()
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleGenerateKeywords}
                                                disabled={generatingKeywords || !baseKeyword.trim()}
                                                className="text-white"
                                                style={{
                                                    background: 'linear-gradient(135deg, #1DC0EB 0%, #1199DA 50%, #0B88D3 100%)'
                                                }}
                                            >
                                                {generatingKeywords ? "Generating..." : "Generate"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowKeywordInput(false)
                                                    setBaseKeyword("")
                                                }}
                                                disabled={generatingKeywords}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {isEditingKeywords ? (
                                    <textarea
                                        value={tempKeywords}
                                        onChange={(e) => setTempKeywords(e.target.value)}
                                        className="w-full p-3 text-sm border border-border rounded-md bg-background resize-none"
                                        style={{ height: "165px" }}
                                        placeholder="Masukkan keyword-keyword untuk mencari domain, pisahkan dengan koma atau baris baru"
                                    />
                                ) : (
                                    <div className="p-3 border border-border rounded-md bg-muted/30 text-sm" style={{ height: "170px", overflowY: "auto" }}>
                                        {keywords}
                                    </div>
                                )}

                                <div className="text-xs text-muted-foreground">
                                    {keywordList.length} keywords
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Generating */}
                    {activeTab === "generating" && (
                        <div className="space-y-4">
                            {/* Logs */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Log</label>
                                <div className="mt-1 bg-black text-green-400 p-4 rounded-md h-[250px] overflow-y-auto font-mono text-xs">
                                    {logs.map((log, i) => (
                                        <div key={i}>{log}</div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>

                            {/* Time Elapsed */}
                            <div className="text-sm text-muted-foreground">
                                Time elapsed: {formatTime(timeElapsed)}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Result */}
                    {activeTab === "result" && summary && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Summary</label>
                                <div className="mt-1 p-4 border border-border rounded-md space-y-2 text-sm">
                                    <div>
                                        <strong>Status:</strong> {summary.status === "success" ? "Success" : "Partial Success"}
                                    </div>
                                    <div>
                                        <strong>Time:</strong> {new Date(summary.timestamp).toLocaleString()}
                                    </div>
                                    <div>
                                        <strong>Time Elapsed:</strong> {summary.time_elapsed}
                                    </div>
                                    <div>
                                        <strong>Domains Generated:</strong> {summary.domains_generated.success}/{summary.domains_generated.total} Success
                                    </div>
                                    <div>
                                        <strong>Screenshot:</strong> {summary.screenshot.success}/{summary.screenshot.total} Success
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                {summary.domains_inserted} domain inserted
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Footer - Fixed at bottom */}
                <div className="pt-4 mt-4">
                    {activeTab === "detail" && (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleGenerate}>Generate</Button>
                        </div>
                    )}

                    {activeTab === "generating" && (
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleMinimize}>
                                Minimize
                            </Button>
                            {isCompleted ? (
                                <Button onClick={handleContinue}>
                                    Continue ({countdown}s)
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
                                    {isCancelling ? "Cancelling..." : "Cancel"}
                                </Button>
                            )}
                        </div>
                    )}

                    {activeTab === "result" && (
                        <div className="flex justify-end">
                            <Button onClick={handleDone}>Done</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { useAuth } from "@/contexts/AuthContext"
import { apiPost } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

type Tab = "detail" | "generating" | "result"
type InputMode = "search" | "manual"

interface GeneratorSummary {
    status: string
    timestamp: string
    time_elapsed: string
    domains_generated: { success: number; total: number }
    screenshot: { success: number; failed: number; skipped: number; total: number }
    domains_inserted: number
    keywords: string[]
    detection_api?: { success: number; failed: number; total: number }
    reasoning_api?: { success: number; failed: number; total: number }
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
    const [inputMode, setInputMode] = useState<InputMode>("search")

    // Search Mode State
    const [domainCount, setDomainCount] = useState(15)
    const [keywords, setKeywords] = useState("")
    const [isEditingKeywords, setIsEditingKeywords] = useState(false)
    const [tempKeywords, setTempKeywords] = useState(keywords)
    const [generatingKeywords, setGeneratingKeywords] = useState(false)
    const [showKeywordInput, setShowKeywordInput] = useState(false)
    const [baseKeyword, setBaseKeyword] = useState("")

    // Manual Mode State
    const [manualDomains, setManualDomains] = useState("")

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
    const [generatedDomains, setGeneratedDomains] = useState<string[]>([])
    const [sendingToRunPod, setSendingToRunPod] = useState(false)

    // Service health state
    interface ServiceStatus {
        port: number
        status: "up" | "down"
    }

    interface HealthCheckResponse {
        status: string
        services: {
            scrape_service?: ServiceStatus
            reasoning_service?: ServiceStatus
            chat_service?: ServiceStatus
            obj_detection_service?: ServiceStatus
        }
    }

    const [serviceHealth, setServiceHealth] = useState<HealthCheckResponse | null>(null)
    const [loadingHealth, setLoadingHealth] = useState(false)

    const logsEndRef = useRef<HTMLDivElement | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
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
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
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

    // Fetch service health when modal opens
    useEffect(() => {
        if (open && activeTab === "detail") {
            fetchServiceHealth()
        }
    }, [open, activeTab])

    async function fetchServiceHealth() {
        try {
            setLoadingHealth(true)
            const response = await fetch('/api/health-check')
            if (!response.ok) {
                throw new Error('Failed to fetch service health')
            }
            const data: HealthCheckResponse = await response.json()
            setServiceHealth(data)
        } catch (error) {
            console.error('Failed to fetch service health:', error)
            // Set null if fetch fails
            setServiceHealth(null)
        } finally {
            setLoadingHealth(false)
        }
    }


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

    async function sendKeywordsToRunPod(keywordData: string, numDomains: number) {
        if (!keywordData || keywordData.trim() === "") {
            console.log("No keyword to send to RunPod")
            return
        }

        try {
            setSendingToRunPod(true)
            setLogs((prev: string[]) => [...prev, `[INFO] Sending keyword "${keywordData}" with ${numDomains} domains to RunPod API for processing...`])

            const response = await fetch("/api/runpod-process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    data: keywordData,
                    num_domains: numDomains
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(errorData.error || `HTTP ${response.status}`)
            }

            const data = await response.json()
            setLogs((prev) => [...prev, `[SUCCESS] RunPod API response: ${JSON.stringify(data)}`])
        } catch (error: any) {
            console.error("Failed to send keyword to RunPod:", error)
            setLogs((prev: string[]) => [...prev, `[ERROR] Failed to send to RunPod: ${error.message}`])
        } finally {
            setSendingToRunPod(false)
        }
    }

    async function handleGenerate() {
        // Check service health before proceeding
        if (serviceHealth?.services) {
            const activeServices = [
                serviceHealth.services?.scrape_service?.status === "up",
                serviceHealth.services?.reasoning_service?.status === "up",
                serviceHealth.services?.obj_detection_service?.status === "up"
            ].filter(Boolean).length

            if (activeServices < 3) {
                const inactiveServices = []
                if (serviceHealth.services?.scrape_service?.status !== "up") inactiveServices.push('Scrape')
                if (serviceHealth.services?.reasoning_service?.status !== "up") inactiveServices.push('Reasoning')
                if (serviceHealth.services?.obj_detection_service?.status !== "up") inactiveServices.push('Detection')

                const confirmMessage = `⚠️ Warning: ${inactiveServices.join(', ')} service(s) are currently inactive (${activeServices}/3 services active).\n\nProcessing may fail or produce incomplete results. Do you want to continue anyway?`

                if (!confirm(confirmMessage)) {
                    return
                }
            }
        }

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
                setLogs((prev: string[]) => [...prev, "[ERROR] Not authenticated"])
                return
            }

            let endpoint = "/api/crawler/start"
            let body = {}
            let usedKeywords: string[] = []

            if (inputMode === "search") {
                const searchKeywords = keywords.split(/[,\n]/).map(k => k.trim()).filter(k => k)
                if (searchKeywords.length === 0) {
                    setLogs((prev: string[]) => [...prev, "[ERROR] No keywords provided"])
                    // Reset to detail tab after error
                    setTimeout(() => setActiveTab("detail"), 2000)
                    return
                }
                usedKeywords = searchKeywords
                body = {
                    domain_count: domainCount,
                    keywords: searchKeywords,
                }
            } else {
                // Manual mode
                const domains = manualDomains.split(/[,\n]/).map(d => d.trim()).filter(d => d)
                if (domains.length === 0) {
                    setLogs((prev) => [...prev, "[ERROR] No domains provided"])
                    setTimeout(() => setActiveTab("detail"), 2000)
                    return
                }
                endpoint = "/api/crawler/manual"
                body = {
                    domains: domains
                }
            }

            // Start crawler
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.detail || "Failed to start crawler")
            }

            const data = await res.json()
            setJobId(data.job_id)

            // Start streaming logs using fetch + ReadableStream to avoid browser buffering
            const controller = new AbortController()
            abortControllerRef.current = controller

            try {
                const response = await fetch(`${API_BASE}/api/crawler/logs/${data.job_id}`, {
                    signal: controller.signal
                })

                if (!response.ok) {
                    throw new Error(`Failed to connect to log stream: ${response.statusText}`)
                }

                if (!response.body) {
                    throw new Error("ReadableStream not supported")
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ""

                while (true) {
                    const { done, value } = await reader.read()

                    if (done) {
                        break
                    }

                    const chunk = decoder.decode(value, { stream: true })
                    buffer += chunk

                    const parts = buffer.split("\n\n")
                    // Keep the last part in buffer as it might be incomplete
                    buffer = parts.pop() || ""

                    for (const part of parts) {
                        const lines = part.split("\n")
                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const message = line.slice(6)

                                if (message === "[DONE]") {
                                    handleStreamComplete()
                                    return
                                }

                                // Parse summary if present
                                if (message.startsWith("[SUMMARY]")) {
                                    const summaryJson = message.replace("[SUMMARY]", "").trim()
                                    try {
                                        const parsedSummary = JSON.parse(summaryJson)
                                        setSummary(parsedSummary)
                                        setIsCompleted(true)
                                        setLogs((prev: string[]) => [...prev, "", `[INFO] Crawling completed! This will automatically continue in ${countdown} seconds...`])

                                        // Send keyword to RunPod API if we have generated domains and used keywords
                                        if (parsedSummary.domains_generated && parsedSummary.domains_generated.success > 0 && usedKeywords.length > 0) {
                                            // Send the first keyword to RunPod with domain count
                                            sendKeywordsToRunPod(usedKeywords[0], domainCount)
                                        }
                                    } catch (e) {
                                        console.error("Failed to parse summary:", e)
                                    }
                                }

                                // Add log line
                                setLogs((prev: string[]) => [...prev, message])
                            }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error("Stream error:", err)
                    setLogs((prev) => [...prev, "[ERROR] Connection lost"])
                }
            } finally {
                abortControllerRef.current = null
            }
        } catch (err) {
            setLogs((prev) => [...prev, `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`])
        }
    }

    function handleStreamComplete() {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        // Show notification
        if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("Generation Complete", {
                body: `Successfully generated domains`,
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

            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
                abortControllerRef.current = null
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
                <div className="flex-1 overflow-y-auto" style={{ minHeight: "354px", maxHeight: "354px" }}>
                    {/* Tab 1: Crawling Detail */}
                    {activeTab === "detail" && (
                        <div className="space-y-4">
                            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-5">
                                    <TabsTrigger value="search">Search by Keywords</TabsTrigger>
                                    <TabsTrigger value="manual">Domain Input</TabsTrigger>
                                </TabsList>

                                <TabsContent value="search" className="space-y-4 mt-0">
                                    {/* Domain Count */}
                                    <div className="grid w-full items-center grid-cols-2 mb-5">
                                        <label className="text-sm font-medium">Jumlah Domain Generate</label>
                                        <div className="flex justify-end gap-2 mt-1">
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
                                                style={{ height: "125px" }}
                                                placeholder="Masukkan keyword-keyword untuk mencari domain, pisahkan dengan koma atau baris baru"
                                            />
                                        ) : (
                                            <div className="p-3 border border-border rounded-md bg-muted/30 text-sm" style={{ height: "170px", overflowY: "auto" }}>
                                                {keywords}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-muted-foreground">
                                                {keywordList.length} keywords
                                            </div>
                                            {isEditingKeywords && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setTempKeywords("")}
                                                    disabled={!tempKeywords}
                                                >
                                                    Clear
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="manual" className="space-y-4 mt-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">Input Domains Manually</label>
                                            <div className="text-xs text-muted-foreground">
                                                One domain per line or comma separated
                                            </div>
                                        </div>

                                        <textarea
                                            value={manualDomains}
                                            onChange={(e) => setManualDomains(e.target.value)}
                                            className="w-full p-3 text-sm border border-border rounded-md bg-background resize-none font-mono"
                                            style={{ height: "215px" }}
                                            placeholder="example.com&#10;test.com&#10;https://another-domain.net"
                                        />

                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-muted-foreground">
                                                {manualDomains.split(/[,\n]/).filter(d => d.trim()).length} domains
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="file"
                                                    id="domain-file-upload"
                                                    accept=".txt,.csv"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            const reader = new FileReader()
                                                            reader.onload = (event) => {
                                                                const content = event.target?.result as string
                                                                setManualDomains(content)
                                                            }
                                                            reader.readAsText(file)
                                                        }
                                                        // Reset input value to allow uploading the same file again
                                                        e.target.value = ""
                                                    }}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => document.getElementById("domain-file-upload")?.click()}
                                                >
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="mr-1"
                                                    >
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                    Upload File
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setManualDomains("")}
                                                    disabled={!manualDomains}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
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

                                    {/* New fields from updated summary format */}
                                    {summary.detection_api && (
                                        <div>
                                            <strong>Detection API:</strong> {summary.detection_api.success}/{summary.detection_api.total} Success
                                        </div>
                                    )}
                                    {summary.reasoning_api && (
                                        <div>
                                            <strong>Reasoning API:</strong> {summary.reasoning_api.success}/{summary.reasoning_api.total} Success
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                {summary.domains_inserted} domain{summary.domains_inserted !== 1 ? 's' : ''} inserted
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Footer - Fixed at bottom */}
                <div className="pt-4 mt-4">
                    {activeTab === "detail" && (
                        <div className="flex justify-between items-center gap-2">
                            {/* Service Status */}
                            <div className="flex items-center gap-2">
                                {loadingHealth ? (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Checking services...</span>
                                    </div>
                                ) : serviceHealth ? (
                                    <div className="flex items-center gap-2">
                                        <div className={`text-xs font-medium ${[
                                            serviceHealth.services?.scrape_service?.status === "up",
                                            serviceHealth.services?.reasoning_service?.status === "up",
                                            serviceHealth.services?.obj_detection_service?.status === "up"
                                        ].filter(Boolean).length === 3
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-orange-600 dark:text-orange-400'
                                            }`}>
                                            {[
                                                serviceHealth.services?.scrape_service?.status === "up",
                                                serviceHealth.services?.reasoning_service?.status === "up",
                                                serviceHealth.services?.obj_detection_service?.status === "up"
                                            ].filter(Boolean).length}/3 Services
                                        </div>
                                        <div className="flex gap-1" title="Scrape | Reasoning | Detection">
                                            <div className={`w-2 h-2 rounded-full ${serviceHealth.services?.scrape_service?.status === "up" ? 'bg-green-500' : 'bg-red-500'
                                                }`} title="Scrape Service" />
                                            <div className={`w-2 h-2 rounded-full ${serviceHealth.services?.reasoning_service?.status === "up" ? 'bg-green-500' : 'bg-red-500'
                                                }`} title="Reasoning Service" />
                                            <div className={`w-2 h-2 rounded-full ${serviceHealth.services?.obj_detection_service?.status === "up" ? 'bg-green-500' : 'bg-red-500'
                                                }`} title="Detection Service" />
                                        </div>
                                        <button
                                            onClick={fetchServiceHealth}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            title="Refresh service status"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-red-600 dark:text-red-400">
                                        Service status unavailable
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button onClick={handleGenerate}>
                                    {inputMode === 'search' ? 'Generate' : 'Process Domains'}
                                </Button>
                            </div>
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

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { apiGet, apiPost } from "@/lib/api"

export default function GeneratorSettingsSection() {
    const [blockedDomains, setBlockedDomains] = useState("")
    const [blockedKeywords, setBlockedKeywords] = useState("")
    const [serpApiKey, setSerpApiKey] = useState("")
    const [quota, setQuota] = useState<{ used: number, limit: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadingDomains, setLoadingDomains] = useState(true)
    const [loadingKeywords, setLoadingKeywords] = useState(true)
    const [loadingSerpApi, setLoadingSerpApi] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const [domainsData, keywordsData, serpApiData] = await Promise.all([
                apiGet("/api/admin/generator/blocked-domains"),
                apiGet("/api/admin/generator/blocked-keywords"),
                apiGet("/api/admin/generator/serpapi-key"),
            ])

            setBlockedDomains(domainsData.value || "")
            setBlockedKeywords(keywordsData.value || "")
            setSerpApiKey(serpApiData.value || "")
            setQuota(serpApiData.quota || null)
        } catch (err: any) {
            console.error("Failed to load settings:", err)
        } finally {
            setLoadingDomains(false)
            setLoadingKeywords(false)
            setLoadingSerpApi(false)
        }
    }

    const handleSaveDomains = async () => {
        setLoading(true)
        try {
            await apiPost("/api/admin/generator/blocked-domains", { value: blockedDomains })
            alert("Blocked domains saved successfully")
        } catch (err: any) {
            alert(`Failed to save blocked domains: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveKeywords = async () => {
        setLoading(true)
        try {
            await apiPost("/api/admin/generator/blocked-keywords", { value: blockedKeywords })
            alert("Blocked keywords saved successfully")
        } catch (err: any) {
            alert(`Failed to save blocked keywords: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveSerpApiKey = async () => {
        setLoading(true)
        try {
            const response = await apiPost("/api/admin/generator/serpapi-key", { value: serpApiKey })
            setQuota(response.quota || null)
            alert("SerpAPI key saved successfully")
        } catch (err: any) {
            alert(`Failed to save SerpAPI key: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Generator Settings</h2>

            <div className="space-y-6">
                {/* Blocked Domains */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Blocked Domains (one per line)
                    </label>
                    {loadingDomains ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <>
                            <textarea
                                className="w-full h-40 p-3 border rounded-md font-mono text-sm"
                                value={blockedDomains}
                                onChange={(e) => setBlockedDomains(e.target.value)}
                                placeholder="youtube.com&#10;facebook.com&#10;twitter.com"
                            />
                            <Button
                                onClick={handleSaveDomains}
                                disabled={loading}
                                className="mt-2"
                            >
                                {loading ? "Saving..." : "Save Blocked Domains"}
                            </Button>
                        </>
                    )}
                </div>

                {/* Blocked Keywords */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Blocked Keywords (one per line)
                    </label>
                    {loadingKeywords ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <>
                            <textarea
                                className="w-full h-40 p-3 border rounded-md font-mono text-sm"
                                value={blockedKeywords}
                                onChange={(e) => setBlockedKeywords(e.target.value)}
                                placeholder="wikipedia&#10;youtube&#10;facebook"
                            />
                            <Button
                                onClick={handleSaveKeywords}
                                disabled={loading}
                                className="mt-2"
                            >
                                {loading ? "Saving..." : "Save Blocked Keywords"}
                            </Button>
                        </>
                    )}
                </div>

                {/* SerpAPI Key */}
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        SerpAPI Key
                    </label>
                    {loadingSerpApi ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <>
                            <input
                                type="password"
                                className="w-full p-3 border rounded-md font-mono text-sm mb-2"
                                value={serpApiKey}
                                onChange={(e) => setSerpApiKey(e.target.value)}
                                placeholder="Enter your SerpAPI key"
                            />
                            {quota && (
                                <div className="text-sm text-muted-foreground mb-2">
                                    Quota: {quota.used}/{quota.limit} searches used this month
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground mb-2">
                                Used for generating trending keywords. Get your API key from{" "}
                                <a
                                    href="https://serpapi.com/manage-api-key"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    SerpAPI Dashboard
                                </a>
                            </div>
                            <Button
                                onClick={handleSaveSerpApiKey}
                                disabled={loading}
                                className="mt-2"
                            >
                                {loading ? "Saving..." : "Save SerpAPI Key"}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </Card>
    )
}

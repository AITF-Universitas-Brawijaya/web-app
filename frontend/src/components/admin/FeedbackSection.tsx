"use client"

import { useEffect, useState } from "react"
import { apiGet } from "@/lib/api"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface Feedback {
    id_feedback: number
    messages: string
    sender: string
    waktu_pengiriman: string
}

export default function FeedbackSection() {
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchFeedback = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiGet<Feedback[]>("/api/feedback")
            setFeedbackList(data)
        } catch (err: any) {
            setError(err.message || "Failed to load feedback")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFeedback()
    }, [])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <section className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">User Feedback</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFeedback}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
                    {error}
                </div>
            )}

            {loading && feedbackList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    Loading feedback...
                </div>
            ) : feedbackList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No feedback received yet.
                </div>
            ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {feedbackList.map((feedback) => (
                        <div
                            key={feedback.id_feedback}
                            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <span className="font-medium text-foreground">
                                        {feedback.sender}
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        #{feedback.id_feedback}
                                    </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(feedback.waktu_pengiriman)}
                                </span>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">
                                {feedback.messages}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

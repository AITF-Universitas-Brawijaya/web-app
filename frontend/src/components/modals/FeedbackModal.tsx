"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { apiPost } from "@/lib/api"

interface FeedbackModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const [message, setMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!message.trim()) {
            setError("Pesan feedback tidak boleh kosong")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await apiPost("/api/feedback", { message: message.trim() })

            // Success - reset and close
            setMessage("")
            onClose()

            // Optional: Show success notification
            if (typeof window !== "undefined") {
                alert("Feedback berhasil dikirim!")
            }
        } catch (err: any) {
            setError(err.message || "Gagal mengirim feedback")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Kirim Feedback</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label htmlFor="feedback-message" className="block text-sm font-medium mb-2">
                            Pesan Feedback
                        </label>
                        <textarea
                            id="feedback-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tulis feedback Anda di sini..."
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={6}
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !message.trim()}
                        >
                            {isSubmitting ? "Mengirim..." : "Kirim"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

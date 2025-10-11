import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(req: Request) {
  const { question, item } = await req.json()
  if (!question || !item) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  const prompt = `
Anda adalah asisten untuk analis Kominfo (Indonesia).
Jawab singkat dan profesional dalam Bahasa Indonesia.

Konteks Kasus:
- URL: ${item.link}
- Kategori Terdeteksi: ${item.jenis}
- Kepercayaan: ${item.kepedean}%
- Status: ${item.status}
- Penalaran Otomatis: ${item.reasoning}

Pertanyaan Pengguna:
${question}
`

  const { text } = await generateText({
    // Uses Vercel AI Gateway default providers
    model: "google/gemini-1.5-flash",
    prompt,
    apiKey: process.env.GEMINI_API_KEY, // Added line to include API key from environment
  })

  return NextResponse.json({ reply: text })
}

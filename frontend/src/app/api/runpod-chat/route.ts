import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        if (!body.query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            )
        }

        // Call RunPod API
        const runpodBaseUrl = process.env.SERVICE_API_URL || 'http://localhost:7000'
        const response = await fetch(`${runpodBaseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: body.query,
                category: body.category || 'edukasi',
                k: body.k || 5,
                max_new_tokens: body.max_new_tokens || 512,
                temperature: body.temperature || 0.1
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json(
                { error: `RunPod API error: ${response.status} - ${errorText}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('RunPod proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

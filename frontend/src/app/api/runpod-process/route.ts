import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        if (!body.data || typeof body.data !== 'string') {
            return NextResponse.json(
                { error: 'Data (keyword) is required and must be a string' },
                { status: 400 }
            )
        }

        // Prepare request payload
        const payload: { data: string; num_domains?: number } = {
            data: body.data
        }

        // Add num_domains if provided
        if (body.num_domains && typeof body.num_domains === 'number') {
            payload.num_domains = body.num_domains
        }

        // Call RunPod API /process endpoint
        const runpodBaseUrl = process.env.SERVICE_API_URL || 'https://l7i1ghaqgdha36-3000.proxy.runpod.net'
        const apiKey = process.env.SERVICE_API_KEY || ''
        const response = await fetch(`${runpodBaseUrl}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(payload)
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
        console.error('RunPod process proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

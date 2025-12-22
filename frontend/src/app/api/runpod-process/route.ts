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
        const runpodBaseUrl = process.env.SERVICE_API_URL || 'http://localhost:5000'
        const response = await fetch(`${runpodBaseUrl}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

        // Try to parse as JSON first, fallback to text
        const contentType = response.headers.get('content-type')
        let data: any

        if (contentType?.includes('application/json')) {
            try {
                data = await response.json()
            } catch (e) {
                // If JSON parsing fails, treat as text
                const textData = await response.text()
                data = { message: textData, status: 'success' }
            }
        } else {
            // Non-JSON response, treat as text
            const textData = await response.text()
            data = { message: textData, status: 'success' }
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('RunPod process proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

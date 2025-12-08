"use client"
import { useEffect, useRef } from 'react'

interface Particle {
    x: number
    y: number
    radius: number
    opacity: number
}

export function StaticParticlesBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const resizeCanvas = () => {
            const parent = canvas.parentElement
            if (parent) {
                canvas.width = parent.offsetWidth
                canvas.height = parent.offsetHeight
            }
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Create static particles
        const particles: Particle[] = []
        const particleCount = 25 // Reduced from 50 to make particles more sparse

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1.5,
                opacity: Math.random() * 0.1 + 0.15 // Reduced from 0.3 + 0.5
            })
        }

        // Draw once (static, no animation)
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw connections first (behind particles)
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach((p2) => {
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 150) {
                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        const opacity = 0.15 * (1 - distance / 150)
                        ctx.strokeStyle = `rgba(29, 192, 235, ${opacity})` // Changed to blue (cyan)
                        ctx.lineWidth = 1.2
                        ctx.stroke()
                    }
                })
            })

            // Draw particles on top
            particles.forEach((particle) => {
                // Draw particle with glow effect
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(29, 192, 235, ${particle.opacity})` // Changed to blue (cyan)
                ctx.fill()

                // Add subtle glow
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.radius + 1, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(29, 192, 235, ${particle.opacity * 0.2})`
                ctx.fill()
            })
        }

        draw()

        // Redraw on resize
        const handleResize = () => {
            resizeCanvas()
            // Regenerate particles for new dimensions
            particles.length = 0
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 2 + 1.5,
                    opacity: Math.random() * 0.1 + 0.15 // Consistent with initial generation
                })
            }
            draw()
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
            aria-hidden="true"
        />
    )
}

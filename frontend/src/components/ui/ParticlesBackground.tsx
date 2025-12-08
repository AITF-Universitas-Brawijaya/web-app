"use client"
import { useEffect, useRef } from 'react'

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    opacity: number
}

export function ParticlesBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Create particles
        const particles: Particle[] = []
        const particleCount = 80

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1.5,
                opacity: Math.random() * 0.3 + 0.6
            })
        }

        // Animation loop
        let animationFrameId: number

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw connections first (behind particles)
            particles.forEach((p1, i) => {
                particles.slice(i + 1).forEach((p2) => {
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 200) {
                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        const opacity = 0.7 * (1 - distance / 200)
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                    }
                })
            })

            // Draw particles on top
            particles.forEach((particle) => {
                // Update position
                particle.x += particle.vx
                particle.y += particle.vy

                // Bounce off edges
                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

                // Draw particle with glow effect
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`
                ctx.fill()

                // Add subtle glow
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.radius + 1, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.3})`
                ctx.fill()
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <div className="absolute top-0 -z-0 h-full w-full">
            {/* Gradient blur overlay */}
            <div
                className="absolute z-0 h-full w-full opacity-80 blur-[2.5px]"
                style={{
                    background: 'linear-gradient(270deg, rgba(0, 51, 106, 0) 52.22%, rgba(0, 51, 106, 1) 100%)'
                }}
            />

            {/* Particles canvas */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
                aria-hidden="true"
            />
        </div>
    )
}

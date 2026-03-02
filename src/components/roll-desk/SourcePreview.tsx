import { useContext, useEffect, useRef, useState } from 'react'
import { PaperStretch, RollCopy } from 'linked-rolls'
import { valueOf } from 'linked-rolls/lib/Assumption'
import { Arguable } from './Arguable'
import { EditionContext } from '../../providers/EditionContext'

interface SourcePreviewProps {
    copy: RollCopy
    copyIndex: number
    active: boolean
    onClick: () => void
    globalBounds: { minX: number, maxX: number }
}

export const SourcePreview = ({ copy, copyIndex, active, onClick, globalBounds }: SourcePreviewProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [hovered, setHovered] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.scale(dpr, dpr)
        drawPreview(ctx, rect.width, rect.height, copy, globalBounds, active)
    }, [copy, globalBounds, active])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver(() => {
            const canvas = canvasRef.current
            if (!canvas) return

            const dpr = window.devicePixelRatio || 1
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.scale(dpr, dpr)
            drawPreview(ctx, rect.width, rect.height, copy, globalBounds, active)
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [copy, globalBounds, active])

    const date = copy.production?.date
        ? (
            <Arguable
                path={['copies', copyIndex, 'production', 'date']}
            >
                {new Intl.DateTimeFormat().format(
                    valueOf(copy.production.date)
                )}
            </Arguable>
        )
        : 'unknown date'

    return (
        <div
            ref={containerRef}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                cursor: 'pointer',
                border: active ? '2px solid #1976d2' : '1px solid #e0e0e0',
                borderRadius: 4,
                marginBottom: 6,
                background: active
                    ? 'rgba(25, 118, 210, 0.06)'
                    : hovered ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                transition: 'background 0.15s, border-color 0.15s',
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: 40, display: 'block' }}
            />
            <div style={{
                padding: '0 6px 4px',
                fontSize: 10,
                color: '#777',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span>{date}</span>
                <span>{copy.location}</span>
            </div>
        </div>
    )
}

function drawPreview(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    copy: RollCopy,
    globalBounds: { minX: number, maxX: number },
    active: boolean
) {
    ctx.clearRect(0, 0, w, h)

    if (copy.features.length === 0) return

    const pad = 6
    const drawH = h - pad * 2
    const drawW = w - pad * 2

    const shift = copy.measurements.shift?.horizontal || 0
    const stretchCondition = copy.conditions.find(c => c.type === 'paper-stretch')
    const stretch = stretchCondition ? (stretchCondition as PaperStretch).factor : 1

    // Feature extents in collated space
    let cMinX = Infinity, cMaxX = -Infinity
    for (const f of copy.features) {
        cMinX = Math.min(cMinX, f.horizontal.from)
        cMaxX = Math.max(cMaxX, f.horizontal.to)
    }

    // Original extent (undo shift/stretch)
    const oMinX = (cMinX - shift) / stretch
    const oMaxX = (cMaxX - shift) / stretch

    const range = globalBounds.maxX - globalBounds.minX
    if (range <= 0) return

    const sx = (x: number) => pad + ((x - globalBounds.minX) / range) * drawW

    // Dotted outline (original extent)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = '#bbb'
    ctx.lineWidth = 1
    ctx.strokeRect(sx(oMinX), pad, sx(oMaxX) - sx(oMinX), drawH)

    // Solid outline (collated extent)
    ctx.setLineDash([])
    ctx.strokeStyle = active ? '#1976d2' : '#555'
    ctx.lineWidth = active ? 1.5 : 1
    ctx.strokeRect(sx(cMinX), pad, sx(cMaxX) - sx(cMinX), drawH)

    // Features as tiny rects
    ctx.fillStyle = '#777'
    for (const f of copy.features) {
        const x = sx(f.horizontal.from)
        const fw = Math.max(sx(f.horizontal.to) - sx(f.horizontal.from), 0.5)
        const y = pad + (f.vertical.from / 99) * drawH
        let fh: number
        if (f.vertical.to !== undefined) {
            fh = ((f.vertical.to - f.vertical.from) / 99) * drawH
        } else {
            fh = (1 / 99) * drawH
        }
        ctx.fillRect(x, y, fw, Math.max(Math.abs(fh), 0.5))
    }
}

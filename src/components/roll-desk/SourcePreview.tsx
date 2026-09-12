import { useEffect, useRef, useState } from 'react'
import { add, Millimeters, mm, RollCopy, scale as times, subtract, TrackerBar } from 'linked-rolls'
import { valueOf } from 'linked-rolls'
import { Arguable } from './Arguable'
import { atLeastVisible, boxOf, evenGeometry, Translation } from '../../helpers/rollGeometry'
import { Span, spanning } from '../../helpers/scale'
import { Svg, svg } from '../../helpers/units'

/**
 * Where a collated place sat on the copy's own paper, undoing the shift
 * and stretch the collation gave it.
 */
export const asRead = (copy: RollCopy) => {
    const shift = copy.measurements.shift?.horizontal ?? mm(0)
    const stretch = copy.measurements.scale ?? 1
    return (x: Millimeters): Millimeters => times(subtract(x, shift), 1 / stretch)
}

interface SourcePreviewProps {
    copy: RollCopy
    copyIndex: number
    active: boolean
    onClick: () => void
    /** The axis the whole stack is drawn against, so the previews can be compared. */
    globalBounds: Span
    /** The bar the tracks are read against, which fixes how the height is divided. */
    bar: TrackerBar
}

export const SourcePreview = ({ copy, copyIndex, active, onClick, globalBounds, bar }: SourcePreviewProps) => {
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
        drawPreview(ctx, svg(rect.width), svg(rect.height), copy, globalBounds, active, bar)
    }, [copy, globalBounds, active, bar])

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
            drawPreview(ctx, svg(rect.width), svg(rect.height), copy, globalBounds, active, bar)
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [copy, globalBounds, active, bar])

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
                <span>{copy.keeper.name}</span>
            </div>
        </div>
    )
}

function drawPreview(
    ctx: CanvasRenderingContext2D,
    w: Svg,
    h: Svg,
    copy: RollCopy,
    globalBounds: Span,
    active: boolean,
    bar: TrackerBar
) {
    ctx.clearRect(0, 0, w, h)

    if (copy.features.length === 0) return

    const pad = svg(6)
    const drawH = subtract(h, times(pad, 2))
    const drawW = subtract(w, times(pad, 2))

    const collated = spanning(copy.features.map(f => ({ from: f.horizontal.from, to: f.horizontal.to })))
    if (!collated) return

    const place = asRead(copy)
    const original: Span = { from: place(collated.from), to: place(collated.to) }

    const range = subtract(globalBounds.to, globalBounds.from)
    if (range <= 0) return

    const sx = (x: Millimeters): Svg => add(pad, times(drawW, subtract(x, globalBounds.from) / range))

    // Dotted outline (original extent)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = '#bbb'
    ctx.lineWidth = 1
    ctx.strokeRect(sx(original.from), pad, subtract(sx(original.to), sx(original.from)), drawH)

    // Solid outline (collated extent)
    ctx.setLineDash([])
    ctx.strokeStyle = active ? '#1976d2' : '#555'
    ctx.lineWidth = active ? 1.5 : 1
    ctx.strokeRect(sx(collated.from), pad, subtract(sx(collated.to), sx(collated.from)), drawH)

    const translation: Translation = { translateX: sx, bandOf: evenGeometry(drawH, bar).bandOf, bar }

    // Features as tiny rects
    ctx.fillStyle = '#777'
    copy.features.forEach(f => {
        const { x, y, width, height } = atLeastVisible(boxOf(f, translation))
        ctx.fillRect(x, add(pad, y), width, height)
    })
}

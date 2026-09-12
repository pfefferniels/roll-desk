import { useEffect, useRef } from "react"
import { add, AnyFeature, Millimeters, RollCopy, scale as times, subtract, TrackerBar } from "linked-rolls"
import { atLeastVisible, boxOf, evenGeometry, Translation } from "../../helpers/rollGeometry"
import { padded, Span, spanning } from "../../helpers/scale"
import { Svg, svg } from "../../helpers/units"

/** Where a place in a copy falls on the shared axis, which is the paper's own. */
export type Placement = (x: Millimeters) => Millimeters

/** Where a set of features reaches, once each is placed on the shared axis. */
export const spanOf = (features: AnyFeature[], place: Placement): Span | undefined =>
    spanning(features.map(f => ({ from: place(f.horizontal.from), to: place(f.horizontal.to) })))

/** One copy, drawn at one placement, in one pair of colours. */
interface Layer {
    features: AnyFeature[]
    place: Placement
    fill: string
    outline: {
        stroke: string
        width: number
        dash: number[]
    }
}

/** A layer once it is known how far it reaches, which a layer without features does not. */
type MeasuredLayer = Layer & { span?: Span }

/** What the preview shows: one copy as read and as aligned, over the copy it is aligned to. */
export interface AlignmentPreviewProps {
    copy: RollCopy
    alignTo: RollCopy
    shift: Millimeters
    scale: number
    /** The bar the tracks are read against, which fixes how the height is divided. */
    bar: TrackerBar
}

/** The same, on a canvas of a given size. */
export interface AlignmentDrawing extends AlignmentPreviewProps {
    width: Svg
    height: Svg
}

export const drawAlignmentPreview = (
    ctx: CanvasRenderingContext2D,
    { width, height, copy, alignTo, shift, scale, bar }: AlignmentDrawing
) => {
    ctx.clearRect(0, 0, width, height)

    if (copy.features.length === 0 && alignTo.features.length === 0) return

    const pad = svg(10)
    const drawH = subtract(height, times(pad, 2))
    const drawW = subtract(width, times(pad, 2))

    const asRead: Placement = x => x
    const aligned: Placement = x => times(add(x, shift), scale)

    const layers: Layer[] = [
        {
            features: copy.features,
            place: asRead,
            fill: 'rgba(180, 180, 180, 0.4)',
            outline: { stroke: '#bbb', width: 1, dash: [4, 3] }
        },
        {
            features: copy.features,
            place: aligned,
            fill: 'rgba(25, 118, 210, 0.6)',
            outline: { stroke: '#1976d2', width: 1.5, dash: [] }
        },
        {
            features: alignTo.features,
            place: asRead,
            fill: 'rgba(100, 100, 100, 0.5)',
            outline: { stroke: '#888', width: 1, dash: [] }
        }
    ]

    const measured: MeasuredLayer[] = layers.map(layer => ({ ...layer, span: spanOf(layer.features, layer.place) }))
    const total = spanning(measured.map(layer => layer.span))
    if (!total || subtract(total.to, total.from) <= 0) return

    const axis = padded(total, 0.05)
    const reach = subtract(axis.to, axis.from)

    const sx = (x: Millimeters): Svg => add(pad, times(drawW, subtract(x, axis.from) / reach))

    const { bandOf } = evenGeometry(drawH, bar)

    const drawLayer = ({ features, place, fill, outline, span }: MeasuredLayer) => {
        ctx.setLineDash(outline.dash)
        ctx.strokeStyle = outline.stroke
        ctx.lineWidth = outline.width
        if (span) ctx.strokeRect(sx(span.from), pad, subtract(sx(span.to), sx(span.from)), drawH)

        const translation: Translation = { translateX: x => sx(place(x)), bandOf, bar }

        ctx.fillStyle = fill
        features.forEach(f => {
            const { x, y, width, height } = atLeastVisible(boxOf(f, translation))
            ctx.fillRect(x, add(pad, y), width, height)
        })
    }

    measured.forEach(drawLayer)
}

/** The alignment drawn over a canvas of the dialog's own width. */
export const AlignmentPreview = ({ copy, alignTo, shift, scale, bar }: AlignmentPreviewProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

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
        drawAlignmentPreview(ctx, {
            width: svg(rect.width),
            height: svg(rect.height),
            copy,
            alignTo,
            shift,
            scale,
            bar
        })
    }, [copy, alignTo, shift, scale, bar])

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 120, display: 'block', marginTop: 8 }}
        />
    )
}

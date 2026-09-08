import { Button, Dialog, DialogActions, DialogContent, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, AlignmentResult, AnyFeature, assignObject, inMetersPerMinute, Millimeters, PaperStretch, RollCopy, ScaleReading, systemIdOf } from "linked-rolls";
import { useContext, useEffect, useRef, useState } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { valueOf } from "linked-rolls";
import { PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, tempoStartOf } from "./ProductionFields";

/**
 * Whether there is an alignment to apply. Its numbers say nothing about that:
 * a copy that lines up without a shift is shifted by zero, one that sits at the
 * other's scale is scaled by one.
 */
export const canApply = (alignment?: AlignmentResult): alignment is AlignmentResult =>
    alignment !== undefined

interface AlignToDialogProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    onDone: (shift: Millimeters, scale: number, reading?: ScaleReading) => void
}

type Cause = ScaleReading['cause']

/** Two decimals of the percentage, so four of the factor it was read from. */
export const asPercent = (factor: number) => `${(factor * 100).toFixed(2)} %`

export const AlignToDialog = ({ copy, onDone, onClose, open }: AlignToDialogProps) => {
    const { edition } = useContext(EditionContext)
    const [copyB, setCopyB] = useState<RollCopy>()
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // A copy cut for another system than the roll is shorter or longer by the ratio of the speeds.
    const copySystem = systemIdOf(copy.production?.system)
    const cutForAnotherSystem = copySystem !== undefined && copySystem !== systemIdOf(edition?.roll.system)
    const [cause, setCause] = useState<Cause>(cutForAnotherSystem ? 'speed' : 'paper')
    const [speed, setSpeed] = useState<SpeedInput>(speedInputOf(copy.production?.speed))

    const alignment = copyB && alignFeatures(copy.features, copyB.features)
    const shift: Millimeters | undefined = alignment?.shift
    const scale: number | undefined = alignment?.scale

    let verticalStretch: number | undefined = undefined
    if (copy.measurements.dimensions && copyB?.measurements.dimensions) {
        verticalStretch = copyB.measurements.dimensions.height / copy.measurements.dimensions.height
    }

    const paperSpeed = paperSpeedOf(speed)
    const rollSpeed = edition?.tempoAdjustment
    const expectedFromSpeeds = paperSpeed && rollSpeed
        ? inMetersPerMinute(tempoStartOf(rollSpeed)) / inMetersPerMinute(paperSpeed)
        : undefined

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !copyB || shift === undefined || scale === undefined) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.scale(dpr, dpr)
        drawAlignmentPreview(ctx, rect.width, rect.height, copy, copyB, shift, scale)
    }, [copy, copyB, shift, scale])

    if (!edition) return null

    const otherCopies = edition.copies.filter(c => c.id !== copy.id)

    const readingOf = (factor: number): ScaleReading | undefined => {
        if (cause === 'paper') {
            return {
                cause,
                condition: assignObject<PaperStretch>({
                    type: 'ConditionState',
                    conditionType: 'paper-stretch',
                    factor,
                    description: 'calculated by alignment'
                })
            }
        }
        return paperSpeed ? { cause, speed: assignObject(paperSpeed) } : undefined
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack spacing={1}>
                    <Typography>
                        Align to
                    </Typography>
                    <Select value={copyB?.id || ''} onChange={(e) => {
                        setCopyB(edition.copies.find(copy => copy.id === e.target.value))
                    }}>
                        {otherCopies.map(c => {
                            const date = c.production?.date && new Intl.DateTimeFormat().format(
                                valueOf(c.production.date)
                            )
                            return (
                                <MenuItem value={c.id} key={`alignSymbols_${c.id}`}>
                                    {date} ({c.keeper.name})
                                </MenuItem>
                            )
                        })}
                        <MenuItem value='' disabled>
                            None
                        </MenuItem>
                    </Select>

                    {copyB && !alignment && (
                        <Typography color='error'>
                            The copies share no run of notes to align on.
                        </Typography>
                    )}

                    {alignment && (
                        <>
                            <canvas
                                ref={canvasRef}
                                style={{ width: '100%', height: 120, display: 'block', marginTop: 8 }}
                            />
                            <div>
                                Shift: {alignment.shift.toFixed(4)} mm, Scale: {asPercent(alignment.scale)}
                            </div>
                            <div style={{ color: 'gray' }}>
                                Rests on {alignment.matched} notes, {alignment.residual.toFixed(2)} mm apart on average
                            </div>
                            {verticalStretch && (
                                <div style={{ color: 'gray' }}>
                                    Vertical Stretch: {asPercent(verticalStretch)}
                                </div>
                            )}
                        </>
                    )}

                    <Typography>The scale is put down to</Typography>
                    <RadioGroup value={cause} onChange={e => setCause(e.target.value as Cause)}>
                        <FormControlLabel value='paper' control={<Radio size='small' />} label='the paper having stretched or shrunk' />
                        <FormControlLabel value='speed' control={<Radio size='small' />} label='the copy being cut for another paper speed' />
                    </RadioGroup>
                    {cause === 'speed' && (
                        <>
                            <PaperSpeedFields value={speed} onChange={setSpeed} />
                            <Typography variant='caption' color='text.secondary'>
                                {expectedFromSpeeds !== undefined
                                    ? `Expected from the speeds: ${asPercent(expectedFromSpeeds)}.`
                                    : paperSpeed
                                        ? 'The edition states no tempo to compare the speed with.'
                                        : 'Without a speed the scale is recorded and left unexplained.'}
                            </Typography>
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    disabled={!canApply(alignment)}
                    onClick={() => {
                        if (!canApply(alignment)) return
                        onDone(alignment.shift, alignment.scale, readingOf(alignment.scale))
                    }}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    )
}

/** A stretch of the shared horizontal axis the preview is drawn on. */
export interface Span {
    from: number
    to: number
}

/** Where a millimetre of a copy falls on the shared axis. */
export type Placement = (x: Millimeters) => number

/**
 * The least span covering all of the given ones. Undefined when none of them
 * is there to be covered, which is how a copy without features reaches nowhere.
 */
export const spanning = (spans: readonly (Span | undefined)[]): Span | undefined =>
    spans.reduce<Span | undefined>((total, span) => {
        if (!span) return total
        if (!total) return span
        return { from: Math.min(total.from, span.from), to: Math.max(total.to, span.to) }
    }, undefined)

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

function drawAlignmentPreview(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    copyA: RollCopy,
    copyB: RollCopy,
    shift: number,
    scale: number
) {
    ctx.clearRect(0, 0, w, h)

    if (copyA.features.length === 0 && copyB.features.length === 0) return

    const pad = 10
    const drawH = h - pad * 2
    const drawW = w - pad * 2

    const asRead: Placement = x => x
    const aligned: Placement = x => (x + shift) * scale

    const layers: Layer[] = [
        {
            features: copyA.features,
            place: asRead,
            fill: 'rgba(180, 180, 180, 0.4)',
            outline: { stroke: '#bbb', width: 1, dash: [4, 3] }
        },
        {
            features: copyA.features,
            place: aligned,
            fill: 'rgba(25, 118, 210, 0.6)',
            outline: { stroke: '#1976d2', width: 1.5, dash: [] }
        },
        {
            features: copyB.features,
            place: asRead,
            fill: 'rgba(100, 100, 100, 0.5)',
            outline: { stroke: '#888', width: 1, dash: [] }
        }
    ]

    const measured: MeasuredLayer[] = layers.map(layer => ({ ...layer, span: spanOf(layer.features, layer.place) }))
    const total = spanning(measured.map(layer => layer.span))
    if (!total || total.to - total.from <= 0) return

    const margin = (total.to - total.from) * 0.05
    const totalMin = total.from - margin
    const totalRange = (total.to + margin) - totalMin

    const sx = (x: number) => pad + ((x - totalMin) / totalRange) * drawW

    /** At least half a pixel each way, so that a short or single-track feature stays visible. */
    const rectOf = (f: AnyFeature, place: Placement) => {
        const from = sx(place(f.horizontal.from))
        const to = sx(place(f.horizontal.to))
        const height = f.vertical.to !== undefined
            ? ((f.vertical.to - f.vertical.from) / 99) * drawH
            : (1 / 99) * drawH
        return {
            x: from,
            y: pad + (f.vertical.from / 99) * drawH,
            width: Math.max(to - from, 0.5),
            height: Math.max(Math.abs(height), 0.5)
        }
    }

    const drawLayer = ({ features, place, fill, outline, span }: MeasuredLayer) => {
        ctx.setLineDash(outline.dash)
        ctx.strokeStyle = outline.stroke
        ctx.lineWidth = outline.width
        if (span) ctx.strokeRect(sx(span.from), pad, sx(span.to) - sx(span.from), drawH)

        ctx.fillStyle = fill
        features.forEach(f => {
            const { x, y, width, height } = rectOf(f, place)
            ctx.fillRect(x, y, width, height)
        })
    }

    measured.forEach(drawLayer)
}

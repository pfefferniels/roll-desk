import { Button, Dialog, DialogActions, DialogContent, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, assignObject, inMetersPerMinute, Millimeters, PaperStretch, RollCopy, ScaleReading, systemIdOf } from "linked-rolls";
import { useContext, useEffect, useRef, useState } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { valueOf } from "linked-rolls";
import { PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, tempoStartOf } from "./ProductionFields";

interface AlignToDialogProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    onDone: (shift: Millimeters, scale: number, reading?: ScaleReading) => void
}

type Cause = ScaleReading['cause']

const asPercent = (factor: number) => `${(factor * 100).toFixed(2)} %`

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
                    disabled={shift === undefined || scale === undefined}
                    onClick={() => {
                        if (shift !== undefined && scale !== undefined) {
                            onDone(shift, scale, readingOf(scale))
                        }
                    }}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    )
}

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

    // Copy A original extents
    let aMinX = Infinity, aMaxX = -Infinity
    for (const f of copyA.features) {
        aMinX = Math.min(aMinX, f.horizontal.from)
        aMaxX = Math.max(aMaxX, f.horizontal.to)
    }

    // Copy A aligned extents: (x + shift) * scale
    let aaMinX = Infinity, aaMaxX = -Infinity
    for (const f of copyA.features) {
        const from = (f.horizontal.from + shift) * scale
        const to = (f.horizontal.to + shift) * scale
        aaMinX = Math.min(aaMinX, from)
        aaMaxX = Math.max(aaMaxX, to)
    }

    // Copy B extents
    let bMinX = Infinity, bMaxX = -Infinity
    for (const f of copyB.features) {
        bMinX = Math.min(bMinX, f.horizontal.from)
        bMaxX = Math.max(bMaxX, f.horizontal.to)
    }

    // Global bounds = union of all three + padding
    const globalMin = Math.min(aMinX, aaMinX, bMinX)
    const globalMax = Math.max(aMaxX, aaMaxX, bMaxX)
    const range = globalMax - globalMin
    if (range <= 0) return

    const margin = range * 0.05
    const totalMin = globalMin - margin
    const totalRange = (globalMax + margin) - totalMin

    const sx = (x: number) => pad + ((x - totalMin) / totalRange) * drawW

    // Copy A original → dotted outline
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = '#bbb'
    ctx.lineWidth = 1
    ctx.strokeRect(sx(aMinX), pad, sx(aMaxX) - sx(aMinX), drawH)

    // Copy A original features (light gray)
    ctx.fillStyle = 'rgba(180, 180, 180, 0.4)'
    for (const f of copyA.features) {
        const x = sx(f.horizontal.from)
        const fw = Math.max(sx(f.horizontal.to) - sx(f.horizontal.from), 0.5)
        const y = pad + (f.vertical.from / 99) * drawH
        const fh = f.vertical.to !== undefined
            ? ((f.vertical.to - f.vertical.from) / 99) * drawH
            : (1 / 99) * drawH
        ctx.fillRect(x, y, fw, Math.max(Math.abs(fh), 0.5))
    }

    // Copy A aligned → solid colored outline
    ctx.setLineDash([])
    ctx.strokeStyle = '#1976d2'
    ctx.lineWidth = 1.5
    ctx.strokeRect(sx(aaMinX), pad, sx(aaMaxX) - sx(aaMinX), drawH)

    // Copy A aligned features (blue)
    ctx.fillStyle = 'rgba(25, 118, 210, 0.6)'
    for (const f of copyA.features) {
        const from = (f.horizontal.from + shift) * scale
        const to = (f.horizontal.to + shift) * scale
        const x = sx(from)
        const fw = Math.max(sx(to) - sx(from), 0.5)
        const y = pad + (f.vertical.from / 99) * drawH
        const fh = f.vertical.to !== undefined
            ? ((f.vertical.to - f.vertical.from) / 99) * drawH
            : (1 / 99) * drawH
        ctx.fillRect(x, y, fw, Math.max(Math.abs(fh), 0.5))
    }

    // Copy B → solid gray outline
    ctx.setLineDash([])
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1
    ctx.strokeRect(sx(bMinX), pad, sx(bMaxX) - sx(bMinX), drawH)

    // Copy B features (gray)
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)'
    for (const f of copyB.features) {
        const x = sx(f.horizontal.from)
        const fw = Math.max(sx(f.horizontal.to) - sx(f.horizontal.from), 0.5)
        const y = pad + (f.vertical.from / 99) * drawH
        const fh = f.vertical.to !== undefined
            ? ((f.vertical.to - f.vertical.from) / 99) * drawH
            : (1 / 99) * drawH
        ctx.fillRect(x, y, fw, Math.max(Math.abs(fh), 0.5))
    }
}

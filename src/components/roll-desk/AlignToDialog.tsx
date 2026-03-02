import { Button, Dialog, DialogActions, DialogContent, MenuItem, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, RollCopy } from "linked-rolls";
import { useContext, useEffect, useRef, useState } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { valueOf } from "linked-rolls/lib/Assumption";

interface AlignToDialogProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    onDone: (shift: number, stretch: number) => void
}

export const AlignToDialog = ({ copy, onDone, onClose, open }: AlignToDialogProps) => {
    const { edition } = useContext(EditionContext)
    const [copyB, setCopyB] = useState<RollCopy>()
    const canvasRef = useRef<HTMLCanvasElement>(null)

    let shift: number | undefined, stretch: number | undefined
    if (copyB) {
        let align = alignFeatures(copy.features, copyB.features)
        shift = align.shift
        stretch = align.stretch
    }

    let verticalStretch: number | undefined = undefined
    if (copy.measurements.dimensions && copyB?.measurements.dimensions) {
        verticalStretch = copyB.measurements.dimensions.height / copy.measurements.dimensions.height
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !copyB || shift === undefined || stretch === undefined) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.scale(dpr, dpr)
        drawAlignmentPreview(ctx, rect.width, rect.height, copy, copyB, shift, stretch)
    }, [copy, copyB, shift, stretch])

    if (!edition) return null

    const otherCopies = edition.copies.filter(c => c.id !== copy.id)

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
                                    {date} ({c.location})
                                </MenuItem>
                            )
                        })}
                        <MenuItem value='' disabled>
                            None
                        </MenuItem>
                    </Select>

                    {copyB && shift !== undefined && stretch !== undefined && (
                        <>
                            <canvas
                                ref={canvasRef}
                                style={{ width: '100%', height: 120, display: 'block', marginTop: 8 }}
                            />
                            <div>
                                Shift: {shift.toFixed(4)} mm, Stretch: {+(stretch.toFixed(4)) * 100} %
                            </div>
                            {verticalStretch && (
                                <div style={{ color: 'gray' }}>
                                    Vertical Stretch: {+verticalStretch.toFixed(4) * 100} %
                                </div>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    disabled={!shift && !stretch}
                    onClick={() => {
                        if (shift && stretch) {
                            onDone(shift, stretch)
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
    stretch: number
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

    // Copy A aligned extents: (x + shift) * stretch
    let aaMinX = Infinity, aaMaxX = -Infinity
    for (const f of copyA.features) {
        const from = (f.horizontal.from + shift) * stretch
        const to = (f.horizontal.to + shift) * stretch
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
        const from = (f.horizontal.from + shift) * stretch
        const to = (f.horizontal.to + shift) * stretch
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

import { Button, Dialog, DialogActions, DialogContent, FormControlLabel, MenuItem, Radio, RadioGroup, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, AlignmentResult, assignObject, inMetersPerMinute, Millimeters, PaperStretch, RollCopy, ScaleReading, systemIdOf, trackerBarOf, welteT100 } from "linked-rolls";
import { useContext, useMemo, useState } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { valueOf } from "linked-rolls";
import { PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, tempoStartOf } from "./ProductionFields";
import { AlignmentPreview } from "./AlignmentPreview";

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

    // A copy cut for another system than the roll is shorter or longer by the ratio of the speeds.
    const copySystem = systemIdOf(copy.production?.system)
    const cutForAnotherSystem = copySystem !== undefined && copySystem !== systemIdOf(edition?.roll.system)
    const [cause, setCause] = useState<Cause>(cutForAnotherSystem ? 'speed' : 'paper')
    const [speed, setSpeed] = useState<SpeedInput>(speedInputOf(copy.production?.speed))

    const alignment = useMemo(
        () => copyB && alignFeatures(copy.features, copyB.features),
        [copy, copyB]
    )

    const verticalStretch = copy.measurements.dimensions && copyB?.measurements.dimensions
        ? copyB.measurements.dimensions.height / copy.measurements.dimensions.height
        : undefined

    const paperSpeed = paperSpeedOf(speed)
    const rollSpeed = edition?.tempoAdjustment
    const expectedFromSpeeds = paperSpeed && rollSpeed
        ? inMetersPerMinute(tempoStartOf(rollSpeed)) / inMetersPerMinute(paperSpeed)
        : undefined

    if (!edition) return null

    const otherCopies = edition.copies.filter(c => c.id !== copy.id)
    const bar = trackerBarOf(edition.roll.system) ?? welteT100

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

                    {copyB && alignment && (
                        <>
                            <AlignmentPreview
                                copy={copy}
                                alignTo={copyB}
                                shift={alignment.shift}
                                scale={alignment.scale}
                                bar={bar}
                            />
                            <div>
                                Shift: {alignment.shift.toFixed(4)} mm, Scale: {asPercent(alignment.scale)}
                            </div>
                            <div style={{ color: 'gray' }}>
                                Rests on {alignment.matched} notes, {alignment.residual.toFixed(2)} mm apart on average
                            </div>
                            {verticalStretch !== undefined && (
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

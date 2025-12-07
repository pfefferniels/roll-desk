import { Button, Dialog, DialogActions, DialogContent, MenuItem, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, RollCopy } from "linked-rolls";
import { useContext, useState } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { valueOf } from "linked-rolls/lib/Assumption";

interface AlignCopiesProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    onDone: (shift: number, stretch: number) => void
}

export const AlignCopies = ({ copy, onDone, onClose, open }: AlignCopiesProps) => {
    const { edition } = useContext(EditionContext)
    const [copyB, setCopyB] = useState<RollCopy>()

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

    const date = copy.productionEvent?.date && new Intl.DateTimeFormat().format(
        valueOf(copy.productionEvent?.date)
    )

    if (!edition) return null

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack>
                    <Typography>
                        Choose Second Copy
                    </Typography>
                    <Select value={copyB?.id || ''} onChange={(e) => {
                        setCopyB(edition.copies.find(copy => copy.id === e.target.value))
                    }}>
                        {edition.copies.map(copy => {
                            return (
                                <MenuItem value={copy.id} key={`alignSymbols_${copy.id}`}>
                                    {date} ({copy.location})
                                </MenuItem>
                            )
                        })}
                        <MenuItem value='' disabled>
                            None
                        </MenuItem>
                    </Select>

                    <div>
                        Shift: {shift?.toFixed(4)} mm, Stretch: {+(stretch?.toFixed(4) || 1) * 100} %
                    </div>
                    {verticalStretch && (
                        <div style={{ color: 'gray' }}>
                            Vertical Stretch: {+verticalStretch.toFixed(4) * 100} %
                        </div>
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
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}
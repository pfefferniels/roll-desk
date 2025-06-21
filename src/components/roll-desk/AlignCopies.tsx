import { Button, Dialog, DialogActions, DialogContent, MenuItem, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, RollCopy } from "linked-rolls";
import { useState } from "react";

interface AlignCopiesProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    copies: RollCopy[]
    onDone: (shift: number, stretch: number) => void
}

export const AlignCopies = ({ copy, copies, onDone, onClose, open }: AlignCopiesProps) => {
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

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogContent>
                <Stack>
                    <Typography>
                        Choose Second Copy:
                    </Typography>
                    <Select value={copyB?.id || ''} onChange={(e) => {
                        setCopyB(copies.find(copy => copy.id === e.target.value))
                    }}>
                        {copies.map(copy => {
                            return (
                                <MenuItem value={copy.id} key={`alignSymbols_${copy.id}`}>
                                    {copy.location}
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
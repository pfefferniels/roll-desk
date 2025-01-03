import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormLabel, MenuItem, Select, Stack, Typography } from "@mui/material"
import { Edition } from "linked-rolls"
import { GottschewskiConversion, KinematicConversion, NoAccelerationConversion, PlaceTimeConversion } from "linked-rolls/lib/PlaceTimeConversion"
import { useState } from "react"

interface EmulationSettingsDialogProps {
    open: boolean
    edition: Edition
    onClose: () => void
    onDone: (primaryCopy: string, conversion: PlaceTimeConversion) => void
}

const methods = ['gottschewski', 'kinematic', 'no-acceleration'] as const
type Method = typeof methods[number]

export const EmulationSettingsDialog = ({ open, edition, onClose, onDone }: EmulationSettingsDialogProps) => {
    const [currentCopy, setCurrentCopy] = useState('')
    const [method, setMethod] = useState<Method>('kinematic')
    const [conversion, setConversion] = useState<PlaceTimeConversion>(new KinematicConversion())

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Emulation Settings
            </DialogTitle>
            <DialogContent>
                <Stack direction='column'>
                    <FormControl>
                        <FormLabel>Primary Source</FormLabel>
                        <Select value={currentCopy} size='small' onChange={e => setCurrentCopy(e.target.value)}>
                            {edition.copies.map(copy => (
                                <MenuItem key={copy.id} value={copy.id}>
                                    {copy.siglum}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Divider />
                    <Typography>Speed and Acceleration</Typography>
                    <FormControl>
                        <FormLabel>Method</FormLabel>
                        <Select value={method} size='small' onChange={e => {
                            setMethod(e.target.value as Method)
                            if (method === 'gottschewski') {
                                setConversion(new GottschewskiConversion())
                            }
                            else if (method === 'kinematic') {
                                setConversion(new KinematicConversion())
                            }
                            else if (method === 'no-acceleration') {
                                setConversion(new NoAccelerationConversion())
                            }
                        }}>
                            {methods.map(method => (
                                <MenuItem key={method} value={method}>{method}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Divider />
                    <Typography>
                        Velocity Emulation
                    </Typography>
                    <Typography>
                        ...
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        onDone(currentCopy, conversion)
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}

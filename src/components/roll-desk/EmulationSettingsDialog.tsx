import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormLabel, MenuItem, Select, Stack, Typography } from "@mui/material"
import { GottschewskiConversion, KinematicConversion, NoAccelerationConversion, PlaceTimeConversion } from "linked-rolls/lib/PlaceTimeConversion"
import { useState } from "react"

interface EmulationSettingsDialogProps {
    open: boolean
    onClose: () => void
    onDone: (conversion: PlaceTimeConversion) => void
}

const methods = ['gottschewski', 'kinematic', 'no-acceleration'] as const
type Method = typeof methods[number]

export const EmulationSettingsDialog = ({ open, onClose, onDone }: EmulationSettingsDialogProps) => {
    const [method, setMethod] = useState<Method>('kinematic')
    const [conversion, setConversion] = useState<PlaceTimeConversion>(new KinematicConversion())

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Emulation Settings
            </DialogTitle>
            <DialogContent>
                <Stack direction='column'>
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
                        onDone(conversion)
                        onClose()
                    }}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    )
}

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"
import { useState } from "react"

interface PodProviderDialogProps {
    oidcIssuer: string
    open: boolean
    onClose: (oidcIssuer: string) => void
}

export const PodProviderDialog = ({ oidcIssuer, open, onClose }: PodProviderDialogProps) => {
    const [value, setValue] = useState(oidcIssuer)

    return (
        <Dialog open={open} onClose={() => onClose(oidcIssuer)}>
            <DialogTitle>Change Pod Provider</DialogTitle>
            <DialogContent>
                <Box m={1}>
                    <TextField
                        label='Pod Provider'
                        fullWidth
                        value={value}
                        onChange={e => setValue(e.target.value)} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        onClose(value)
                    }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
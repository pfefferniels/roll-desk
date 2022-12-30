import { Thing } from "@inrupt/solid-client"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material"


interface FindEntityProps {
    onFound: (foundThing: Thing) => void
    onClose: () => void
    type: string
    open: boolean
}

/**
 * A dialog which allows finding a particular entity (`Thing`) in the 
 * graph. When the user selected an entity, `onFound` will be called.
 */
export const FindEntity = ({ open, onClose, type, onFound }: FindEntityProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Find Entity
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Searching for entities of type {type}
                </Typography>
                <TextField placeholder="Filter by label" />
            </DialogContent>
            <DialogActions>
                <Button color='secondary' onClick={onClose}>Cancel</Button>
                <Button color='primary' onClick={() => {
                    // onFound()
                    onClose()
                }}>Select</Button>
            </DialogActions>
        </Dialog>
    )
}
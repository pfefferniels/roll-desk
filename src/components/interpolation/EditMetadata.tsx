import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material"
import { FC } from "react"

interface EditMetadataProps {
    author: string,
    setAuthor: (author: string) => void,

    comment: string,
    setComment: (comment: string) => void,

    performanceName: string,
    setPerformanceName: (performanceName: string) => void,

    dialogOpen: boolean,
    onReady: () => void
}

export const EditMetadata: FC<EditMetadataProps> = ({ author, setAuthor, comment, setComment, performanceName, setPerformanceName, dialogOpen, onReady }): JSX.Element => {
    return (
        <Dialog open={dialogOpen}
            fullWidth
            maxWidth="sm">
            <DialogTitle>Edit Metadata</DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
                    <TextField
                        sx={{ m: 1 }}
                        variant='standard'
                        label='Author'
                        value={author}
                        onChange={(e) => {
                            setAuthor(e.target.value)
                        }} />
                    <TextField
                        sx={{ m: 1 }}
                        variant='standard'
                        label='Performance Name'
                        value={performanceName}
                        onChange={(e) => {
                            setPerformanceName(e.target.value)
                        }} />
                    <TextField
                        fullWidth
                        multiline
                        sx={{ m: 1 }}
                        variant='standard'
                        label='Comment'
                        value={comment}
                        onChange={(e) => {
                            setComment(e.target.value)
                        }} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onReady}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}

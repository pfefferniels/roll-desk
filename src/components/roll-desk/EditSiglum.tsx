import { Check, CheckRounded } from "@mui/icons-material";
import { Box, Dialog, DialogContent, IconButton, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

interface EditSiglumProps {
    open: boolean;
    siglum: string;
    onDone: (newSiglum: string) => void;
    onClose: () => void;
}

export const EditSiglum = ({ open, siglum: siglum_, onDone, onClose }: EditSiglumProps) => {
    const [siglum, setSiglum] = useState(siglum_);

    useEffect(() => {
        setSiglum(siglum_);
    }, [siglum_]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack direction='row'>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Siglum"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={siglum}
                        onChange={(e) => setSiglum(e.target.value)}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => onDone(siglum)}>
                            <CheckRounded />
                        </IconButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
};
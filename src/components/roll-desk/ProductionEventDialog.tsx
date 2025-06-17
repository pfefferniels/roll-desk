import { Button, DialogTitle, DialogContent, Dialog, DialogActions, Grid, TextField, Typography, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { assign, ProductionEvent } from "linked-rolls";

interface ProductionEventDialog {
    open: boolean
    event?: ProductionEvent
    onClose: () => void
    onDone: (event: ProductionEvent) => void
}

export const ProductionEventDialog = ({ open, event, onClose, onDone }: ProductionEventDialog) => {
    const [company, setCompany] = useState('');
    const [system, setSystem] = useState('');
    const [paper, setPaper] = useState('');
    const [date, setDate] = useState<Date>(new Date());

    useEffect(() => {
        if (!event) return

        setCompany(event.company || '')
        setSystem(event.system || '')
        setPaper(event.paper || '')
    }, [event])

    const handleDone = async () => {
        onDone({
            company,
            system,
            paper,
            date: assign('dateAssignment', date)
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Edit Production Event</DialogTitle>
            <DialogContent>
                <Typography>Roll Production</Typography>
                <Stack direction="column" spacing={2}>
                    <TextField
                        size='small'
                        value={company}
                        placeholder="e.g. Welte & Söhne"
                        onChange={e => setCompany(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        value={system}
                        placeholder="e.g. T-100"
                        onChange={e => setSystem(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        value={paper}
                        placeholder="e.g. red paper, lined"
                        onChange={e => setPaper(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        label='Roll Date'
                        value={date}
                        placeholder="as indicated on the end of the roll"
                        onChange={e => setDate(new Date(e.target.value))}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => {
                        handleDone()
                        onClose()
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

import { Delete, MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, Grid, TextField, Typography, IconButton, Divider, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { RollCopy } from "linked-rolls";
import { v4 as uuidv4 } from 'uuid';
import { ConditionAssessment, ConditionState } from "linked-rolls/lib/types";

interface RollCopyDialogProps {
    open: boolean
    copy?: RollCopy
    onClose: () => void
    onDone: (rollCopy: RollCopy) => void
    onRemove: (rollCopy: RollCopy) => void
}

/**
 * Attaches the physical copy as an item to its
 * expressions and creates an expression if none
 * exists yet.
 */
export const RollCopyDialog = ({ open, copy, onClose, onDone, onRemove }: RollCopyDialogProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [siglum, setSiglum] = useState('');
    const [company, setCompany] = useState('');
    const [system, setSystem] = useState('');
    const [paper, setPaper] = useState('');
    const [date, setDate] = useState('');
    const [conditions, setConditions] = useState<ConditionState[]>([]);
    const [location, setLocation] = useState('') // P55 has current location

    useEffect(() => {
        if (!copy) return

        setSiglum(copy.siglum)
        setCompany(copy.productionEvent.company)
        setSystem(copy.productionEvent.system)
        setPaper(copy.productionEvent.paper)
        setConditions(copy.conditions)
        setLocation(copy.location)
    }, [copy])

    const handleUpload = async () => {
        if (!file) {
            console.log('No file uploaded yet');
            return;
        }

        const rollCopy = copy || new RollCopy()

        rollCopy.productionEvent = {
            company,
            system,
            paper,
            date
        };

        rollCopy.siglum = siglum
        rollCopy.location = location
        rollCopy.conditions = conditions

        if (file) rollCopy.readFromStanfordAton(await file.text(), true);
        onDone(rollCopy);
    };

    const handleAddCondition = () => {
        const newCondition: ConditionState = {
            id: uuidv4(),
            note: '',
            date: '',
            assessment: {
                id: uuidv4(),
                carriedOutBy: '',
                date: ''
            }
        };
        setConditions([...conditions, newCondition]);
    };

    const handleConditionChange = (index: number, field: keyof ConditionState, value: string) => {
        const updatedConditions = [...conditions];
        updatedConditions[index] = {
            ...updatedConditions[index],
            [field]: value
        };
        setConditions(updatedConditions);
    };

    const handleAssessmentChange = (index: number, field: keyof ConditionAssessment, value: string) => {
        const updatedConditions = [...conditions];
        updatedConditions[index] = {
            ...updatedConditions[index],
            assessment: {
                ...updatedConditions[index].assessment,
                [field]: value
            }
        };
        setConditions(updatedConditions);
    };

    const handleRemoveCondition = (index: number) => {
        const updatedConditions = conditions.filter((_, i) => i !== index);
        setConditions(updatedConditions);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} p={1} sx={{ minWidth: 700 }}>
                    <Grid item xs={4}>
                        <Typography>Siglum</Typography>
                        <TextField
                            size='small'
                            value={siglum}
                            onChange={e => setSiglum(e.target.value)}
                            placeholder='e. g. A3'
                            label='Siglum'
                        />
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
                                onChange={e => setDate(e.target.value)}
                                fullWidth
                            />
                            <Typography>Physical Location</Typography>
                            <TextField
                                size='small'
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder='e. g. Stanford University Archive'
                                label='Physical location'
                            />
                            <Divider flexItem />
                            <Button variant="outlined" component="label" startIcon={<MusicNote />}>
                                {file ? file.name : 'Upload Roll Analysis'}
                                <input
                                    type="file"
                                    hidden
                                    accept=".txt"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                />
                            </Button>
                        </Stack>
                    </Grid>
                    <Grid item xs={8}>
                        <Typography>Roll Condition</Typography>
                        {conditions.map((condition, index) => (
                            <Grid container m={1} spacing={1} key={condition.id} alignItems="center">
                                <Grid item xs={6}>
                                    <TextField
                                        multiline
                                        rows={5}
                                        size='small'
                                        label='Condition Note'
                                        value={condition.note}
                                        onChange={(e) => handleConditionChange(index, 'note', e.target.value)}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={5}>
                                    <Stack direction="column" spacing={1}>
                                        <TextField
                                            size='small'
                                            label='Condition Date'
                                            value={condition.date}
                                            onChange={(e) => handleConditionChange(index, 'date', e.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            size='small'
                                            label='Assessed By'
                                            value={condition.assessment.carriedOutBy}
                                            onChange={(e) => handleAssessmentChange(index, 'carriedOutBy', e.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            size='small'
                                            label='Assessment Date'
                                            value={condition.assessment.date}
                                            onChange={(e) => handleAssessmentChange(index, 'date', e.target.value)}
                                            fullWidth
                                        />
                                    </Stack>
                                </Grid>
                                <Grid item xs={1}>
                                    <IconButton onClick={() => handleRemoveCondition(index)} size="small">
                                        <Delete />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        ))}
                        <Button variant="outlined" onClick={handleAddCondition} sx={{ mt: 2 }}>
                            Add Condition State
                        </Button>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={async () => {
                        handleUpload();
                        onClose();
                    }}
                >
                    Save
                </Button>
                <IconButton color='secondary' onClick={() => {
                    if (copy) {
                        onRemove(copy)
                        onClose()
                    }
                }}>
                    <Delete />
                </IconButton>
            </DialogActions>
        </Dialog>
    );
};

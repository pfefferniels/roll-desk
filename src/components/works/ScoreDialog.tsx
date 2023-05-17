import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, MenuItem, Button, Box, Typography } from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';

interface ScoreDialogProps {
    open: boolean;
    onClose: () => void;
}

const ScoreDialog: React.FC<ScoreDialogProps> = ({ open, onClose }) => {
    const [label, setLabel] = useState('');
    const [derivedFrom, setDerivedFrom] = useState('');

    const scores = [
        { value: '', label: 'None' },
        // Add more scores here
    ];

    const handleUploadMEI = () => {
        // Handle MEI file upload
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Score</DialogTitle>
            <DialogContent>
                <TextField
                    label="Label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <TextField
                    select
                    label="Derived From"
                    value={derivedFrom}
                    onChange={(e) => setDerivedFrom(e.target.value)}
                    fullWidth
                    margin="normal"
                >
                    {scores.map((score) => (
                        <MenuItem key={score.value} value={score.value}>
                            {score.label}
                        </MenuItem>
                    ))}
                </TextField>
                <Box display="flex" alignItems="center" mt={2}>
                    <Button
                        variant="outlined"
                        color="primary"
                        component="label"
                        startIcon={<PublishIcon />}
                    >
                        Upload MEI file
                        <input
                            type="file"
                            hidden
                            onChange={handleUploadMEI}
                            accept=".mei"
                        />
                    </Button>
                </Box>
            </DialogContent>
            <Box display="flex" justifyContent="flex-end" p={2}>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => { }} color="primary" variant="contained">
                    Add
                </Button>
            </Box>
        </Dialog>
    );
};

export default ScoreDialog;

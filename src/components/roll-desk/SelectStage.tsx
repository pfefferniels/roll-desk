import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, DialogActions, Button, Select, MenuItem } from "@mui/material";
import { Stage } from "linked-rolls";
import { useState } from "react";

interface SelectStageProps {
    open: boolean;
    onClose: () => void;
    onDone: (stage: Stage) => void;
    stages: Stage[];
}

export const SelectStage = ({ open, onClose, onDone, stages }: SelectStageProps) => {
    const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

    const handleDone = () => {
        if (selectedStage) {
            onDone(selectedStage);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Select Stage</DialogTitle>
            <DialogContent>
                <Select
                    value={selectedStage?.id || ''}
                    onChange={(e) => {
                        const stageId = e.target.value;
                        const stage = stages.find(s => s.id === stageId);
                        if (stage) {
                            setSelectedStage(stage);
                        }
                    }}
                >
                    {stages.map((stage) => (
                        <MenuItem
                            key={stage.id}
                            value={stage.id}
                        >
                            {stage.siglum}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleDone} disabled={!selectedStage}>
                    Select
                </Button>
            </DialogActions>
        </Dialog>
    );
}
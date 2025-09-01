import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, DialogActions, Button, Select, MenuItem } from "@mui/material";
import { Version } from "linked-rolls";
import { useState } from "react";

interface SelectVersionProps {
    open: boolean;
    onClose: () => void;
    onDone: (versionId: string) => void;
    versions: Version[];
    currentVersionId: string;
}

export const SelectVersion = ({ open, onClose, onDone, versions, currentVersionId }: SelectVersionProps) => {
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(versions[0]?.id || null);

    const handleDone = () => {
        if (selectedVersionId) {
            onDone(selectedVersionId);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Select Version</DialogTitle>
            <DialogContent>
                <Select
                    value={selectedVersionId || ''}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                >
                    {versions.map((version) => (
                        <MenuItem
                            key={version.id}
                            value={version.id}
                            disabled={currentVersionId === version.id}
                        >
                            {version.siglum}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleDone} disabled={!selectedVersionId}>
                    Select
                </Button>
            </DialogActions>
        </Dialog>
    );
}
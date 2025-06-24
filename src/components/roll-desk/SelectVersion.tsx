import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, DialogActions, Button, Select, MenuItem } from "@mui/material";
import { Version } from "linked-rolls";
import { useState } from "react";

interface SelectVersionProps {
    open: boolean;
    onClose: () => void;
    onDone: (version: Version) => void;
    versions: Version[];
}

export const SelectVersion = ({ open, onClose, onDone, versions }: SelectVersionProps) => {
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

    const handleDone = () => {
        if (selectedVersion) {
            onDone(selectedVersion);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Select Version</DialogTitle>
            <DialogContent>
                <Select
                    value={selectedVersion?.id || ''}
                    onChange={(e) => {
                        const versionId = e.target.value;
                        const version = versions.find(s => s.id === versionId);
                        if (version) {
                            setSelectedVersion(version);
                        }
                    }}
                    fullWidth
                >
                    {versions.map((version) => (
                        <MenuItem
                            key={version.id}
                            value={version.id}
                        >
                            {version.siglum}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleDone} disabled={!selectedVersion}>
                    Select
                </Button>
            </DialogActions>
        </Dialog>
    );
}
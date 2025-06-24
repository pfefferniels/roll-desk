import { Check } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select, Stack } from "@mui/material";
import { VersionType, versionTypes } from "linked-rolls";

interface EditVersionTypeProps {
    open: boolean;
    onClose: () => void;
    onSave: (type: VersionType) => void;
    type: VersionType;
}

export const EditVersionType = ({
    open,
    onClose,
    onSave,
    type,
}: EditVersionTypeProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <Stack direction='row' spacing={2} alignItems='center' sx={{ padding: 2 }}>
                <Select
                    value={type}
                    onChange={(e) => onSave(e.target.value as VersionType)}
                >
                    {versionTypes.map(vType => {
                        return (
                            <MenuItem key={vType} value={vType}>
                                {vType}
                            </MenuItem>
                        );
                    })}
                </Select>
                <IconButton onClick={onClose}>
                    <Check />
                </IconButton>
            </Stack>
        </Dialog>
    );
};
import { Check } from "@mui/icons-material";
import { Dialog, IconButton, MenuItem, Select, Stack } from "@mui/material";

interface EditType<T extends string> {
    open: boolean;
    onClose: () => void;
    onSave: (type: T) => void;
    value: T;
    readonly types: readonly T[];
}

export const EditType = <T extends string,>({
    open,
    onClose,
    onSave,
    value,
    types
}: EditType<T>) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <Stack direction='row' spacing={2} alignItems='center' sx={{ padding: 2 }}>
                <Select
                    value={value}
                    onChange={(e) => onSave(e.target.value as T)}
                >
                    {types.map(type => {
                        return (
                            <MenuItem key={type} value={type}>
                                {type}
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
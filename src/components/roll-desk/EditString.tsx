import { PropsOf } from "@emotion/react";
import { CheckRounded } from "@mui/icons-material";
import { Box, Dialog, DialogContent, IconButton, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

interface EditStringProps {
    open: boolean;
    value: string;
    onDone: (newValue: string) => void;
    onClose: () => void;
}

export const EditString = ({ open, value: value_, onDone, onClose }: EditStringProps) => {
    const [value, setValue] = useState(value_);

    useEffect(() => {
        setValue(value_);
    }, [value_]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack direction='row'>
                    <TextField
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => onDone(value)}>
                            <CheckRounded />
                        </IconButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
};

interface EditChoiceProps<T extends string> {
    open: boolean;
    value: T;
    items: readonly T[];
    onDone: (newValue: T) => void;
    onClose: () => void;
}

export const EditChoice = <T extends string>({ open, value: value_, items, onDone, onClose }: EditChoiceProps<T>) => {
    const [value, setValue] = useState<T>(value_);

    useEffect(() => {
        setValue(value_);
    }, [value_]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <Stack direction='row'>
                    <Select
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={(e) => setValue(e.target.value as T)}
                        MenuProps={{
                            disablePortal: true,
                        }}
                    >
                        {items.map(item => {
                            return (
                                <MenuItem
                                    key={`item_${item}`}
                                    value={item}
                                >
                                    {item}
                                </MenuItem>
                            )
                        })}
                    </Select>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => onDone(value)}>
                            <CheckRounded />
                        </IconButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
};
import { CheckRounded } from "@mui/icons-material";
import { Box, Dialog, DialogContent, MenuItem, Stack, TextField } from "@mui/material";
import { useId } from "react";
import { useDraft } from "./useDraft";
import { ToolButton } from "../desk/ToolButton";

interface EditStringProps {
    open: boolean;
    /** What is asked for, which names the field and the dialog it stands alone in. */
    label: string;
    value: string;
    onDone: (newValue: string) => void;
    onClose: () => void;
}

export const EditString = ({ open, label, value: value_, onDone, onClose }: EditStringProps) => {
    const [value, setValue] = useDraft(value_);
    const id = useId();

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby={`${id}-label`}>
            <DialogContent>
                <Stack direction='row'>
                    <TextField
                        id={id}
                        label={label}
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ToolButton label='Done' onClick={() => onDone(value)}>
                            <CheckRounded />
                        </ToolButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
};

interface EditChoiceProps<T extends string> {
    open: boolean;
    /** What is chosen, which names the field and the dialog it stands alone in. */
    label: string;
    value: T;
    items: readonly T[];
    onDone: (newValue: T) => void;
    onClose: () => void;
}

export const EditChoice = <T extends string>({ open, label, value: value_, items, onDone, onClose }: EditChoiceProps<T>) => {
    const [value, setValue] = useDraft<T>(value_);
    const id = useId();

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby={`${id}-label`}>
            <DialogContent>
                <Stack direction='row'>
                    <TextField
                        select
                        id={id}
                        label={label}
                        autoFocus
                        margin="dense"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={value}
                        onChange={(e) => setValue(e.target.value as T)}
                        slotProps={{
                            select: {
                                MenuProps: {
                                    disablePortal: true,
                                }
                            }
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
                    </TextField>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ToolButton label='Done' onClick={() => onDone(value)}>
                            <CheckRounded />
                        </ToolButton>
                    </Box>
                </Stack>
            </DialogContent>
        </Dialog>
    )
};
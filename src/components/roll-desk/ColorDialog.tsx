import React, { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Box,
    Slider,
    Typography,
} from '@mui/material';
import { RgbaStringColorPicker } from "react-colorful";

interface ColorDialogProps {
    color: string;
    opacity: number;
    onChange: (color: string, opacity: number) => void;
    onClose: () => void;
    open: boolean
}

export const ColorDialog: React.FC<ColorDialogProps> = ({ open, onClose, color: color_, opacity: opacity_, onChange }) => {
    const [color, setColor] = useState<string>(color_);
    const [opacity, setOpacity] = useState<number>(opacity_);

    useEffect(() => {
        setColor(color_);
        setOpacity(opacity_);
    }, [color_, opacity_]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Color and Opacity</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <Box>
                        <RgbaStringColorPicker color={color} onChange={setColor} />
                    </Box>

                    <Box>
                        <Typography>Facsimile Opacity</Typography>
                        <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={opacity}
                            onChange={(_, value) => setOpacity(value as number)} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={() => onChange(color, opacity)}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

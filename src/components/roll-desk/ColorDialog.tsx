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
    symbolOpacity: number;
    facsimileOpacity: number;
    onChange: (color: string, symbolOpacity: number, facsimileOpacity: number) => void;
    onClose: () => void;
    open: boolean
}

export const ColorDialog: React.FC<ColorDialogProps> = ({ open, onClose, color: color_, symbolOpacity: symbolOpacity_, facsimileOpacity: facsimileOpacity_, onChange }) => {
    const [color, setColor] = useState<string>(color_);
    const [symbolOpacity, setSymbolOpacity] = useState<number>(symbolOpacity_);
    const [facsimileOpacity, setFacsimileOpacity] = useState<number>(facsimileOpacity_);

    useEffect(() => {
        setColor(color_);
        setSymbolOpacity(symbolOpacity_);
        setFacsimileOpacity(facsimileOpacity_);
    }, [color_, symbolOpacity_, facsimileOpacity_]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Color and Opacity</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <Box>
                        <RgbaStringColorPicker color={color} onChange={setColor} />
                    </Box>

                    <Box>
                        <Typography>Symbol Opacity</Typography>
                        <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={symbolOpacity}
                            onChange={(_, value) => setSymbolOpacity(value as number)} />
                    </Box>
                    <Box>
                        <Typography>Facsimile Opacity</Typography>
                        <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={facsimileOpacity}
                            onChange={(_, value) => setFacsimileOpacity(value as number)} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={() => {
                    onChange(color, symbolOpacity, facsimileOpacity)
                    onClose()
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

import React, { useState } from 'react';
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
import { LayerInfo } from './RollDesk';

interface LayerColorOpacityDialogProps {
    layerInfo: LayerInfo;
    onSave: (newLayerInfo: LayerInfo) => void;
    onClose: () => void;
    open: boolean
}

export const ColorDialog: React.FC<LayerColorOpacityDialogProps> = ({ open, onClose, layerInfo, onSave }) => {
    const [color, setColor] = useState(layerInfo.color);
    const [facsimileOpacity, setFacsimileOpacity] = useState(0)

    const handleSave = () => {
        onSave({
            ...layerInfo,
            color,
            facsimileOpacity
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Layer Color</DialogTitle>
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
                            value={facsimileOpacity}
                            onChange={(_, value) => setFacsimileOpacity(value as number)} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

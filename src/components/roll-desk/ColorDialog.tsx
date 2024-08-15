import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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

    const handleSave = () => {
        onSave({
            ...layerInfo,
            color
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Layer Color</DialogTitle>
            <DialogContent>
                <RgbaStringColorPicker color={color} onChange={setColor} />
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={handleSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

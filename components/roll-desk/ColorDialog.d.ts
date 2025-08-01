import { default as React } from 'react';
interface ColorDialogProps {
    color: string;
    symbolOpacity: number;
    facsimileOpacity: number;
    onChange: (color: string, symbolOpacity: number, facsimileOpacity: number) => void;
    onClose: () => void;
    open: boolean;
}
export declare const ColorDialog: React.FC<ColorDialogProps>;
export {};

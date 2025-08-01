import { PlaceTimeConversion } from 'linked-rolls/lib/PlaceTimeConversion';
interface EmulationSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onDone: (conversion: PlaceTimeConversion) => void;
}
export declare const EmulationSettingsDialog: ({ open, onClose, onDone }: EmulationSettingsDialogProps) => JSX.Element;
export {};

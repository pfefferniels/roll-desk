import { RollCopy } from 'linked-rolls';
interface RollCopyDialogProps {
    open: boolean;
    copy?: RollCopy;
    onClose: () => void;
    onDone: (rollCopy: RollCopy, siglum: string) => void;
    onRemove: (rollCopy: RollCopy) => void;
}
export declare const RollCopyDialog: ({ open, copy, onClose, onDone, onRemove }: RollCopyDialogProps) => JSX.Element;
export {};

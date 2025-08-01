import { AnySymbol, Edition, Version } from 'linked-rolls';
interface VersionCreationDialogProps {
    open: boolean;
    edition: Edition;
    symbols: AnySymbol[];
    onClose: () => void;
    onDone: (version: Version) => void;
    clearSelection: () => void;
}
export declare const VersionCreationDialog: ({ open, edition, symbols, onClose, onDone, clearSelection }: VersionCreationDialogProps) => JSX.Element;
export {};

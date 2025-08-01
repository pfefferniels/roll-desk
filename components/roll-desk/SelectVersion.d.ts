import { Version } from 'linked-rolls';
interface SelectVersionProps {
    open: boolean;
    onClose: () => void;
    onDone: (version: Version) => void;
    versions: Version[];
}
export declare const SelectVersion: ({ open, onClose, onDone, versions }: SelectVersionProps) => JSX.Element;
export {};

import { RollCopy } from 'linked-rolls';
interface AlignCopiesProps {
    open: boolean;
    onClose: () => void;
    copy: RollCopy;
    copies: RollCopy[];
    onDone: (shift: number, stretch: number) => void;
}
export declare const AlignCopies: ({ copy, copies, onDone, onClose, open }: AlignCopiesProps) => JSX.Element;
export {};

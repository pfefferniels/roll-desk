import { RollCopy, RollFeature } from 'linked-rolls';
import { EventDimension } from './RollDesk.tsx';
interface CopyFacsimileProps {
    copy: RollCopy;
    active: boolean;
    onClick: (e: RollFeature) => void;
    color: string;
    onSelectionDone: (dimension: EventDimension) => void;
    facsimile?: File;
    facsimileOpacity: number;
}
export declare const CopyFacsimile: ({ copy, active, color, onClick, onSelectionDone, facsimile, facsimileOpacity, }: CopyFacsimileProps) => JSX.Element;
export {};

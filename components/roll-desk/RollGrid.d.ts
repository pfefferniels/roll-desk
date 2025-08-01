import { WithId } from 'linked-rolls/lib/WithId';
import { EventDimension } from './RollDesk.tsx';
import { RollCopy } from 'linked-rolls';
interface RollGridProps {
    width: number;
    onSelectionDone: (dimension: EventDimension & WithId) => void;
    selectionMode: boolean;
}
export declare const RollGrid: ({ width, selectionMode, onSelectionDone, }: RollGridProps) => JSX.Element;
export declare const selectionAsIIIFLink: (selection: EventDimension, copy: RollCopy) => string;
export {};

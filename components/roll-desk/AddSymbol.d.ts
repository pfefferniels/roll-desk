import { RollFeature, Version } from 'linked-rolls';
import { EventDimension } from './RollDesk';
import { AnySymbol } from 'linked-rolls/lib/Symbol';
interface AddSymbolProps {
    open: boolean;
    selection: EventDimension | AnySymbol;
    iiifUrl?: string;
    onClose: () => void;
    onDone: (symbol: AnySymbol, feature: RollFeature, version: Version) => void;
    versions: Version[];
}
export declare const AddSymbolDialog: ({ selection, open, onClose, onDone, iiifUrl, versions }: AddSymbolProps) => JSX.Element;
export {};

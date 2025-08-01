import { RollCopy, RollFeature, Version } from 'linked-rolls';
import { EventDimension } from './RollDesk';
export type FacsimileSelection = EventDimension | RollFeature;
interface MenuProps {
    versions: Version[];
    copies: RollCopy[];
    copy: RollCopy;
    selection: FacsimileSelection[];
    onChangeSelection: (selection: FacsimileSelection[]) => void;
    onChange: (copy: RollCopy, versions?: Version[]) => void;
}
export declare const CopyFacsimileMenu: ({ copy, copies, selection, versions, onChange, onChangeSelection }: MenuProps) => JSX.Element;
export {};

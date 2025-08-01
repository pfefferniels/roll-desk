import { AnySymbol, Edit, Motivation, Version } from 'linked-rolls';
export type VersionSelection = AnySymbol | Edit | Motivation<string>;
interface MenuProps {
    version: Version;
    versions: Version[];
    selection: VersionSelection[];
    onChange: (version: Version) => void;
    onAdd: (version: Version) => void;
    onRemove: (version: Version) => void;
}
export declare const VersionMenu: ({ version, versions, selection, onChange, onAdd, onRemove }: MenuProps) => JSX.Element;
export {};

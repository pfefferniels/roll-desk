import { Version, Edit, Motivation } from 'linked-rolls';
import { AnySymbol } from 'linked-rolls/lib/Symbol';
interface VersionViewProps {
    version: Version;
    onClick: (event: AnySymbol | Motivation<string> | Edit) => void;
}
export declare const VersionView: ({ version, onClick }: VersionViewProps) => JSX.Element;
export {};

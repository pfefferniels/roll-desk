import { Version } from 'linked-rolls';
interface Stemma {
    versions: Version[];
    currentVersion?: Version;
    onClick: (version: Version) => void;
}
export declare const Stemma: ({ versions, currentVersion, onClick }: Stemma) => JSX.Element;
export {};

import { Edition } from 'linked-rolls';
interface ImportButtonProps {
    outlined?: boolean;
    onImport: (newEdition: Edition) => void;
}
export declare const ImportButton: ({ onImport, outlined }: ImportButtonProps) => JSX.Element;
export {};

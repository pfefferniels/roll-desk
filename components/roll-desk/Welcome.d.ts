import { Edition, EditionMetadata } from 'linked-rolls';
export interface WelcomeProps {
    onCreate: (metadata: EditionMetadata) => void;
    onImport: (edition: Edition) => void;
}
export declare const Welcome: ({ onCreate, onImport }: WelcomeProps) => JSX.Element;

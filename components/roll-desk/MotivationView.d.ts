import { Motivation } from 'linked-rolls';
export interface MotivationViewProps {
    motivation: Motivation<string>;
    onClick?: (motivation: Motivation<string>) => void;
}
export declare const MotivationView: ({ motivation, onClick }: MotivationViewProps) => JSX.Element;

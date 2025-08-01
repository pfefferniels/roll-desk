import { Expression, HandwrittenText, Note, RollLabel, Stamp } from 'linked-rolls/lib/Symbol';
interface PerforationProps {
    symbol: Note | Expression;
    age?: number;
    highlight: boolean;
    onClick: () => void;
}
export declare const Perforation: ({ symbol, age, highlight, onClick }: PerforationProps) => JSX.Element | null;
interface SustainPedalProps {
    on: Expression;
    off: Expression;
}
export declare const SustainPedal: ({ on, off }: SustainPedalProps) => JSX.Element | null;
interface TextSymbolProps {
    event: HandwrittenText | Stamp | RollLabel;
    onClick: () => void;
}
export declare const TextSymbol: ({ event, onClick, }: TextSymbolProps) => JSX.Element;
export {};

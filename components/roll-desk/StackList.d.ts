import { RollCopy } from 'linked-rolls';
export interface Layer {
    copy: RollCopy;
    color: string;
    symbolOpacity: number;
    facsimileOpacity: number;
}
interface LayerStackProps {
    active?: Layer;
    stack: Layer[];
    onChange: (stack: Layer[]) => void;
    onClick: (layer: Layer) => void;
}
export declare const LayerStack: ({ stack, active, onChange, onClick }: LayerStackProps) => JSX.Element;
export {};

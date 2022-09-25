import { TransformationOptions } from "../../../../lib/transformers/Transformer";

export const optionsStyle = {
    display: 'block',
    margin: '0.5rem',
    maxWidth: '80%'
}

export interface OptionsProp<T extends TransformationOptions> {
    options?: T;
    setOptions: (options: T) => void;
}

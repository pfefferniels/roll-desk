import { MSM } from "../Msm";
import { MPM } from "../Mpm";

/**
 * The Transformer interface declares a method for building the chain of transformations.
 * It also declares a method for executing a transformation.
 */
export interface Transformer {
    setNext(transformer: Transformer): Transformer;

    transform(msm: MSM, mpm: MPM): string;
}

/**
 * The default chaining behavior.
 */
export abstract class AbstractTransformer implements Transformer
{
    private nextTransformer?: Transformer

    public setNext(transformer: Transformer): Transformer {
        this.nextTransformer = transformer;
        return transformer;
    }

    public transform(msm: MSM, mpm: MPM): string {
        if (this.nextTransformer) {
            return this.nextTransformer.transform(msm, mpm)
        }

        return 'done'
    }
}

import { MSM } from "./Msm";

/**
 * The Transformer interface declares a method for building the chain of transformations.
 * It also declares a method for executing a transformation.
 */
export interface Transformer {
    setNext(transformer: Transformer): Transformer;

    transform(msm: MSM, mpm: any): string;
}

/**
 * The default chaining behavior.
 */
export abstract class AbstractTransformer implements Transformer
{
    private nextTransformer?: Transformer

    public setNext(transformer: Transformer): Transformer {
        this.nextTransformer = transformer;
        // Returning a handler from here will let us link handlers in a
        // convenient way like this:
        // monkey.setNext(squirrel).setNext(dog);
        return transformer;
    }

    public transform(msm: MSM, mpm: any): string {
        if (this.nextTransformer) {
            return this.nextTransformer.transform(msm, mpm)
        }

        return 'done'
    }
}

/**
 * Calculation of tempo or dynamics can be done on the basis of
 * whole bar, half bar, the denominator or for every single given note.
 */

import { TimeSignature } from "../msm";

export const beatLengthBasis = ['bar', 'halfbar', 'thirdbar', 'denominator', 'everything'] as const;
export type BeatLengthBasis = typeof beatLengthBasis[number];
 
export const calculateBeatLength = (beatLength: Omit<'everything', BeatLengthBasis>, timeSignature: TimeSignature) => {
    let result = 720;
    switch (beatLength) {
        case 'denominator':
            result = (4 / timeSignature.denominator);
            break;
        case 'bar':
            result = (4 / timeSignature.denominator) * timeSignature.numerator;
            break;
        case 'halfbar':
            result = (4 / timeSignature.denominator) * 0.5 * timeSignature.numerator;
            break;
        case 'thirdbar':
            result = (4 / timeSignature.denominator) * (1/3) * timeSignature.numerator;
            console.log('thirdbar=', result)
            break;
        case 'everything':
            console.warn('calculating tempo based on every note is not yet implemented');
            break;
    }
    return result * 720;
}

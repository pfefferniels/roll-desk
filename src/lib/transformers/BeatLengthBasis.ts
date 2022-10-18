/**
 * Calculation of tempo or dynamics can be done on the basis of
 * whole bar, half bar, the denominator or for every single given note.
 */

import { TimeSignature } from "../Msm";

export const beatLengthBasis = ['bar', 'halfbar', 'denominator', 'everything'] as const;
export type BeatLengthBasis = typeof beatLengthBasis[number];
 
export const calculateBeatLength = (beatLength: Omit<'everything', BeatLengthBasis>, timeSignature: TimeSignature) => {
    let result = 720;
    switch (beatLength) {
        case 'denominator':
            result = (4 / timeSignature.denominator) * 720;
            break;
        case 'bar':
            result = (4 / timeSignature.denominator) * timeSignature.numerator * 720;
            break;
        case 'halfbar':
            result = (4 / timeSignature.denominator) * 0.5 * timeSignature.numerator * 720;
            break;
        case 'everything':
            console.warn('calculating tempo based on every note is not yet implemented');
            break;
    }
    return result;
}
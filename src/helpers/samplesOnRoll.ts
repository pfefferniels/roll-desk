/**
 * Every so many samples of an emulated curve, as far as the drawn roll
 * reaches. The emulator's grid runs on past the last perforation so that
 * the pneumatics can settle, and no paper is drawn under that stretch.
 */
export const samplesOnRoll = (place: Float64Array, rollLength: number, stride: number): number[] =>
    Array.from({ length: Math.ceil(place.length / stride) }, (_, sample) => sample * stride)
        .filter(index => place[index] <= rollLength)

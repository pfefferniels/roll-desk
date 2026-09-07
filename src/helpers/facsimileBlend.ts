/**
 * How the copy view divides itself between the scan and the reading of
 * it. At one end the scan lies whole and alone, at the other only the
 * transcription is left.
 */
export interface FacsimileBlend {
    /** Opacity of the scan. */
    facsimile: number

    /** Opacity of the features drawn over it. */
    transcription: number

    /** How far the scan is cut into the lanes of the tracker bar. */
    layout: number
}

/**
 * The position at which the scan lies cut into its lanes, at full
 * strength, under the whole transcription: the view the copy is read in.
 */
export const workingPosition = 0.5

const clamped = (position: number) => Math.min(1, Math.max(0, position))

/**
 * The first half cuts the scan into its lanes and brings the
 * transcription in over it, the second half fades the scan away from
 * under it, so that the working view lies in the middle of the range.
 */
export const blendAt = (position: number): FacsimileBlend => {
    const t = clamped(position)

    return {
        facsimile: Math.min(1, 2 * (1 - t)),
        transcription: Math.min(1, 2 * t),
        layout: Math.min(1, 2 * t)
    }
}

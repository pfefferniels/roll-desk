import { MPM, Part, Rubato } from "../mpm"
import { MSM } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { uuid } from "../globals"

export interface InterpolateRubatoOptions extends TransformationOptions {
    /**
     * Tolerance in milliseconds to deviate from 0. Default value is 20.
     */
    tolerance: number

    /**
     * The part on which the transformer is to be applied to.
     */
    part: Part
}

/**
 * Interpolates <rubato> elements.
 */
export class InterpolateRubato extends AbstractTransformer<InterpolateRubatoOptions> {
    constructor(options?: InterpolateRubatoOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            tolerance: 20,
            part: 'global'
        })
    }

    public name() { return 'InterpolateRubato' }

    public transform(msm: MSM, mpm: MPM): string {
        const tolerance = this.options?.tolerance || 20

        const chords = Object.entries(msm.asChords(this.options?.part))

        type RubatoChunk = {
            events: {
                date: number,
                shift: number
            }[]
            frameLength: number
        }

        // slice the chords into chunks
        let chunks: RubatoChunk[] = []
        let currentPos = 0
        while (currentPos < chords.length - 1) {
            const nextNull = chords.slice(currentPos + 1).find(([_, chord]) => chord[0]['midi.onset'] <= tolerance / 1000)
            if (nextNull) {
                const nextPos = chords.indexOf(nextNull, currentPos + 1)

                // filter out single events
                if (nextPos === currentPos + 1) {
                    currentPos = nextPos
                    continue
                }

                chunks.push({
                    events: chords.slice(currentPos, nextPos).map(([date, chord]) => ({
                        date: +date,
                        shift: chord[0]["midi.onset"] * (chord[0]?.bpm || 60) * ((chord[0]?.["bpm.beatLength"] || 0.25) * 4 * 720) / 60
                    })),
                    frameLength: +chords[nextPos][0] - +chords[currentPos][0]
                })
                currentPos = nextPos
            }
            else {
                // use everything from here to the end and stop slicing
                chunks.push({
                    events: chords.slice(currentPos).map(([date, chord]) => ({
                        date: +date,
                        shift: chord[0]["midi.onset"]
                    })),
                    frameLength: +chords[currentPos][0] + chords[currentPos][1][0].duration
                })
                break
            }
        }

        console.log('chunks=', chunks)

        const instructions: Rubato[] = chunks
            .map(chunk => {
                // every chunk becomes a rubato instruction

                // calculate the intensity for every given point inside the chunk
                let intensities = chunk.events.slice(1).map(({ date, shift }) => {
                    // scale both vertical and horizontal to [0,1]
                    const relativeDate = (date - chunk.events[0].date) / chunk.frameLength
                    const relativeDateShifted = (date + shift - chunk.events[0].date)  / chunk.frameLength
                    return Math.log(relativeDateShifted) / Math.log(relativeDate)
                })

                // Then take its avarage.
                // TODO: Should be replace be a better method.
                const avgIntensity = intensities.reduce( ( p, c ) => p + c, 0 ) / intensities.length

                return {
                    'type': 'rubato',
                    'xml:id': `rubato${uuid()}`,
                    'date': chunk.events[0].date,
                    'frameLength': chunk.frameLength,
                    'intensity': +avgIntensity.toFixed(2),
                    'loop': false
                }
            })
            .reduce((all, curr) => {
                // find repeating rubato instructions and merge them

                const last = all[all.length - 1]
                if (last && curr.frameLength === last.frameLength && curr.intensity === last.intensity) {
                    last.loop = true
                    return all
                }

                // make sure that we use only valid intensities
                if (isFinite((curr as Rubato).intensity)) {
                    all.push(curr as Rubato)
                }
                return all
            }, new Array<Rubato>())

        mpm.insertInstructions(instructions, this.options?.part || 'global')

        // at this point, we assume different onsets inside
        // chords to be handled by a previous transformer already
        // const timeDiff = chord[0]['midi.onset']
        // const internalDate = +date % frameLength

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}

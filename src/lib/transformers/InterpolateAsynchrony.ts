import { uuid } from "../globals"
import { Asynchrony, MPM, Part } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

export interface InterpolateAsynchronyOptions extends TransformationOptions {
    /**
     * Defines which part to apply asynchrony for. Global asynchrony is impossible.
     */
    part: Omit<Part, 'global'>

    /**
     * Tolerance in milliseconds for not inserting a new asynchrony instruction
     */
    tolerance: number
}

/**
 * This transformer interpolates asynchrony instructions. It maybe applied only 
 * to a part, not globally. Under certain circumstances it should not be applied
 * after a global ornamentationMap has been interpolated. A subsequent interpolation
 * of dynamics map should be partwise.
 */
export class InterpolateAsynchrony extends AbstractTransformer<InterpolateAsynchronyOptions> {
    constructor() {
        super()

        // set the default options
        this.setOptions({
            part: 0,
            tolerance: 10
        })
    }

    public name() { return 'InterpolateAsynchrony' }

    public transform(msm: MSM, mpm: MPM): string {
        // Calculate the difference to the other part 
        // for every tstamp
        const asynchronies: Asynchrony[] = []

        const chords = msm.asChords(this.options?.part as Part || 0)
        for (const [date, chord] of Object.entries(chords)) {
            if (!chord.length) {
                // This is not supposed to happen. Throw an error instead?
                continue
            }

            // Assume, that all notes of that part 
            // are synchronized already as arpeggiations.
            // If not, take the first note and print a warning.
            const firstNote = chord[0]
            const onset = firstNote['midi.onset']
            if (!chord.every(note => note['midi.onset'] === onset)) {
                console.log(`Multiple notes inside a chord of part should be 
                    synchronized before applying the InterpolateAsynchrony transformer.`)
            }

            const otherChords = msm.asChords(1)
            const otherChord = otherChords[+date]
            if (!otherChord || !otherChord.length) {
                console.log('something went wrong with the other chord')
                continue;
            }

            const otherOnset = otherChord[0]['midi.onset']
            
            const offset = otherOnset - onset
            asynchronies.push({
                'type': 'asynchrony',
                'xml:id': 'asynchrony_' + uuid(),
                'date': +date,
                'milliseconds.offset': offset
            })
        }

        mpm.insertInstructions(asynchronies, 0)

        return super.transform(msm, mpm)
    }
}

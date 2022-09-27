import { DynamicsGradient, MPM, Ornament } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

const isSorted = (arr: number[]) => {
    let direction = -(arr[0] - arr[1])
    for (let [i, val] of arr.entries()) {
        direction = !direction ? -(arr[i - 1] - arr[i]) : direction
        if (i === arr.length - 1)
            return !direction ? 0 : direction / Math.abs(direction)
        else if ((val - arr[i + 1]) * direction > 0) return 0
    }
}

export interface InterpolatePhysicalOrnamentationOptions extends TransformationOptions {
    /**
     * the minimum number of notes an arpeggio is expected to have (inclusive)
     */
    minimumArpeggioSize: number

    /**
     * The minimum amount of time in milliseconds an ornamentation should spread over
     */
    durationThreshold: number
}

/**
 * Interpolates arpeggiated chords as ornaments, inserts them as physical
 * values into the MPM and substracts accordingly from the MIDI onset, so
 * that after the transformation all notes of the chord will have the same
 * onset.
 */
export class InterpolatePhysicalOrnamentation extends AbstractTransformer<InterpolatePhysicalOrnamentationOptions> {
    constructor() {
        super()

        // set the default options
        this.setOptions({
            minimumArpeggioSize: 2,
            durationThreshold: 30
        })
    }

    public name() { return 'InterpolatePhysicalOrnamentation' }

    public transform(msm: MSM, mpm: MPM): string {
        const ornaments: Ornament[] = []

        const chords = msm.asChords()
        for (const [date, arpeggioNotes] of Object.entries(chords)) {
            // make sure number of arpeggiated notes is greater or equal than minimum arpeggio size
            if (arpeggioNotes.length < (this.options?.minimumArpeggioSize || 2)) continue

            const sortedByOnset = arpeggioNotes.sort((a, b) => a['midi.onset'] - b['midi.onset'])

            // detecting the direction of the arpeggiated notes.
            const arpeggioDirection = isSorted(sortedByOnset.map(note => note["midi.pitch"]))
            let noteOrder = ''
            if (arpeggioDirection === 1) noteOrder = 'ascending pitch'
            else if (arpeggioDirection === -1) noteOrder = 'descending pitch'
            else noteOrder = sortedByOnset.map(note => `#${note["xml:id"]}`).join(' ')

            // the arpeggio's duration is the time distance between first and last onset
            const duration = sortedByOnset[sortedByOnset.length - 1]["midi.onset"] - sortedByOnset[0]["midi.onset"]
            if (duration * 1000 <= (this.options?.durationThreshold || 0)) continue

            // The dynamics gradient is the transition between first and last arpeggio note
            // If a dynamics gradient exists, the temporal spread might be 
            // inserted by Welte-Mignon in order to allow dynamic gradating.
            const firstVel = arpeggioNotes[0]["midi.velocity"]
            const lastVel = arpeggioNotes[arpeggioNotes.length-1]["midi.velocity"]
            const dynamicDiff = lastVel - firstVel
            let gradient: DynamicsGradient
            if (dynamicDiff > 0) gradient = 'crescendo'
            else if (dynamicDiff < 0) gradient = 'decrescendo'
            else gradient = 'no-gradient'
            const avarageVelocity = (lastVel + firstVel) / 2

            ornaments.push({
                'type': 'ornament',
                'date': +date,
                'name.ref': 'neutralArpeggio',
                'note.order': noteOrder,
                'frame.start': (-duration / 2) * 1000,
                'frameLength': duration * 1000,
                'scale': Math.max(lastVel, firstVel) - avarageVelocity,
                'time.unit': 'milliseconds',
                'gradient': gradient
            })

            const onsetSum = arpeggioNotes.map(note => note['midi.onset']).reduce((a, b) => a + b, 0)
            const avarageOnset = (onsetSum / arpeggioNotes.length) || 0

            arpeggioNotes.forEach(note => {
                note['midi.onset'] = avarageOnset
                note['midi.velocity'] = avarageVelocity
            })
        }

        mpm.insertInstructions(ornaments, 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}

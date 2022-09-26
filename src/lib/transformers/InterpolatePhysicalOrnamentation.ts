import { MPM, Ornament } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"

export interface InterpolatePhysicalOrnamentationOptions extends TransformationOptions {
    /**
     * the minimum number of notes an arpeggio is expected to have (inclusive)
     */
    minimumArpeggioSize: number
}

/**
 * Interpolates arpeggiated chords as ornaments, inserts them as physical
 * values into the MPM and substracts accordingly from the MIDI onset, so
 * that after the transformation all notes of the chord will have the same
 * onset.
 */
export class InterpolatePhysicalOrnamentation extends AbstractTransformer<InterpolatePhysicalOrnamentationOptions> {
    public name() { return 'InterpolatePhysicalOrnamentation' }

    public transform(msm: MSM, mpm: MPM): string {
        const isSorted = (arr: number[]) => {
            let direction = -(arr[0] - arr[1])
            for (let [i, val] of arr.entries()) {
                direction = !direction ? -(arr[i - 1] - arr[i]) : direction
                if (i === arr.length - 1)
                    return !direction ? 0 : direction / Math.abs(direction)
                else if ((val - arr[i + 1]) * direction > 0) return 0
            }
        }

        const ornaments: Ornament[] = []

        const chords = msm.asChords()
        for (const [date, arpeggioNotes] of Object.entries(chords)) {
            if (arpeggioNotes.length >= (this.options?.minimumArpeggioSize || 2)) {
                const sortedByOnset = arpeggioNotes.sort((a, b) => a['midi.onset'] - b['midi.onset'])

                const arpeggioDirection = isSorted(sortedByOnset.map(note => note["midi.pitch"]))
                let noteOrder = ''
                if (arpeggioDirection === 1) noteOrder = 'ascending pitch'
                else if (arpeggioDirection === -1) noteOrder = 'descending pitch'
                else noteOrder = sortedByOnset.map(note => `#${note["xml:id"]}`).join(' ')
                
                const duration = sortedByOnset[sortedByOnset.length-1]["midi.onset"] - sortedByOnset[0]["midi.onset"] 

                ornaments.push({
                    'type': 'ornament',
                    'date': +date,
                    'name.ref': 'neutralArpeggio',
                    'note.order': noteOrder,
                    'frame.start': (-duration/2) * 1000,
                    'frameLength': duration * 1000,
                    'scale': 0.0,
                    'time.unit': 'milliseconds'
                })

                const onsetSum = arpeggioNotes.map(note => note['midi.onset']).reduce((a, b) => a + b, 0)
                const avarageOnset = (onsetSum / arpeggioNotes.length) || 0

                arpeggioNotes.forEach(note => {
                    note['midi.onset'] = avarageOnset
                })
            }
        }

        mpm.insertInstructions(ornaments, 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}

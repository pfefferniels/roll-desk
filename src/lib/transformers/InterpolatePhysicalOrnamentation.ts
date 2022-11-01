import { DynamicsGradient, MPM, Ornament, Part } from "../mpm"
import { MSM } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { uuid } from '../globals'

export type ArpeggioPlacement = 'on-beat' | 'before-beat' | 'estimate'

/**
 * A little helper function to detect how an array is sorted.
 * 
 * @param arr 
 * @returns -1 if the array is sorted in descending order, 1 if its 
 * sorted in ascending order, 0 if it isn't sorted.
 */
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

    /**
     * The tolerance in milliseconds applied when calculating the noteoff.shift attribute.
     */
    noteOffShiftTolerance: number

    /**
     * Where to place the arpeggio in relation to the beat?
     */
    placement: ArpeggioPlacement

    /**
     * The part on which the transformer is to be applied to.
     */
    part: Part
}

/**
 * Interpolates arpeggiated chords as ornaments, inserts them as physical
 * values into the MPM and substracts accordingly from the MIDI onset, so
 * that after the transformation all notes of the chord will have the same
 * onset.
 */
export class InterpolatePhysicalOrnamentation extends AbstractTransformer<InterpolatePhysicalOrnamentationOptions> {
    constructor(options?: InterpolatePhysicalOrnamentationOptions) {
        super()

        // set the default options
        this.setOptions(options || {
            minimumArpeggioSize: 3,
            durationThreshold: 35,
            placement: 'estimate',
            noteOffShiftTolerance: 500,
            part: 'global'
        })
    }

    public name() { return 'InterpolatePhysicalOrnamentation' }

    public transform(msm: MSM, mpm: MPM): string {
        console.log('interpolating physical arpeggiation')
        const ornaments: Ornament[] = []

        const chords = msm.asChords(this.options?.part)
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
            const lastVel = arpeggioNotes[arpeggioNotes.length - 1]["midi.velocity"]
            const dynamicDiff = lastVel - firstVel

            let gradient: DynamicsGradient
            if (dynamicDiff > 0) gradient = 'crescendo'
            else if (dynamicDiff < 0) gradient = 'decrescendo'
            else gradient = 'no-gradient'

            const avarageVelocity = (lastVel + firstVel) / 2

            // helper function to check wether a value is in the shift tolerance
            const shiftTolerance = this.options?.noteOffShiftTolerance || 0
            const inToleranceRange = (x: number, target: number) => x >= (target - (shiftTolerance / 1000) / 2) && x <= (target + (shiftTolerance / 1000) / 2)

            // by default, no offset shifting is applied
            let noteOffShift = 'false'

            // if every note has the same duration (including tolerance) like the first note, 
            // set noteoff.shift to true
            const firstNote = sortedByOnset[0]
            if (sortedByOnset.every(note => inToleranceRange(note['midi.duration'], firstNote['midi.duration'])))
                noteOffShift = 'true'

            // if every onset is in the tolerance range of the previous offset, 
            // set noteoff.shift to monophonic
            else if (sortedByOnset.every((note, i, notes) => {
                if (i === 0) return true
                const lastOffset = notes[i - 1]['midi.onset'] + notes[i - 1]['midi.duration']
                return inToleranceRange(note['midi.onset'], lastOffset)
            }))
                noteOffShift = 'monophonic'
            
            // define the frame start based on the given option
            const frameLength = +(duration * 1000).toFixed(0)
            let frameStart: number, newOnset: number
            if (this.options?.placement === 'on-beat') {
                frameStart = 0
                newOnset = arpeggioNotes[0]['midi.onset']
            }
            else if (this.options?.placement === 'before-beat') {
                frameStart = -frameLength 
                newOnset = arpeggioNotes[arpeggioNotes.length - 1]['midi.onset']
            }
            else {
                frameStart = -frameLength / 2
                const onsetSum = arpeggioNotes.map(note => note['midi.onset']).reduce((a, b) => a + b, 0)
                newOnset = (onsetSum / arpeggioNotes.length) || 0
            }

            ornaments.push({
                'type': 'ornament',
                'xml:id': 'ornament_' + uuid(),
                'date': +date,
                'name.ref': 'neutralArpeggio',
                'noteoff.shift': noteOffShift,
                'note.order': noteOrder,
                'frame.start': frameStart,
                'frameLength': frameLength,
                'scale': Math.max(lastVel, firstVel) - avarageVelocity,
                'time.unit': 'milliseconds',
                'gradient': gradient
            })

            arpeggioNotes.forEach(note => {
                note['midi.onset'] = newOnset
                note['midi.velocity'] = avarageVelocity
            })
        }

        mpm.insertInstructions(ornaments, this.options ? this.options.part : 'global')

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}

import { MPM, Ornament } from "../Mpm"
import { MSM } from "../Msm"
import { AbstractTransformer } from "./Transformer"

export class InterpolatePhysicalOrnamentation extends AbstractTransformer {
    public transform(msm: MSM, mpm: MPM): string {
        console.log('mpm=', mpm)
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
            // TODO: can an arpeggio consist of only two notes?
            if (arpeggioNotes.length >= 2) {
                const sortedByOnset = arpeggioNotes.sort((a, b) => a['midi.onset'] - b['midi.onset'])

                const arpeggioDirection = isSorted(sortedByOnset.map(note => note["midi.pitch"]))
                let noteOrder = ''
                if (arpeggioDirection === 1) noteOrder = 'ascending pitch'
                else if (arpeggioDirection === -1) noteOrder = 'descending pitch'
                else noteOrder = sortedByOnset.map(note => `#${note["xml:id"]}`).join(' ')
                
                const duration = sortedByOnset[sortedByOnset.length-1]["midi.onset"] - sortedByOnset[0]["midi.onset"] 

                // TODO there should be an option which tells whether to prefer
                // physical or symbolic time ...
                ornaments.push({
                    type: 'ornament',
                    'date': +date,
                    'name.ref': 'neutralArpeggio',
                    'note.order': noteOrder,
                    'frame.start': (-duration/2) * 1000,
                    'frameLength': duration * 1000,
                    scale: 0.0
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

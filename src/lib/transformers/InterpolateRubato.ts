import { MPM, Part, Rubato } from "../mpm"
import { MSM, MsmNote } from "../msm"
import { AbstractTransformer, TransformationOptions } from "./Transformer"
import { v4 } from "uuid"

const physicalToSymbolic = (physicalDate: number, bpm: number, beatLength: number) => {
    return (physicalDate * (bpm * beatLength * 4 / 60)) * 720
}

const symbolicToPhysical = (bpm: number, beatLength: number, symbolic: number) => {
    return ((60 / ((beatLength || 0.25) * 4)) / bpm) * (symbolic / 720)
}

/**
 * This function calculates the effect of the rubato
 * on the MSM notes
 */
const calculateRubatoOnDate = (date: number, rubato: Rubato) => {
    const localDate = (date - rubato.date) % rubato.frameLength;      // compute the position of the map element within the rubato frame
    const d = Math.pow(localDate / rubato.frameLength, rubato.intensity) * rubato.frameLength;
    return date + d - localDate
}

/**
 * This function does the opposite of `calculateRubatoDate`:
 * It removes the "rubato effect" from a given date.
 * TODO: find a numerical, non-iterative solution.
 */
const removeRubatoFromDate = (newDate: number, rubato: Rubato) => {
    const target = (newDate - rubato.date) % rubato.frameLength;
    let lowerBound = rubato.date;
    let upperBound = rubato.date + rubato.frameLength;

    while (upperBound - lowerBound > 1e-6) {
        const middle = (upperBound + lowerBound) / 2;
        const middleNewDate = calculateRubatoOnDate(middle, rubato);

        if (Math.abs(target - middleNewDate) < 1) {
            return middle;
        } else if (middleNewDate < target) {
            lowerBound = middle;
        } else {
            upperBound = middle;
        }
    }

    return lowerBound;
};

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
                    events: chords.slice(currentPos, nextPos).map(([date, chord]) => {
                        // console.log('shift for @', date, '=', chord[0]["midi.onset"] * (chord[0]?.bpm || 60) * ((chord[0]?.["bpm.beatLength"] || 0.25) * 4 * 720) / 60,
                        // 'midi.duration=', chord[0]["midi.duration"])
                        return {
                            date: +date,
                            shift: chord[0]["midi.onset"] * (chord[0]?.bpm || 60) * ((chord[0]?.["bpm.beatLength"] || 0.25) * 4 * 720) / 60
                        }
                    }),
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

        const instructions: Rubato[] = chunks
            .map(chunk => {
                // every chunk becomes a rubato instruction

                // calculate the intensity for every given point inside the chunk
                let intensities = chunk.events.slice(1).map(({ date, shift }) => {
                    // scale both vertical and horizontal to [0,1]
                    const relativeDate = (date - chunk.events[0].date) / chunk.frameLength
                    const relativeDateShifted = (date + shift - chunk.events[0].date) / chunk.frameLength

                    return Math.log(relativeDateShifted) / Math.log(relativeDate)
                })

                // Then take its avarage.
                // TODO: Should be replace be a better method.
                const avgIntensity = intensities.reduce((p, c) => p + c, 0) / intensities.length

                return {
                    'type': 'rubato',
                    'xml:id': `rubato${v4()}`,
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

        mpm.insertInstructions(instructions, this.options?.part !== undefined ? this.options.part : 'global')

        let pendingNotes: { remainder: number, note: MsmNote }[] = []
        for (const [date, chord] of chords) {
            const insideRubato = instructions.slice().reverse().find(rubato => rubato.date <= chord[0].date)
            if (!insideRubato) continue
            if ((+date >= (insideRubato.date + insideRubato.frameLength)) && !insideRubato.loop) continue

            const remainingBit = ((+date - insideRubato.date) % insideRubato.frameLength)
            const actualRubatoDate = +date - remainingBit
            const rubatoEnd = actualRubatoDate + insideRubato.frameLength

            for (const note of chord) {
                if (!note.bpm) continue
                const onsetInTicks = calculateRubatoOnDate(note.date, insideRubato)

                for (const pendingNote of pendingNotes) {
                    if (pendingNote.note.date === note.date) continue

                    const remainderDurationInTicks = physicalToSymbolic(pendingNote.remainder, note.bpm, note["bpm.beatLength"] || 0.25)
                    const newRemainderDuration = symbolicToPhysical(
                        note.bpm, note["bpm.beatLength"] || 0.25,
                        removeRubatoFromDate(onsetInTicks + remainderDurationInTicks, insideRubato)!)

                    pendingNote.note['midi.duration'] += newRemainderDuration

                    const index = pendingNotes.indexOf(pendingNote, 0);
                    if (index > -1) {
                        pendingNotes.splice(index, 1);
                    }
                }

                const durationInTicks = physicalToSymbolic(note['midi.duration'], note.bpm, note["bpm.beatLength"] || 0.25)

                // if the offset is outside the scope of this 
                // rubato instruction, delay the processing of 
                // this duration to the next rubato instruction
                // in which it falls.
                // TODO: handle the case that it does fall into
                // an area where no rubato instruction is present.
                if (onsetInTicks + durationInTicks > rubatoEnd && +date !== msm.lastDate()) {
                    // the remainder is that bit of the physical duration
                    // which falls outside the scope of the present rubato
                    // instruction. Until the remainder is processed,
                    // the note has the duration from its onset (without any rubato
                    // present) to the end of the current rubato frame.
                    const remainder = note["midi.duration"] - symbolicToPhysical(note.bpm, note["bpm.beatLength"] || 0.25, rubatoEnd - onsetInTicks)
                    note['midi.duration'] = symbolicToPhysical(note.bpm, note["bpm.beatLength"] || 0.25, rubatoEnd - note.date)
                    pendingNotes.push({
                        remainder,
                        note
                    })
                    continue
                }

                if (note.date !== msm.lastDate()) {
                    // remove any rubato timing from the midi.duration for 
                    // further processing.
                    note['midi.duration'] = symbolicToPhysical(note.bpm, note["bpm.beatLength"] || 0.25,
                        removeRubatoFromDate(onsetInTicks + durationInTicks, insideRubato)!)
                }
            }
        }

        // hand it over to the next transformer
        return super.transform(msm, mpm)
    }
}

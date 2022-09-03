import { HMM, HMMEvent, pitchToSitch } from "alignmenttool"
import { vrvToolkit } from "../components/Verovio"
import { TimeSignature } from "./Msm"

export type ScoreNote = {
    index: number,
    id: string,
    qstamp: number,
    pnum: number,
    duration: number,
    part: number

    // the following parameters are optional:
    // they are useful for visualizing and 
    // further processing an alignment, but not
    // strictly necessary
    pname?: string,
    accid?: number,
    octave?: number
}

export function basePitchOfNote(pname: string, oct: number): number {
    const diatonic = new Map<string, number>([
        ['c', 60],
        ['d', 62],
        ['e', 64],
        ['f', 65],
        ['g', 67],
        ['a', 69],
        ['b', 71]
    ]).get(pname.toLowerCase())
    return (diatonic || 0) + (oct - 4) * 12
}

export class Score {
    private scoreDOM: Document
    notes: ScoreNote[]
    timemap: any[]  // TODO define type. 

    // score encoding can be anything that Verovio can parse
    constructor(scoreEncoding: string) {
        console.log('new score object created using Verovio version', vrvToolkit.getVersion())

        vrvToolkit.setOptions({
            adjustPageHeight: true,
            pageHeight: 60000
        })
        vrvToolkit.loadData(scoreEncoding)
        // using getMEI() here since it adds `xml:id` to all elements
        this.scoreDOM = new DOMParser().parseFromString(vrvToolkit.getMEI(), 'text/xml')
        this.timemap = vrvToolkit.renderToTimemap()
        this.notes = this.getNotesFromTimemap()
    }

    // transform timemap to notes array
    private getNotesFromTimemap(): ScoreNote[] {
        const timemap = this.timemap
        let result: ScoreNote[] = []
        let index = 0
        for (const event of timemap) {
            if (!event.on) continue
            for (const on of event.on) {
                const midiValues = vrvToolkit.getMIDIValuesForElement(on)
                const offTime = timemap.find((event: any) => event.off && event.off.includes(on)).qstamp || 0
                const noteEl = this.scoreDOM.querySelector(`[*|id='${on}']`)
                const staff = noteEl?.closest('staff') || null
                if (!staff) continue
                // ignore the note if its tied
                if (this.scoreDOM.querySelector(`tie[endid='#${on}']`)) {
                    continue
                }
                result.push({
                    index: index,
                    id: on,
                    qstamp: event.qstamp,
                    octave: Number(noteEl?.getAttribute('oct') || 0),
                    pname: noteEl?.getAttribute('pname') || '',
                    accid: Array.from(noteEl?.getAttribute('accid.ges') || noteEl?.getAttribute('accid') || '').reduce((acc, curr) => {
                        if (curr === 'f') return acc-1
                        else if (curr === 's') return acc+1
                        return acc
                    }, 0),
                    pnum: midiValues.pitch,
                    duration: offTime - event.qstamp,
                    part: Number(staff.getAttribute('n'))
                })
                index += 1
            }
        }

        console.log('notes=', result)
        return result
    }

    public asSVG(): string {
        vrvToolkit.setOptions({
            adjustPageHeight: true,
            pageHeight: 60000
        })
        return vrvToolkit.renderToSVG(1)
    }

    public countParts(): number {
        return this.scoreDOM.querySelectorAll('staffDef').length
    }

    public static qstampToTstamp(qstamp: number): number {
        return qstamp * 720
    }

    // get last qstamp
    public getMaxQstamp(): number {
        return this.timemap.at(-1).qstamp;
    }

    public notesInRange(start: number, end: number): ScoreNote[] {
        const lowerIndex = this.notes.findIndex((note: ScoreNote) => note.qstamp >= start)
        if (lowerIndex === -1) return []

        const upperIndex = this.notes.length - this.notes.slice().reverse().findIndex((note: ScoreNote) => note.qstamp <= end)
        if (lowerIndex > upperIndex) return []

        return this.notes.slice(lowerIndex, upperIndex)
    }

    public allNotes(): ScoreNote[] {
        return this.notes
    }

    public asHMM(): HMM {
        const timemap = this.timemap
        let result: HMMEvent[] = []

        for (const event of timemap) {
            if (!event.on) continue

            const notesAtTime = []
            for (const on of event.on) {
                const midiValues = vrvToolkit.getMIDIValuesForElement(on)

                // prepare the voice parameter
                const staff = this.scoreDOM.querySelector(`[*|id='${on}']`)?.closest('staff') || null
                const layer = this.scoreDOM.querySelector(`[*|id='${on}']`)?.closest('layer') || null
                if (!staff || !layer) continue
                const voice = (Number(staff.getAttribute('n'))-1) + Number(layer.getAttribute('n'))

                // ignore the note if its tied
                if (this.scoreDOM.querySelector(`tie[endid='#${on}']`)) {
                    continue
                }
                notesAtTime.push({
                    meiID: on, 
                    voice: voice,
                    sitch: pitchToSitch(midiValues.pitch)
                })
            }

            result.push(new HMMEvent(event.qstamp, event.qstamp+0.5, [notesAtTime]))
        }
        const hmm = new HMM()
        hmm.events = result 

        return hmm
    }

    /**
     * This method return the qstamps of the first note in each measure. 
     * In particular useful when different time signatures appear in one piece.
     * @returns the qstamps of all downbeats
     */
    public allDownbeats(): number[] {
        const qstamps: number[] = []
        const measures = this.scoreDOM.querySelectorAll("measure")
        for (const measure of measures) {
            const note = measure.querySelector("note") // what about rests?
            if (note) {
                const id = note.getAttribute("xml:id")
                const corresp = this.allNotes().find((note: ScoreNote) => {
                    return note.id === id
                })
                if (corresp) qstamps.push(corresp?.qstamp)
            }
        }
        return qstamps
    }

    public notesAtTime(qstamp: number): ScoreNote[] {
        return this.allNotes().filter((note: ScoreNote) => note.qstamp === qstamp)
    }

    public at(id: string): ScoreNote | undefined {
        //return this.notes.find(note => note.index === index)!
        return this.allNotes().find((value: ScoreNote) => value.id === id)
    }

    /**
     * This function generates RDF triples from the score
     * as RDFized MEI.
     * 
     * @returns string of RDF triples in Turtle format.
     */
    public serializeToRDF(): string {
        return ''
    }

    /**
     * Returns the time signature. If none can be found, it 
     * assumes a common C time.
     * 
     * @returns TimeSignature
     */
    public timeSignature(): TimeSignature {
        const meterSig = this.scoreDOM.querySelector('meterSig')
        return {
            numerator: Number(meterSig?.getAttribute('count')) || 4,
            denominator: Number(meterSig?.getAttribute('unit')) || 4
        }
    }
}

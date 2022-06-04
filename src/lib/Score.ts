import { vrvToolkit } from "../components/Verovio"

export type Note = {
    index: number,
    id: string,
    qstamp: number,
    pitch: number,
    duration: number,
    part: number
}

export class Score {
    private scoreDOM: Document
    notes: Note[]
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
    private getNotesFromTimemap(): Note[] {
        const timemap = this.timemap
        let result: Note[] = []
        let index = 0
        for (const event of timemap) {
            if (!event.on) continue
            for (const on of event.on) {
                const midiValues = vrvToolkit.getMIDIValuesForElement(on)
                const offTime = timemap.find((event: any) => event.off && event.off.includes(on)).qstamp || 0
                const staff = this.scoreDOM.querySelector(`[*|id='${on}']`)?.closest('staff') || null
                if (!staff) continue
                result.push({
                    index: index, 
                    id: on,
                    qstamp: event.qstamp, 
                    pitch: midiValues.pitch,
                    duration: offTime - event.qstamp,
                    part: Number(staff.getAttribute('n'))
                })
                index += 1
            }
        }
        return result
    }

    public asSVG(): string {
        vrvToolkit.setOptions({
            adjustPageHeight: true,
            pageHeight: 60000
        })
        return vrvToolkit.renderToSVG(1)
    }

    public qstampToTstamp(qstamp: number): number {
        return qstamp * 720
    }

    // get last qstamp
    public getMaxQstamp(): number {
        return this.timemap.at(-1).qstamp;
    }

    public notesInRange(start: number, end: number): Note[] {
        const lowerIndex = this.notes.findIndex((note: Note) => note.qstamp >= start)
        if (lowerIndex === -1) return []

        const upperIndex = this.notes.length - this.notes.reverse().findIndex((note: Note) => note.qstamp <= end)
        if (lowerIndex > upperIndex) return []

        return this.notes.slice(lowerIndex, upperIndex)
    }

    public allNotes(): Note[] {
        return this.notes
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
                const corresp = this.allNotes().find((note: Note) => {
                    return note.id === id
                })
                if (corresp) qstamps.push(corresp?.qstamp)
            }
        }
        return qstamps
    }

    public notesAtTime(qstamp: number): Note[] {
        return this.allNotes().filter((note: Note) => note.qstamp === qstamp)
    }

    public at(id: string): Note | undefined {
        //return this.notes.find(note => note.index === index)!
        return this.allNotes().find((value: Note) => value.id === id)
    }
}

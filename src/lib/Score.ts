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
    notes: Note[]
    timemap: any[]  // TODO define type. 

    // score encoding can be anything that Verovio can parse
    constructor(scoreEncoding?: string) {
        console.log('new score object created using Verovio version', vrvToolkit.getVersion(), scoreEncoding)
        vrvToolkit.loadData(scoreEncoding || '')
        this.timemap = vrvToolkit.renderToTimemap()
        this.notes = Score.parseFromTimemap(this.timemap)
    }

    // transform timemap to notes array
    private static parseFromTimemap(timemap: any[]): Note[] {
        let result: Note[] = []
        let index = 0
        for (const event of timemap) {
            if (!event.on) continue
            for (const on of event.on) {
                const midiValues = vrvToolkit.getMIDIValuesForElement(on)
                const offTime = timemap.find((event: any) => event.off && event.off.includes(on)).qstamp || 0
                result.push({
                    index: index, 
                    id: on,
                    qstamp: event.qstamp, 
                    pitch: midiValues.pitch,
                    duration: offTime - event.qstamp,
                    part: 0      // TODO
                })
                index += 1
            }
        }
        console.log('notes array:', result)
        return result
    }

    public asSVG(): string {
        vrvToolkit.setOptions({
            adjustPageHeight: true
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
        const upperIndex = this.notes.findIndex((note: Note) => note.qstamp <= end)
        if (lowerIndex > upperIndex) return []
        return this.notes.slice(lowerIndex, upperIndex)
    }

    public allNotes(): Note[] {
        return this.notes
    }

    public allDownbeats(): number[] {
        return []
    }

    public notesAtTime(qstamp: number): Note[] {
        return this.notes.filter((note: Note) => note.qstamp === qstamp)
    }

    public at(id: string): Note | undefined {
        //return this.notes.find(note => note.index === index)!
        return this.notes.find((value: Note) => value.id === id)
    }
}

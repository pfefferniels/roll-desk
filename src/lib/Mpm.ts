import { parse } from "js2xmlparser"

/**
 * A part can be specified as either a given
 * part number or global. This definition is 
 * used in both, MSM and MPM.
 */
export type Part = number | 'global'

type DatedInstruction<T extends string> = {
    readonly type: T
}

/**
 * Maps the <dynamics> element of MPM
 */
export interface Dynamics extends DatedInstruction<'dynamics'> {
    date: number
    volume: number | string
    'transition.to'?: number
}

/**
 * Maps the <tempo> element of MPM
 */
export interface Tempo extends DatedInstruction<'tempo'> {
    'date': number
    'bpm': number
    'beatLength': number
    'transition.to'?: number
    'meanTempoAt'?: number
}

/**
 * Maps the <ornament> element of MPM
 */
export interface Ornament extends DatedInstruction<'ornament'> {
    date: number
    'name.ref': string
    'note.order': string
    'frameLength': number 
    'frame.start': number
    'transition.from'?: number
    'transition.to'?: number
    'scale': number
}

type AnyInstruction = 
    | Tempo 
    | Ornament 
    | Dynamics

export class MPM {
    rawMPM: any

    constructor(nParts = 2) {
        this.rawMPM = {
            "@": {
                xmlns: "http://www.cemfi.de/mpm/ns/1.0"
            },
            performance: {
                "@": {
                    name: '',
                    pulsesPerQuarter: 720
                },
                global: {
                    dated: {
                        'tempoMap': {},
                        'ornamentationMap': {},
                        'imprecisionMap.timing': {}
                    }
                },
                part: Array.from(Array(nParts).keys()).map(i => {
                    return {
                        "@": {
                            name: `part${i}`,
                            number: `${i + 1}`,
                            "midi.channel": `${i}`,
                            "midi.port": "0"
                        },
                        dated: {
                            dynamicsMap: {},
                            asynchronyMap: {},
                            ornamentationMap: {},
                            articulationMap: {}
                        }
                    }
                })
            }
        }
    }

    /**
     * Returns the instructions at a given date.
     * @param date 
     * @param part If not specified, all parts are considered
     */
    instructionsAtDate(date: number, part?: Part) {
        if (part === undefined) {

        }
        else if (part === 'global') {

        }
        else if (typeof part === 'number') {

        }
    }

    /**
     * Based on the given instructions type, this method will
     * insert them into their corresponding map, e.g. <dynamics>
     * elements will be inserted to <dynamicsMap>. After inserting
     * the map will sorted by `date`.
     * 
     * @param instruction 
     * @param part a part number or 'global'
     */
    insertInstructions<T>(instructions: AnyInstruction[], part: Part) {
        if (!instructions.length) return

        const instructionType = instructions[0].type
        const correspondingMapName = {
            dynamics: 'dynamicsMap',
            ornament: 'ornamentationMap',
            tempo: 'tempoMap'
        }[instructionType]

        if (!correspondingMapName) return

        let map
        if (part === 'global') {
            map = this.rawMPM.performance.global.dated[correspondingMapName]
        }
        else if (typeof part === 'number') {
            map = this.rawMPM.performance.part.find((p: any) => p['@'].number === part+1)
        }

        if (!map) {
            console.log('cannot find part', part, 'in the MPM')
            return
        }

        if (Array.isArray(map[instructionType])) {
            map[instructionType] = [...map[instructionType], ...instructions.map(i => ({'@': i}))]
        }
        else {
            map[instructionType] = instructions.map(i => ({'@': i}))
        }
    }

    /**
     * Will remove the contents of a given map type.
     */
    removeInstructions<T extends DatedInstruction<string>>(part: Part) {
    }

    /**
     * Gets all instructions inside a given map type.
     * @param part 
     * @returns 
     */
    getInstructions<T extends DatedInstruction<string>>(part: Part): T[] {
        return []
    }

    setPerformanceName(performanceName: string) {
        this.rawMPM.performance["@"].name = performanceName
    }

    serialize() {
        return parse('mpm', this.rawMPM)
    }
}

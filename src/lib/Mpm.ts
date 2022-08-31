import { parse } from "js2xmlparser"

/**
 * A part can be specified as either a given
 * part number or global. This definition is 
 * used in both, MSM and MPM.
 */
export type Part = number | 'global'

type Definition<T extends string> = {
    readonly type: T
}

export interface OrnamentDef extends Definition<'ornament'> {
    'frameLength'?: number
    'frame.start'?: number
    'transition.from'?: number
    'transition.to'?: number
}

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
    'frameLength'?: number
    'frame.start'?: number
    'transition.from'?: number
    'transition.to'?: number
    'scale': number
}

type AnyInstruction =
    | Tempo
    | Ornament
    | Dynamics

type AnyDefinition =
    | OrnamentDef

type InstructionType =
    | 'tempo'
    | 'ornament'
    | 'dynamics'

/**
 * Represents an MPM encoding and exposes some methods for
 * easily working with it.
 */
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
                    header: {
                        ornamentationStyles: {}
                    },
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
                        header: {
                            ornamentationStyles: {}
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

    insertDefinition(definition: AnyDefinition, part: Part): string {
        const type = definition.type
        const correspondingStylesName = {
            'ornament': 'ornamentationStyles'
        }[type]
        const styles = this.getStyles(correspondingStylesName, part)
        if (!styles) return ''

        if (!styles.styleDef) {
            styles.styleDef = {
                '@': {
                    'name': 'performance_style'
                },
            }
        }

        function uuid() {
            return 'xxxxx'.replace(/[x]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        
        const name = `def_${uuid()}`

        if (type === 'ornament') {
            if (!styles.styleDef.ornamentDef) {
                styles.styleDef.ornamentDef = []
            }

            const ornamentDef = styles.styleDef.ornamentDef
            ornamentDef.push({
                '@': {
                    name
                },
                'temporalSpread': {
                    '@': {
                        'frame.start': definition['frame.start'],
                        'frameLength': definition['frameLength'],
                        'time.unit': 'ticks' 
                    }
                }
            })
        }

        return name;
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
    insertInstructions(instructions: AnyInstruction[], part: Part) {
        if (!instructions.length) return

        const instructionType = instructions[0].type
        const correspondingMapName = this.correspondingMapNameFor(instructionType)
        if (!correspondingMapName) return

        const map = this.getMap(correspondingMapName, part)
        if (!map) {
            console.log('cannot find part', part, 'in the MPM')
            return
        }

        if (Array.isArray(map[instructionType])) {
            map[instructionType] = [...map[instructionType], ...instructions.map(i => ({ '@': i }))]
        }
        else {
            map[instructionType] = instructions.map(i => ({ '@': i }))
        }
    }

    /**
     * Will remove the contents of a given map type.
     */
    removeInstructions(instructionType: InstructionType, part: Part) {
        const correspondingMapName = this.correspondingMapNameFor(instructionType)
        const map = this.getMap(correspondingMapName, part)

        if (!map) {
            console.log('cannot find part', part, 'in the MPM')
            return
        }

        if (Array.isArray(map[instructionType])) {
            map[instructionType] = []
        }
    }

    /**
     * Gets all instructions inside a given map type.
     * @param part 
     * @returns 
     */
    getInstructions<T>(instructionType: InstructionType, part: Part): T[] {
        const correspondingMapName = this.correspondingMapNameFor(instructionType)
        const map = this.getMap(correspondingMapName, part)
        if (!map) {
            console.log('map', correspondingMapName, 'not found in MPM')
            return []
        }

        if (!map[instructionType]) return []
        return map[instructionType].map((i: any) => i['@'])
    }

    setPerformanceName(performanceName: string) {
        this.rawMPM.performance["@"].name = performanceName
    }

    serialize() {
        return parse('mpm', this.rawMPM)
    }

    getMap(mapName: string, part: Part): any {
        let map
        if (part === 'global') {
            map = this.rawMPM.performance.global.dated[mapName]
        }
        else if (typeof part === 'number') {
            map = this.rawMPM.performance.part.find((p: any) => +p['@'].number === (part + 1)).dated[mapName]
        }
        return map
    }

    getStyles(stylesName: string, part: Part): any {
        let styles
        if (part === 'global') {
            styles = this.rawMPM.performance.global.header[stylesName]
        }
        else if (typeof part === 'number') {
            styles = this.rawMPM.performance.part.find((p: any) => +p['@'].number === (part + 1)).header[stylesName]
        }
        return styles
    }

    private correspondingMapNameFor(instructionType: InstructionType) {
        return {
            dynamics: 'dynamicsMap',
            ornament: 'ornamentationMap',
            tempo: 'tempoMap'
        }[instructionType]
    }
}

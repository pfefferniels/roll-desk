import { parse } from "js2xmlparser"
import { uuid } from "./globals"

interface WithXmlId {
    'xml:id': string
}

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
    'time.unit'?: 'ticks' | 'milliseconds'
}

type AnyDefinition =
    | OrnamentDef

type DatedInstruction<T extends string> = {
    readonly type: T
}

/**
 * Maps the <dynamics> element of MPM
 */
export interface Dynamics extends DatedInstruction<'dynamics'>, WithXmlId {
    date: number
    volume: number | string
    'transition.to'?: number
}

/**
 * Maps the <tempo> element of MPM
 */
export interface Tempo extends DatedInstruction<'tempo'>, WithXmlId {
    'date': number
    'bpm': number
    'beatLength': number
    'transition.to'?: number
    'meanTempoAt'?: number
}

export type DynamicsGradient = 'crescendo' | 'decrescendo' | 'no-gradient'

/**
 * Maps the <ornament> element of MPM
 */
export interface Ornament extends DatedInstruction<'ornament'>, WithXmlId {
    'date': number
    'name.ref': string
    'note.order': string
    'frameLength'?: number
    'frame.start'?: number
    'transition.from'?: number
    'transition.to'?: number
    'time.unit'?: 'ticks' | 'milliseconds'
    'scale': number
    'gradient'?: 'crescendo' | 'decrescendo' | 'no-gradient'
}

type AnyInstruction =
    | Tempo
    | Ornament
    | Dynamics

type InstructionType =
    | 'tempo'
    | 'ornament'
    | 'dynamics'

type RelatedResource = {
    uri: string,
    type: string
}

type Metadata = {
    authors: string[],
    comments: string[],
    relatedResources: RelatedResource[]
}

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
            metadata: {},
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
                        dated: {
                            dynamicsMap: {},
                            asynchronyMap: {},
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
     * Inserts a definion into its corresponding styles environment
     * in the header of the given part.
     * 
     * @param definition 
     * @param part 
     * @returns name of definition
     */
    insertDefinition(definition: AnyDefinition, part: Part): string {
        const type = definition.type
        const correspondingStylesName = {
            'ornament': 'ornamentationStyles'
        }[type]
        const styles = this.getStyles(correspondingStylesName, part)
        if (!styles) return ''

        // insert a style def if it doesn't exist yet
        if (!styles.styleDef) {
            styles.styleDef = {
                '@': {
                    'name': 'performance_style'
                },
            }
        }

        // insert a style switch in the map if it doesn't exist yet
        const correspondingMap = this.getMap(this.correspondingMapNameFor(type), part)
        if (!correspondingMap.style) {
            correspondingMap.style = {
                '@': {
                    'date': '0.0',
                    'name.ref': 'performance_style'
                }
            }
        }

        const name = `def_${uuid()}`

        if (type === 'ornament') {
            if (!styles.styleDef.ornamentDef) {
                styles.styleDef.ornamentDef = []
            }

            const ornamentDef = styles.styleDef.ornamentDef
            let toPush: any = {
                '@': {
                    name
                }
            }
            if (definition["frame.start"] && definition['frameLength'] && definition['time.unit']) {
                toPush['temporalSpread'] = {
                    '@': {
                        'frame.start': definition['frame.start'],
                        'frameLength': definition['frameLength'],
                        'time.unit': definition['time.unit']
                    }
                }
            }
            if (definition['transition.from'] && definition['transition.to']) {
                toPush['dynamicsGradient'] = {
                    '@': {
                        'transition.to': definition['transition.to'],
                        'transition.from': definition['transition.from']
                    }
                }
            }
            ornamentDef.push(toPush)
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

    setMetadata(metadata: Metadata) {
        this.rawMPM.metadata = {
            'author': metadata.authors.map((author, i) => {
                return {
                    '@': {
                        number: i
                    },
                    '#': author
                }
            }),
            'comments': metadata.comments,
            'relatedResources': ''
        }
    }

    serialize() {
        return parse('mpm', this.rawMPM)
    }

    /**
     * Get a map of a certain part. Given e.g. 
     * the map name 'ornamentationMap' and the part 'global',
     * it returns the <ornamentationMap> inside the <global> environment.
     * 
     * @param mapName 
     * @param part 
     * @returns 
     */
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

    /**
     * Get a style of a certain part. Given e.g. the
     * style name 'ornamentationStyles' and the part 'global'
     * it returns the <ornamentationStyles> inside the <header> of the 
     * <global> environemnt. 
     * 
     * @param stylesName 
     * @param part 
     * @returns 
     */
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

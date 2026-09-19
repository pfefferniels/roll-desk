import { describe, expect, it } from 'vitest'
import { assignReference, siglaOf, systemOf, TrackerBar, Version, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { calculatePositions, fitOf, graphOf, linkMarkAt, Node, radiusOf } from './Stemma'
import { point } from '../../helpers/drawing'
import { svg } from '../../helpers/units'

const version = (
    siglum: string,
    bar: TrackerBar,
    generation: number,
    basedOn?: string
): Version & { generation: number } => ({
    type: 'Version',
    id: siglum,
    system: systemOf(bar),
    ...(basedOn && { basedOn: [assignReference(basedOn)] }),
    edits: [],
    motivations: [],
    generation
})

/** The graph of a stemma whose versions are all shown by a copy. */
const graphFor = (versions: (Version & { generation: number })[]) =>
    graphOf(versions, [], {
        sigla: siglaOf({ versions }),
        attested: new Set(versions.map(version => version.id))
    })

const captionOf = (nodes: Node[], siglum: string) => {
    const node = nodes.find(n => n.id === siglum)!
    return node.namesSystem ? node.system : undefined
}

describe('which version names its system', () => {
    const chain = [
        version('A', welteT100, 0),
        version('B', welteT100, 1, 'A'),
        version('C', welteLicensee, 2, 'B')
    ]

    it('names the system of the version everything descends from', () => {
        expect(captionOf(graphFor(chain).nodes, 'A')).toBe('Welte-Mignon T100')
    })

    it('says nothing where a version stays on the system it was based on', () => {
        expect(captionOf(graphFor(chain).nodes, 'B')).toBeUndefined()
    })

    it('names the system a transfer arrives in', () => {
        expect(captionOf(graphFor(chain).nodes, 'C')).toBe('Welte-Mignon (Licensee)')
    })

    it('marks the derivation that crosses systems as a transfer', () => {
        const links = graphFor(chain).links

        expect(links.map(link => link.transfer)).toEqual([false, true])
    })

    it('leaves a derivation dangling where the version it names is missing', () => {
        const orphan = [version('B', welteT100, 1, 'A')]

        expect(graphFor(orphan).links).toHaveLength(0)
    })
})

describe('which node is drawn open', () => {
    const chain = [
        version('A', welteT100, 0),
        version('B', welteT100, 1, 'A')
    ]

    it('marks the versions no copy shows at first hand', () => {
        const { nodes } = graphOf(chain, [], { sigla: siglaOf({ versions: chain }), attested: new Set(['B']) })

        expect(nodes.map(node => node.inferred)).toEqual([true, false])
    })
})

describe('derivations held as hypotheses', () => {
    it('draws every derivation and tells the one the text is read against apart', () => {
        const possibly = {
            ...assignReference('B'),
            '@annotation': { id: 'annotation', belief: { type: 'belief' as const, id: 'belief', certainty: 'possible' as const, reasons: [] } }
        }
        const contaminated = [
            version('A', welteT100, 0),
            version('B', welteT100, 0),
            { ...version('S', welteT100, 1, 'A'), basedOn: [assignReference('A'), possibly] }
        ]

        expect(graphFor(contaminated).links.map(link => [(link.target as Node).id, link.principal, link.certainty, link.derivation, link.believed]))
            .toEqual([['A', true, 'true', 0, false], ['B', false, 'possible', 1, true]])
    })
})

describe('fitting the stemma into its drawing', () => {
    it('scales by whichever side leaves less room, about the middle of the nodes', () => {
        const nodes = [
            { id: 'A', label: 'A', generation: 0, x: 0, y: 0 },
            { id: 'B', label: 'B', generation: 1, x: 100, y: 200 }
        ]

        expect(fitOf(nodes, 300, 600)).toEqual({ scale: 2.2, midX: 50, midY: 100 })
    })

    it('leaves a drawing without nodes as it is', () => {
        expect(fitOf([], 300, 600)).toEqual({ scale: 1, midX: 0, midY: 0 })
    })
})

describe('where the mark of a derivation sits', () => {
    it('sits beside the middle of the link, as far off it as asked', () => {
        const mark = linkMarkAt(point(svg(0), svg(0)), point(svg(0), svg(100)), svg(20))

        expect(mark.y).toBeCloseTo(50)
        expect(Math.abs(mark.x)).toBeCloseTo(20)
    })

    it('sits on a link that has no length', () => {
        const at = point(svg(5), svg(5))

        expect(linkMarkAt(at, at, svg(20))).toEqual(at)
    })
})

describe('the room a node takes in its row', () => {
    const siblings = [
        version('C', welteT100, 0),
        version('D1', welteLicensee, 1, 'C'),
        version('D2', welteT98, 1, 'C')
    ]

    it('keeps two captioned siblings clear of each other', () => {
        const { nodes, links } = graphFor(siblings)
        const positioned = calculatePositions(nodes, links, 300, 600)

        const [d1, d2] = ['D1', 'D2'].map(id => {
            const found = positioned.find(n => n.id === id)
            if (!found) throw new Error(`the stemma has no node ${id}`)
            return found
        })
        if (!d1 || !d2) throw new Error('both siblings should be placed')
        // as Firefox measures the two captions at font-size 10
        const captionWidth = (node: Node) => node.system!.length * 5.8

        expect(Math.abs(d1.x! - d2.x!))
            .toBeGreaterThan((captionWidth(d1) + captionWidth(d2)) / 2)
    })

    it('takes the radius a node was given over the one its type implies', () => {
        const [node] = graphFor(siblings).nodes
        if (!node) throw new Error('the graph should have a node')
        expect(radiusOf({ ...node, radius: 17.5 })).toBe(17.5)
    })
})

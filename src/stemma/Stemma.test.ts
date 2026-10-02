import { describe, expect, it } from 'vitest'
import { assignReference, siglaOf, systemOf, TrackerBar, Version, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { calculatePositions, clashesOf, fitOf, graphOf, inDrawingOrder, Node, radiusOf, routeMarkAt, shiftIntoView, spreadVersions } from './Stemma'
import { point } from '../geometry/drawing'
import { svg } from '../canvas/units'

const version = (
    siglum: string,
    bar: TrackerBar,
    generation: number,
    basedOn?: string
): Version & { generation: number } => ({
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
    const possibly = {
        ...assignReference('B'),
        '@annotation': { id: 'annotation', belief: { type: 'belief' as const, id: 'belief', certainty: 'possible' as const, reasons: [] } }
    }
    const contaminated = [
        version('A', welteT100, 0),
        version('B', welteT100, 0),
        { ...version('S', welteT100, 1, 'A'), basedOn: [assignReference('A'), possibly] }
    ]

    it('draws every derivation and tells the one the text is read against apart', () => {
        expect(graphFor(contaminated).links.map(link => [(link.target as Node).id, link.principal, link.certainty, link.derivation, link.believed]))
            .toEqual([['A', true, 'true', 0, false], ['B', false, 'possible', 1, true]])
    })

    it('draws a hypothesis beneath every balloon, keeping where each link stands', () => {
        const links = graphFor([...contaminated, version('T', welteT100, 2, 'S')]).links

        expect(inDrawingOrder(links).map(({ link, i }) => [(link.source as Node).id, (link.target as Node).id, i]))
            .toEqual([['S', 'B', 1], ['S', 'A', 0], ['T', 'S', 2]])
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
        const mark = routeMarkAt([point(svg(0), svg(0)), point(svg(0), svg(100))], svg(20))

        expect(mark.y).toBeCloseTo(50)
        expect(Math.abs(mark.x)).toBeCloseTo(20)
    })

    it('sits beside the place halfway along a link that turns', () => {
        const mark = routeMarkAt([point(svg(0), svg(0)), point(svg(0), svg(60)), point(svg(100), svg(60))], svg(20))

        expect(mark.x).toBeCloseTo(20)
        expect(Math.abs(mark.y - 60)).toBeCloseTo(20)
    })

    it('sits on a link that has no length', () => {
        const at = point(svg(5), svg(5))

        expect(routeMarkAt([at, at], svg(20))).toEqual(at)
    })
})

describe('moving a place into view', () => {
    const viewport = { width: svg(300), height: svg(600) }

    it('leaves the drawing alone where the place is already in view', () => {
        expect(shiftIntoView(point(svg(150), svg(300)), viewport, svg(40))).toBeUndefined()
    })

    it('leaves it alone where the place is just inside the margin', () => {
        expect(shiftIntoView(point(svg(40), svg(560)), viewport, svg(40))).toBeUndefined()
    })

    it('brings a place off the near edge in as far as the margin, and no further', () => {
        expect(shiftIntoView(point(svg(-10), svg(300)), viewport, svg(40))).toEqual(point(svg(50), svg(0)))
    })

    it('brings a place off the far edge in the other way', () => {
        expect(shiftIntoView(point(svg(150), svg(700)), viewport, svg(40))).toEqual(point(svg(0), svg(-140)))
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

describe('keeping an opened balloon clear', () => {
    const motivated = (siglum: string, generation: number, basedOn?: string) => ({
        ...version(siglum, welteT100, generation, basedOn),
        motivations: [{ type: 'motivation' as const, id: `${siglum}-m` }]
    })
    const siblings = [version('A', welteT100, 0), motivated('B', 1, 'A'), motivated('C', 1, 'A')]

    /** The siblings drawn close beneath their parent, as the force layout may leave them. */
    const crowded = () => {
        const { nodes, links } = graphFor(siblings)
        const place = (id: string, x: number, y: number) => Object.assign(nodes.find(n => n.id === id) ?? {}, { x, y })
        place('A', 0, 50)
        place('B', -40, 250)
        place('C', 40, 250)
        return { nodes, links }
    }

    it('finds the balloon of one sibling opened across the other', () => {
        const { nodes, links } = crowded()

        expect(clashesOf(nodes, links, 1).map(clash => clash.movers)).toContainEqual(['B', 'C'])
    })

    it('spreads the siblings apart until neither opened balloon reaches the other, keeping their order', () => {
        const { nodes, links } = crowded()

        expect(spreadVersions(nodes, links, 1)).toBe(true)
        expect(clashesOf(nodes, links, 1)).toEqual([])

        const [, b, c] = nodes
        expect(b?.x).toBeLessThan(c?.x ?? 0)
    })

    it('leaves them where they are once they are clear', () => {
        const { nodes, links } = crowded()
        spreadVersions(nodes, links, 1)
        const spread = nodes.map(node => node.x)

        expect(spreadVersions(nodes, links, 1)).toBe(false)
        expect(nodes.map(node => node.x)).toEqual(spread)
    })
})

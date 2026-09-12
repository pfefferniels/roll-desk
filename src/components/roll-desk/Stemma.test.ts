import { describe, expect, it } from 'vitest'
import { assignReference, systemOf, TrackerBar, Version, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { calculatePositions, graphOf, Node, radiusOf } from './Stemma'

const version = (
    siglum: string,
    bar: TrackerBar,
    generation: number,
    basedOn?: string
): Version & { generation: number } => ({
    type: 'Version',
    id: siglum,
    siglum,
    system: systemOf(bar),
    versionType: 'edition',
    ...(basedOn && { basedOn: assignReference(basedOn) }),
    edits: [],
    motivations: [],
    generation
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
        expect(captionOf(graphOf(chain, []).nodes, 'A')).toBe('Welte-Mignon T100')
    })

    it('says nothing where a version stays on the system it was based on', () => {
        expect(captionOf(graphOf(chain, []).nodes, 'B')).toBeUndefined()
    })

    it('names the system a transfer arrives in', () => {
        expect(captionOf(graphOf(chain, []).nodes, 'C')).toBe('Welte-Mignon (Licensee)')
    })

    it('marks the derivation that crosses systems as a transfer', () => {
        const links = graphOf(chain, []).links

        expect(links.map(link => link.transfer)).toEqual([false, true])
    })

    it('leaves a derivation dangling where the version it names is missing', () => {
        const orphan = [version('B', welteT100, 1, 'A')]

        expect(graphOf(orphan, []).links).toHaveLength(0)
    })
})

describe('the room a node takes in its row', () => {
    const siblings = [
        version('C', welteT100, 0),
        version('D1', welteLicensee, 1, 'C'),
        version('D2', welteT98, 1, 'C')
    ]

    it('keeps two captioned siblings clear of each other', () => {
        const { nodes, links } = graphOf(siblings, [])
        const positioned = calculatePositions(nodes, links, 300, 600)

        const [d1, d2] = ['D1', 'D2'].map(id => positioned.find(n => n.id === id)!)
        // as Firefox measures the two captions at font-size 10
        const captionWidth = (node: Node) => node.system!.length * 5.8

        expect(Math.abs(d1.x! - d2.x!))
            .toBeGreaterThan((captionWidth(d1) + captionWidth(d2)) / 2)
    })

    it('takes the radius a node was given over the one its type implies', () => {
        expect(radiusOf({ ...graphOf(siblings, []).nodes[0], radius: 17.5 })).toBe(17.5)
    })
})

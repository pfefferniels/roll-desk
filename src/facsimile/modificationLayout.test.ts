import { describe, expect, it } from 'vitest'
import { mm, track, Writing, Patch } from 'linked-rolls'
import { clustersOf, contentsOf, placeTags, purposeOf, shortened, textsOf } from './modificationLayout'
import { svg } from '../canvas/units'
import { Box } from '../geometry/drawing'

const box = (x: number, y: number, width = 4, height = 4): Box =>
    ({ x: svg(x), y: svg(y), width: svg(width), height: svg(height) })

describe('the clusters an act is outlined in', () => {
    it('joins what lies within the gap, through a chain of neighbours', () => {
        const clusters = clustersOf([box(0, 0), box(10, 0), box(20, 0)], svg(8))

        expect(clusters.map(c => c.members)).toEqual([[0, 1, 2]])
        expect(clusters[0]?.box).toEqual(box(0, 0, 24, 4))
    })

    it('keeps apart a hole in the bass expression from one in the treble', () => {
        const bass = [box(685, 500), box(686, 490), box(685, 480)]
        const treble = box(700, 10)

        const clusters = clustersOf([...bass, treble], svg(24))

        expect(clusters).toHaveLength(2)
        expect(clusters.map(c => c.members.length).sort()).toEqual([1, 3])
    })

    it('joins two clusters that a later box lies between', () => {
        const clusters = clustersOf([box(0, 0), box(20, 0), box(10, 0)], svg(6))

        expect(clusters.map(c => c.members)).toEqual([[0, 1, 2]])
    })

    it('runs from the start of the roll', () => {
        const clusters = clustersOf([box(300, 0), box(10, 0)], svg(8))

        expect(clusters.map(c => c.members)).toEqual([[1], [0]])
    })

    it('has nothing to outline where nothing was drawn', () => {
        expect(clustersOf([], svg(8))).toEqual([])
    })
})

describe('where the tags go', () => {
    const height = svg(16)
    const gap = svg(2)

    it('sits just above the top left corner of what it names', () => {
        expect(placeTags([{ anchor: { x: svg(100), y: svg(200) }, width: svg(60) }], height, gap)
            .map(({ tag }) => tag)).toEqual([box(100, 182, 60, 16)])
    })

    it('rises a row where an earlier tag stands in its place', () => {
        const tags = placeTags([
            { anchor: { x: svg(100), y: svg(200) }, width: svg(60) },
            { anchor: { x: svg(120), y: svg(200) }, width: svg(60) }
        ], height, gap)

        expect(tags.map(({ tag }) => tag.y)).toEqual([182, 164])
    })

    it('leaves a tag that is clear of the others where it is', () => {
        const tags = placeTags([
            { anchor: { x: svg(100), y: svg(200) }, width: svg(60) },
            { anchor: { x: svg(200), y: svg(200) }, width: svg(60) }
        ], height, gap)

        expect(tags.map(({ tag }) => tag.y)).toEqual([182, 182])
    })

    it('goes down instead of above the top of the drawing', () => {
        const tags = placeTags([
            { anchor: { x: svg(0), y: svg(5) }, width: svg(60) },
            { anchor: { x: svg(10), y: svg(5) }, width: svg(60) }
        ], height, gap)

        expect(tags.map(({ tag }) => tag.y)).toEqual([0, 18])
    })
})

describe('what an act is said to be', () => {
    it('is named by its purpose, in words', () => {
        expect(purposeOf({ type: 'Alteration', produced: [], purpose: 'technical-improvement' })).toBe('technical improvement')
    })

    it('is named by its kind where it states no purpose', () => {
        expect(purposeOf({ type: 'Attachment', added: [] })).toBe('attachment')
    })

    it('counts what it brought about by kind', () => {
        expect(contentsOf([{ type: 'HoleChain' }, { type: 'HoleChain' }, { type: 'Writing' }])).toBe('2 hole chains, 1 writing')
        expect(contentsOf([{ type: 'Patch' }])).toBe('1 patch')
    })

    const writing = (text: string): Writing => ({
        id: text,
        type: 'Writing',
        technique: 'stamp',
        transcription: { type: 'text', text } as Writing['transcription'],
        horizontal: { from: mm(0), to: mm(1), unit: 'mm' },
        vertical: { from: track(1), unit: 'track' }
    })

    it('reads the texts it wrote, a patch\'s among them, each on one line', () => {
        const label: Patch = {
            id: 'label',
            type: 'Patch',
            material: 'paper',
            horizontal: { from: mm(0), to: mm(1), unit: 'mm' },
            vertical: { from: track(1), unit: 'track' },
            features: [writing('Träumerei\nR. Schumann')]
        }

        expect(textsOf([writing('Controlliert.'), label])).toEqual(['Controlliert.', 'Träumerei / R. Schumann'])
    })

    it('cuts a long text short', () => {
        expect(shortened('Das Recht der Vervielfältigung', 10)).toBe('Das Recht…')
        expect(shortened('kurz', 10)).toBe('kurz')
    })
})

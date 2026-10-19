import { describe, expect, it } from 'vitest'
import { Edition, Writing } from 'linked-rolls'
import { actorOf, citationOf, comprehendedOf, reasonLabels } from './reasons'
import { fixtureEdition, hole, ids } from './editionFixture'

describe('what a reason is introduced as', () => {
    it('names an inference and an adopted belief, and leaves a plain argument unnamed', () => {
        expect(reasonLabels.inference).toBe('Inference')
        expect(reasonLabels.beliefAdoption).toBe('Adopted from')
        expect(reasonLabels.simpleArgumentation).toBeUndefined()
    })

    it('names a measurement', () => {
        expect(reasonLabels.measurement).toBe('Measurement')
    })
})

describe('who gave a reason', () => {
    it('is the name given, and nobody where the name is blank', () => {
        expect(actorOf({ type: 'simpleArgumentation', actor: { name: 'Lawson', sameAs: [] } })).toBe('Lawson')
        expect(actorOf({ type: 'simpleArgumentation', actor: { name: ' ', sameAs: [] } })).toBeUndefined()
        expect(actorOf({ type: 'simpleArgumentation' })).toBeUndefined()
    })
})

describe('what a reason cites', () => {
    const edition = fixtureEdition()

    it('names a file on the web by the last segment of its path', () => {
        const href = 'https://welte225.org/schmitz-225/trans/report_data.json'
        expect(citationOf(edition, href)).toEqual({ kind: 'web', href, label: 'report_data.json' })
    })

    it('names a version or a copy as a reader calls it', () => {
        expect(citationOf(edition, ids.b)).toEqual({ kind: 'entity', id: ids.b, label: 'r2' })
        expect(citationOf(edition, 'copy')).toEqual({ kind: 'entity', id: 'copy', label: 'Test' })
    })

    it('names anything else by the version it lies on', () => {
        expect(citationOf(edition, ids.note)).toEqual({ kind: 'entity', id: ids.note, label: 'on R1' })
    })

    it('gives back an id the edition lacks as it stands', () => {
        expect(citationOf(edition, 'missing')).toEqual({ kind: 'unknown', label: 'missing' })
    })
})

describe('what a meaning comprehension reads', () => {
    const { horizontal, vertical } = hole('place', 2000, 2010, 80)

    const writing = (id: string, text: string, depiction?: string): Writing => ({
        type: 'Writing',
        id: `${id}-writing`,
        technique: 'handwriting',
        horizontal,
        vertical,
        transcription: { type: 'text', id, text },
        ...(depiction ? { depiction } : {})
    })

    /** The fixture with a date written on its copy, and a label glued on whose title has no picture of its own. */
    const withWritings = (): Edition => {
        const edition = fixtureEdition()
        return {
            ...edition,
            copies: edition.copies.map(copy => ({
                ...copy,
                modifications: [
                    { type: 'Alteration', produced: [writing('date', '225. Fritz. 18 Jan 09.', 'https://example.org/date.jpg')] },
                    {
                        type: 'Attachment',
                        added: [{
                            type: 'Patch',
                            id: 'patch',
                            material: 'paper',
                            horizontal,
                            vertical,
                            depiction: 'https://example.org/patch.jpg',
                            features: [writing('title', 'Träumerei\nR. Schumann')]
                        }]
                    }
                ]
            }))
        }
    }

    const edition = withWritings()

    it('reads a transcription in its words, with the picture of the writing it transcribes', () => {
        expect(comprehendedOf(edition, 'date')).toEqual({ text: '225. Fritz. 18 Jan 09.', depiction: 'https://example.org/date.jpg' })
    })

    it('shows a writing on a patch by the patch where the writing has no picture of its own', () => {
        expect(comprehendedOf(edition, 'title')).toEqual({ text: 'Träumerei\nR. Schumann', depiction: 'https://example.org/patch.jpg' })
    })

    it('reads a text a version inserts in its words, with no picture', () => {
        expect(comprehendedOf(edition, ids.label)).toEqual({ text: 'WM 225', depiction: undefined })
    })

    it('shows a feature by its picture, with no words', () => {
        expect(comprehendedOf(edition, 'date-writing')).toEqual({ text: undefined, depiction: 'https://example.org/date.jpg' })
    })

    it('reads nothing under an id the edition lacks', () => {
        expect(comprehendedOf(edition, 'missing')).toBeUndefined()
    })
})

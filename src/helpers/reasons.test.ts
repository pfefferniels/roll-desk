import { describe, expect, it } from 'vitest'
import { actorOf, citationOf, reasonLabels } from './reasons'
import { fixtureEdition, ids, viewOf } from './editionFixture'

describe('what a reason is introduced as', () => {
    it('names an inference and an adopted belief, and leaves a plain argument unnamed', () => {
        expect(reasonLabels.inference).toBe('Inference')
        expect(reasonLabels.beliefAdoption).toBe('Adopted from')
        expect(reasonLabels.simpleArgumentation).toBeUndefined()
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
    const view = viewOf(fixtureEdition())

    it('names a file on the web by the last segment of its path', () => {
        const href = 'https://welte225.org/schmitz-225/trans/report_data.json'
        expect(citationOf(view, href)).toEqual({ kind: 'web', href, label: 'report_data.json' })
    })

    it('names a version or a copy as a reader calls it', () => {
        expect(citationOf(view, ids.b)).toEqual({ kind: 'entity', id: ids.b, label: 'R2' })
        expect(citationOf(view, 'copy')).toEqual({ kind: 'entity', id: 'copy', label: 'Test' })
    })

    it('names anything else by the version it lies on', () => {
        expect(citationOf(view, ids.note)).toEqual({ kind: 'entity', id: ids.note, label: 'on R1' })
    })

    it('gives back an id the edition lacks as it stands', () => {
        expect(citationOf(view, 'missing')).toEqual({ kind: 'unknown', label: 'missing' })
    })
})

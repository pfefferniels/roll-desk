import { describe, expect, it } from 'vitest'
import { AnyArgumentation, Edition } from 'linked-rolls'
import { appliedBy, inPageOrder, ruleLabel, rulesOf, rulesOnPage } from './rules'

const BASE = 'https://welte225.org/'

const inference = (applies: string[]): AnyArgumentation =>
    ({ type: 'inference', premises: [], applies })

describe('the rules a reason applies', () => {
    it('reads each against the edition\'s address', () => {
        expect(appliedBy(inference(['rules#shared-addition', 'https://example.org/rules#other']), BASE))
            .toEqual(['https://welte225.org/rules#shared-addition', 'https://example.org/rules#other'])
    })

    it('are none for a reason that is no inference', () => {
        expect(appliedBy({ type: 'simpleArgumentation', note: 'by eye' }, BASE)).toEqual([])
    })
})

describe('the rules an edition applies', () => {
    it('are collected from every inference, once each, in the order first named', () => {
        const belief = (applies: string[]) => ({ '@annotation': { belief: { type: 'belief', certainty: 'likely', reasons: [inference(applies)] } } })
        const edition = {
            base: BASE,
            versions: [{ basedOn: [belief(['rules#shared-addition'])] }],
            copies: [{ production: { date: belief(['rules#system-terminus', 'rules#shared-addition']) } }]
        } as unknown as Edition

        expect(rulesOf(edition)).toEqual([
            'https://welte225.org/rules#shared-addition',
            'https://welte225.org/rules#system-terminus'
        ])
    })
})

describe('the rules a page states', () => {
    const page = `<!doctype html><html><head>
        <script type="application/ld+json">
        {
          "@context": {
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
            "crm": "http://www.cidoc-crm.org/cidoc-crm/",
            "@base": "https://welte225.org/rules",
            "name": "rdfs:label",
            "text": "crm:P190_has_symbolic_content"
          },
          "@graph": [
            { "@id": "#shared-addition", "name": "Gemeinsame Hinzufügung", "text": "Ausschließlich wenn …" },
            { "@id": "#refinement", "rdfs:label": { "@value": "Verfeinerung", "@language": "de" } }
          ]
        }
        </script></head><body></body></html>`

    it('names each rule by the label the page gives it and states its text', () => {
        const rules = rulesOnPage(page, 'https://welte225.org/rules')
        expect(rules.get('https://welte225.org/rules#shared-addition')).toEqual({ name: 'Gemeinsame Hinzufügung', text: 'Ausschließlich wenn …', order: 0 })
        expect(rules.get('https://welte225.org/rules#refinement')).toEqual({ name: 'Verfeinerung', text: undefined, order: 1 })
    })

    it('states nothing where the page carries no JSON-LD', () => {
        expect(rulesOnPage('<html><body>Not found</body></html>', 'https://welte225.org/rules').size).toBe(0)
    })
})

describe('what a rule is called', () => {
    it('is its name, or else the fragment of its IRI', () => {
        expect(ruleLabel({ iri: 'https://welte225.org/rules#refinement', name: 'Verfeinerung' })).toBe('Verfeinerung')
        expect(ruleLabel({ iri: 'https://welte225.org/rules#refinement' })).toBe('refinement')
    })
})

describe('the rules in the order of their page', () => {
    it('puts those the page states first, in its order, and those not read after them', () => {
        const rules = [
            { iri: 'https://welte225.org/rules#c' },
            { iri: 'https://welte225.org/rules#b', order: 1 },
            { iri: 'https://welte225.org/rules#a', order: 0 }
        ]
        expect(inPageOrder(rules).map(rule => rule.iri.split('#')[1])).toEqual(['a', 'b', 'c'])
    })
})

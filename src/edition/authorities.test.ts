import { describe, expect, it } from 'vitest'
import { recordAt, recordLabel, recordsOf } from './authorities'

describe('where an authority record is kept', () => {
    it('knows the authorities by the shape of their URIs', () => {
        expect(recordAt('https://d-nb.info/gnd/116888652')).toEqual({ keeper: 'GND', id: '116888652' })
        expect(recordAt('https://d-nb.info/gnd/1229956-X')).toEqual({ keeper: 'GND', id: '1229956-X' })
        expect(recordAt('http://www.wikidata.org/entity/Q78657')).toEqual({ keeper: 'Wikidata', id: 'Q78657' })
        expect(recordAt('https://www.wikidata.org/wiki/Q1741')).toEqual({ keeper: 'Wikidata', id: 'Q1741' })
        expect(recordAt('https://sws.geonames.org/2761369/')).toEqual({ keeper: 'GeoNames', id: '2761369' })
        expect(recordAt('http://id.loc.gov/authorities/names/no99039210')).toEqual({ keeper: 'LCNAF', id: 'no99039210' })
        expect(recordAt('https://orcid.org/0000-0002-6210-7255')).toEqual({ keeper: 'ORCID', id: '0000-0002-6210-7255' })
    })

    it('names a page no authority keeps by its host', () => {
        expect(recordAt('https://nettheim.com/')).toEqual({ keeper: 'nettheim.com' })
        expect(recordAt('https://www.example.org/people/1')).toEqual({ keeper: 'example.org' })
    })

    it('gives what is no address as it stands', () => {
        expect(recordAt('GND 116888652')).toEqual({ keeper: 'GND 116888652' })
    })
})

describe('what an authority record is called', () => {
    it('names the authority and the number', () => {
        expect(recordLabel('https://d-nb.info/gnd/300145322')).toBe('GND 300145322')
    })

    it('falls back on the URI', () => {
        expect(recordLabel('https://nettheim.com/')).toBe('https://nettheim.com/')
    })
})

describe('the records of a name', () => {
    it('leaves out those written blank', () => {
        expect(recordsOf({ name: 'Grünfeld, Alfred', sameAs: ['', ' https://d-nb.info/gnd/116888652 '] }))
            .toEqual(['https://d-nb.info/gnd/116888652'])
    })
})

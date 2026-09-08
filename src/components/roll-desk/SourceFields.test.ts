import { describe, expect, it } from 'vitest'
import { assignValue, valueOf } from 'linked-rolls'
import { featureSourceOf, noSource, sourceInputOf } from './SourceFields'

describe('reading a source from what was typed', () => {
    it('states none while no kind is named', () => {
        expect(featureSourceOf(noSource)).toBeUndefined()
        expect(featureSourceOf({ ...noSource, note: 'a note without a kind' })).toBeUndefined()
    })

    it('leaves out what was left empty', () => {
        expect(featureSourceOf({ ...noSource, kind: 'scan' })).toEqual({ kind: 'scan' })
    })

    it('takes the fields that were filled in', () => {
        const source = featureSourceOf({
            kind: 'emulation',
            output: ' https://example.org/wm225.mid ',
            device: ' Kodak i5850 ',
            date: new Date(2015, 0, 1),
            note: ' the emulator is not named '
        })

        expect(source).toEqual({
            kind: 'emulation',
            output: 'https://example.org/wm225.mid',
            device: { name: 'Kodak i5850', sameAs: [] },
            date: assignValue(new Date(2015, 0, 1)),
            note: 'the emulator is not named'
        })
    })

    it('drops a field holding nothing but spaces', () => {
        expect(featureSourceOf({ ...noSource, kind: 'scan', device: '   ', note: '  ' }))
            .toEqual({ kind: 'scan' })
    })
})

describe('showing a source that was stated', () => {
    it('shows an empty form where none was stated', () => {
        expect(sourceInputOf(undefined)).toEqual(noSource)
    })

    it('round-trips a source through the form', () => {
        const source = {
            kind: 'analysis' as const,
            output: 'https://example.org/wm225.txt',
            device: { name: 'a scanner', sameAs: [] },
            date: assignValue(new Date(2019, 5, 1)),
            note: 'measured by somebody else'
        }

        const input = sourceInputOf(source)
        expect(input.kind).toBe('analysis')
        expect(input.device).toBe('a scanner')
        expect(input.date).toEqual(valueOf(source.date))
        expect(featureSourceOf(input)).toEqual(source)
    })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { spotlight } from './spotlight'

/** Just enough of a drawn symbol: the attributes a spotlight paints over. */
const drawing = (attributes: Record<string, string>) => {
    const worn = new Map(Object.entries(attributes))
    return {
        worn,
        querySelector: () => null,
        scrollIntoView: () => { },
        getAttribute: (name: string) => worn.get(name) ?? null,
        setAttribute: (name: string, value: string) => { worn.set(name, value) },
        removeAttribute: (name: string) => { worn.delete(name) }
    }
}

const showAs = (id: string, drawn: ReturnType<typeof drawing>) =>
    vi.stubGlobal('document', { getElementById: (asked: string) => asked === id ? drawn : null })

const symbol = { fill: 'white', stroke: 'black', 'stroke-width': '0.4' }

describe('spotlighting a symbol', () => {
    beforeEach(() => vi.useFakeTimers())

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('reports nothing drawn for the id', () => {
        showAs('note', drawing(symbol))

        expect(spotlight('elsewhere', 100)).toBe(false)
    })

    it('marks the symbol and puts back what it wore', () => {
        const drawn = drawing(symbol)
        showAs('note', drawn)

        expect(spotlight('note', 100)).toBe(true)
        expect(drawn.worn.get('fill')).toEqual('orange')

        vi.advanceTimersByTime(100)
        expect(Object.fromEntries(drawn.worn)).toEqual(symbol)
    })

    it('keeps the first reading when a second spotlight overlaps it', () => {
        const drawn = drawing(symbol)
        showAs('note', drawn)

        spotlight('note', 100)
        vi.advanceTimersByTime(50)
        spotlight('note', 100)

        vi.advanceTimersByTime(50)
        expect(drawn.worn.get('fill')).toEqual('orange')

        vi.advanceTimersByTime(50)
        expect(Object.fromEntries(drawn.worn)).toEqual(symbol)
    })

    it('leaves off the attributes the symbol did not carry', () => {
        const drawn = drawing({ fill: 'white' })
        showAs('note', drawn)

        spotlight('note', 100)
        vi.advanceTimersByTime(100)

        expect(Object.fromEntries(drawn.worn)).toEqual({ fill: 'white' })
    })
})

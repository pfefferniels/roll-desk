import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { spotlight } from './spotlight'

/** Just enough of a drawn shape: the attributes a spotlight paints over. */
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

type Drawn = ReturnType<typeof drawing>

/** A document in which the given ids are drawn, an id possibly by several shapes. */
const showing = (drawn: Record<string, Drawn[]>) =>
    vi.stubGlobal('document', {
        querySelectorAll: (selector: string) =>
            Object.entries(drawn)
                .filter(([id]) => selector.includes(`"${id}"`))
                .flatMap(([, shapes]) => shapes)
    })

const symbol = { fill: 'white', stroke: 'black', 'stroke-width': '0.4' }

describe('spotlighting an entity', () => {
    beforeEach(() => vi.useFakeTimers())

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('reports nothing drawn for the id', () => {
        showing({ note: [drawing(symbol)] })

        expect(spotlight('elsewhere', 100)).toBe(false)
    })

    it('marks the shape and puts back what it wore', () => {
        const drawn = drawing(symbol)
        showing({ note: [drawn] })

        expect(spotlight('note', 100)).toBe(true)
        expect(drawn.worn.get('fill')).toEqual('orange')

        vi.advanceTimersByTime(100)
        expect(Object.fromEntries(drawn.worn)).toEqual(symbol)
    })

    it('marks every shape the entity is drawn by', () => {
        const hulls = [drawing({ fill: 'gray' }), drawing({ fill: 'gray' })]
        showing({ 'chord-shading': hulls })

        expect(spotlight('chord-shading', 100)).toBe(true)
        expect(hulls.map(hull => hull.worn.get('fill'))).toEqual(['orange', 'orange'])

        vi.advanceTimersByTime(100)
        expect(hulls.map(hull => hull.worn.get('fill'))).toEqual(['gray', 'gray'])
    })

    it('keeps the first reading when a second spotlight overlaps it', () => {
        const drawn = drawing(symbol)
        showing({ note: [drawn] })

        spotlight('note', 100)
        vi.advanceTimersByTime(50)
        spotlight('note', 100)

        vi.advanceTimersByTime(50)
        expect(drawn.worn.get('fill')).toEqual('orange')

        vi.advanceTimersByTime(50)
        expect(Object.fromEntries(drawn.worn)).toEqual(symbol)
    })

    it('leaves off the attributes the shape did not carry', () => {
        const drawn = drawing({ fill: 'white' })
        showing({ note: [drawn] })

        spotlight('note', 100)
        vi.advanceTimersByTime(100)

        expect(Object.fromEntries(drawn.worn)).toEqual({ fill: 'white' })
    })
})

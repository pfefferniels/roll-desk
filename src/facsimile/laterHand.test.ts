import { describe, expect, it } from 'vitest'
import {
    apart, black, contrastingColour, contrastRatio, handOn, hexOf, inkOn, nearerOf, oklabOf, paperAmong, rgbOf,
    showingThrough, spokenFor, white
} from './laterHand'

/** The paper of the copies of WM 225, as their scans show it. */
const papers = {
    'red Welte, Stanford': rgbOf('#5b2e23'),
    'red Welte, darker': rgbOf('#572013'),
    'a dark grey scan': rgbOf('#515151'),
    'a light grey scan': rgbOf('#aaaaaa'),
    'no scan': white
}

describe('the colour a later hand is drawn in', () => {
    it.each(Object.entries(papers))('stands out from the ground on %s', (_, ground) => {
        expect(contrastRatio(contrastingColour(ground), ground)).toBeGreaterThanOrEqual(3)
    })

    it.each(Object.entries(papers))('is not taken for a colour the desk speaks with, on %s', (_, ground) => {
        const colour = contrastingColour(ground)
        for (const other of spokenFor) expect(apart(colour, other)).toBeGreaterThan(0.15)
    })

    it('is light on the brown of a red roll', () => {
        expect(oklabOf(contrastingColour(papers['red Welte, Stanford'])).L).toBeGreaterThan(0.8)
    })

    it('is darker on white', () => {
        expect(oklabOf(contrastingColour(white)).L).toBeLessThan(0.7)
    })

    it('follows the scan as it fades', () => {
        const paper = papers['red Welte, Stanford']
        expect(showingThrough(paper, 1)).toEqual(paper)
        expect(showingThrough(paper, 0)).toEqual(white)
        expect(hexOf(contrastingColour(showingThrough(paper, 0)))).toBe(hexOf(contrastingColour(white)))
    })
})

describe('the ink set on that colour', () => {
    it('is black on a light colour and white on a dark one', () => {
        expect(inkOn(rgbOf('#e7e824'))).toEqual(black)
        expect(inkOn(rgbOf('#7d0563'))).toEqual(white)
    })

    it('reads on the colour it is set on', () => {
        for (const ground of Object.values(papers)) {
            const hand = handOn(ground)
            expect(contrastRatio(rgbOf(hand.ink), rgbOf(hand.colour))).toBeGreaterThanOrEqual(4.5)
        }
    })
})

describe('the edge round its lines and letters', () => {
    it('is of the ground\'s side, dark on a red roll and light on white or light grey', () => {
        expect(nearerOf(papers['red Welte, Stanford'])).toEqual(black)
        expect(nearerOf(papers['a dark grey scan'])).toEqual(black)
        expect(nearerOf(papers['a light grey scan'])).toEqual(white)
        expect(nearerOf(white)).toEqual(white)
    })

    it('stands out from the colour it edges', () => {
        for (const ground of Object.values(papers)) {
            const hand = handOn(ground)
            expect(contrastRatio(rgbOf(hand.halo), rgbOf(hand.colour))).toBeGreaterThanOrEqual(3)
        }
    })
})

describe('the paper among the pixels of a scan', () => {
    const pixels = (...colours: [string, number][]) =>
        colours.flatMap(([hex, count]) => {
            const { r, g, b } = rgbOf(hex)
            return Array.from({ length: count }, () => [r, g, b, 255]).flat()
        })

    it('leaves out the holes, light or dark', () => {
        const paper = paperAmong(pixels(['#5b2e23', 60], ['#ffffff', 20], ['#000000', 20]))
        expect(paper && hexOf(paper)).toBe('#5b2e23')
    })

    it('is nothing where there are no pixels', () => {
        expect(paperAmong([])).toBeUndefined()
    })
})

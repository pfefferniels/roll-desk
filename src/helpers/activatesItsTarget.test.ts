import { describe, expect, it } from 'vitest'
import { activatesItsTarget } from './activatesItsTarget'

/** Just enough of a keystroke: the key it carries and the element it goes to. */
const keystroke = (key: string, target: unknown) => ({ key, target } as KeyboardEvent)

/** An element answering to the selectors it stands for, as `matches` reads a list. */
const elementMatching = (...stoodFor: string[]) => ({
    matches: (list: string) =>
        list.split(',').map(one => one.trim()).some(one => stoodFor.includes(one))
})

describe('a keystroke activating what it goes to', () => {
    it('is seen on a button, which takes Space as its activation key', () => {
        expect(activatesItsTarget(keystroke(' ', elementMatching('button')))).toBe(true)
    })

    it('is seen on what only wears the button role', () => {
        expect(activatesItsTarget(keystroke(' ', elementMatching('[role="button"]')))).toBe(true)
    })

    it('is not seen on a link, which Space scrolls rather than follows', () => {
        expect(activatesItsTarget(keystroke(' ', elementMatching('a[href]')))).toBe(false)
        expect(activatesItsTarget(keystroke('Enter', elementMatching('a[href]')))).toBe(true)
    })

    it('is not seen for a letter, which no control claims', () => {
        expect(activatesItsTarget(keystroke('m', elementMatching('button')))).toBe(false)
    })

    it('is not seen where the focus stands on nothing that takes a key', () => {
        expect(activatesItsTarget(keystroke(' ', elementMatching('div')))).toBe(false)
    })

    it('is not asked of a target with nothing to match against', () => {
        expect(activatesItsTarget(keystroke(' ', {}))).toBe(false)
        expect(activatesItsTarget(keystroke(' ', null))).toBe(false)
    })
})

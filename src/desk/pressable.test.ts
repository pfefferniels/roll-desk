import { describe, expect, it } from 'vitest'
import { pressable, pressesAButton } from './pressable'

/** Just enough of a keystroke for the handler: its key, and whether its default was prevented. */
const keystroke = (key: string) => {
    const event = { key, defaultPrevented: false, preventDefault: () => { event.defaultPrevented = true } }
    return event
}

describe('the keys that press a button', () => {
    it('are Enter and Space', () => {
        expect(pressesAButton('Enter')).toBe(true)
        expect(pressesAButton(' ')).toBe(true)
    })

    it('are not a letter, an arrow or Escape', () => {
        expect(pressesAButton('m')).toBe(false)
        expect(pressesAButton('ArrowRight')).toBe(false)
        expect(pressesAButton('Escape')).toBe(false)
    })
})

describe('a shape made a button', () => {
    it('is reached by Tab and read out as a button', () => {
        const { role, tabIndex } = pressable(() => undefined)

        expect(role).toBe('button')
        expect(tabIndex).toBe(0)
    })

    it('is pressed by a click as by Enter and Space', () => {
        let presses = 0
        const button = pressable(() => presses++)

        button.onClick()
        for (const key of ['Enter', ' ']) button.onKeyDown(keystroke(key) as never)

        expect(presses).toBe(3)
    })

    it('keeps Space from scrolling the page', () => {
        const space = keystroke(' ')
        pressable(() => undefined).onKeyDown(space as never)

        expect(space.defaultPrevented).toBe(true)
    })

    it('leaves every other key to the page', () => {
        let presses = 0
        const arrow = keystroke('ArrowDown')
        pressable(() => presses++).onKeyDown(arrow as never)

        expect(presses).toBe(0)
        expect(arrow.defaultPrevented).toBe(false)
    })
})

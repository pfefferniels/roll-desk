import { describe, expect, it } from 'vitest'
import { keyZoomFactor } from './zoom'

/** A keystroke of the key given, with whichever modifiers are held. */
const press = (key: string, held: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) =>
    ({ key, ctrlKey: false, metaKey: false, altKey: false, ...held })

describe('zooming the roll by keys', () => {
    it('stretches it by + and by =, which carries + where it takes the shift key', () => {
        expect(keyZoomFactor(press('+'))).toBeGreaterThan(1)
        expect(keyZoomFactor(press('='))).toBe(keyZoomFactor(press('+')))
    })

    it('shrinks it by - as far as + stretches it', () => {
        expect(keyZoomFactor(press('-'))! * keyZoomFactor(press('+'))!).toBeCloseTo(1)
    })

    it('leaves the keys to the browser where Control, Command or Alt is held', () => {
        expect(keyZoomFactor(press('+', { ctrlKey: true }))).toBeUndefined()
        expect(keyZoomFactor(press('-', { metaKey: true }))).toBeUndefined()
        expect(keyZoomFactor(press('+', { altKey: true }))).toBeUndefined()
    })

    it('does nothing for any other key', () => {
        expect(keyZoomFactor(press('ArrowRight'))).toBeUndefined()
        expect(keyZoomFactor(press('0'))).toBeUndefined()
    })
})

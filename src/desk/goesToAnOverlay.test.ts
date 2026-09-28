import { modalClasses } from '@mui/material/Modal'
import { describe, expect, it } from 'vitest'
import { goesToAnOverlay } from './goesToAnOverlay'

/** Just enough of a keystroke: the element it is going to. */
const keystrokeOn = (target: unknown) => ({ target } as KeyboardEvent)

/** An element sitting under the given ancestor classes, as `closest` reads them. */
const elementUnder = (classNames: string[]) => ({
    closest: (selector: string) =>
        classNames.some(className => selector === `.${className}`) ? {} : null
})

describe('a keystroke going to an overlay', () => {
    it('is not seen where nothing stands over the desk', () => {
        expect(goesToAnOverlay(keystrokeOn(elementUnder([])))).toBe(false)
    })

    it('is seen under the modal root MUI portals its overlays into', () => {
        expect(goesToAnOverlay(keystrokeOn(elementUnder([modalClasses.root])))).toBe(true)
    })

    it('is not read into a popper, which leaves focus where it was', () => {
        expect(goesToAnOverlay(keystrokeOn(elementUnder(['MuiPopper-root'])))).toBe(false)
    })

    it('is not looked for on a target with no ancestors to walk', () => {
        expect(goesToAnOverlay(keystrokeOn({}))).toBe(false)
        expect(goesToAnOverlay(keystrokeOn(null))).toBe(false)
    })
})

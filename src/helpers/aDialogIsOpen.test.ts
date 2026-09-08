import { afterEach, describe, expect, it, vi } from 'vitest'
import { aDialogIsOpen } from './aDialogIsOpen'

/** A document holding one portalled element per given ARIA role. */
const documentHolding = (roles: string[]) =>
    vi.stubGlobal('document', {
        querySelector: (selector: string) =>
            roles.some(role => selector === `[role="${role}"]`) ? {} : null
    })

afterEach(() => vi.unstubAllGlobals())

describe('a dialog standing open over the desk', () => {
    it('is not found where nothing is portalled in', () => {
        documentHolding([])
        expect(aDialogIsOpen()).toBe(false)
    })

    it('is found by the role MUI gives it', () => {
        documentHolding(['dialog'])
        expect(aDialogIsOpen()).toBe(true)
    })

    it('is not read into the menus and popovers beside it', () => {
        documentHolding(['menu', 'presentation'])
        expect(aDialogIsOpen()).toBe(false)
    })
})

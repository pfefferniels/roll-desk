import { describe, expect, it } from 'vitest'
import { systemOf, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { emulationOf, systemFor } from './reproducingSystems'

describe('the machine a version is performed on', () => {
    it('finds the system a version is coded for', () => {
        expect(systemFor(systemOf(welteT100))?.trackerBar.id).toBe(welteT100.id)
    })

    it('finds the green Welte and the Licensee as well', () => {
        expect(systemFor(systemOf(welteT98))?.trackerBar.id).toBe(welteT98.id)
        expect(systemFor(systemOf(welteLicensee))?.trackerBar.id).toBe(welteLicensee.id)
    })

    /**
     * The desk must still cope with a system it has no machine for
     * rather than fall back to the T-100, which would perform a green
     * roll on a red machine.
     */
    it('finds none for a system it has no machine for', () => {
        expect(systemFor(undefined)).toBeUndefined()
        expect(systemFor({ id: 'https://example.org/system/duo-art', name: 'Duo-Art', sameAs: [] }))
            .toBeUndefined()
    })

    it('yields no emulation rather than throwing, so the version still draws', () => {
        const foreign = { id: 'https://example.org/system/duo-art', name: 'Duo-Art', sameAs: [] }
        expect(() => emulationOf(foreign)).not.toThrow()
        expect(emulationOf(foreign)).toBeUndefined()
        expect(emulationOf(systemOf(welteT100))).toBeDefined()
        expect(emulationOf(systemOf(welteT98))).toBeDefined()
    })

    /**
     * Each machine performs on its own bar. Playing a green version on
     * the red machine would be a silent semitone and a wrong keyboard
     * division, which is the whole reason the registry exists.
     */
    it('keeps each machine to its own bar', () => {
        expect(emulationOf(systemOf(welteT98))?.system.trackerBar.trackCount).toBe(98)
        expect(emulationOf(systemOf(welteT100))?.system.trackerBar.trackCount).toBe(100)
    })

    it('keeps each system to its own settings', () => {
        const options = { [welteT100.id]: { velocity: { piano: 1, mezzoforte: 2, forte: 3 } } }
        expect(emulationOf(systemOf(welteT100), options)?.options.velocity.piano).toBe(1)
    })
})

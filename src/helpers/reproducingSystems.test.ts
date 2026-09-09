import { describe, expect, it } from 'vitest'
import { systemOf, welteLicensee, welteT100, welteT98 } from 'linked-rolls'
import { emulationOf, systemFor } from './reproducingSystems'

describe('the machine a version is performed on', () => {
    it('finds the system a version is coded for', () => {
        expect(systemFor(systemOf(welteT100))?.trackerBar.id).toBe(welteT100.id)
    })

    /**
     * The green Welte and the Licensee have bars but no emulator here
     * yet, so a version coded for either is drawn and not performed.
     * The desk must cope with that rather than fall back to the T-100,
     * which would perform a green roll on a red machine.
     */
    it('finds none where the desk has no machine for the system', () => {
        expect(systemFor(systemOf(welteT98))).toBeUndefined()
        expect(systemFor(systemOf(welteLicensee))).toBeUndefined()
        expect(systemFor(undefined)).toBeUndefined()
    })

    it('yields no emulation rather than throwing, so the version still draws', () => {
        expect(() => emulationOf(systemOf(welteT98))).not.toThrow()
        expect(emulationOf(systemOf(welteT98))).toBeUndefined()
        expect(emulationOf(systemOf(welteT100))).toBeDefined()
    })

    it('keeps each system to its own settings', () => {
        const options = { [welteT100.id]: { velocity: { piano: 1, mezzoforte: 2, forte: 3 } } }
        expect(emulationOf(systemOf(welteT100), options)?.options.velocity.piano).toBe(1)
    })
})

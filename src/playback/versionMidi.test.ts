import { describe, expect, it } from 'vitest'
import { read } from 'midifile-ts'
import type { Edition, Version } from 'linked-rolls'
import { fixtureEdition, ids } from '../edition/editionFixture'
import { versionAsMidi } from './versionMidi'

const texts = (midi: Uint8Array | undefined): string[] =>
    midi
        ? read(midi).tracks.flat().flatMap(event =>
            event.type === 'meta' && event.subtype === 'text' ? [event.text] : [])
        : []

/** Version A, which holds every symbol of the fixture. */
const versionA = (edition: Edition): Version => {
    const version = edition.versions.find(version => version.id === ids.a)
    if (!version) throw new Error('the fixture has no version A')
    return version
}

describe('a version as MIDI', () => {
    /**
     * MPM Desk keeps the text before a note as the `@corresp` of the
     * `<when>` it imports it into, so a bare id there would be read
     * against the transcription's address rather than the edition's.
     */
    it('names each symbol it performs, and the version, by the IRI the edition gives it', () => {
        const edition = { ...fixtureEdition(), base: 'https://example.org/wm225/' }
        const written = texts(versionAsMidi(versionA(edition), edition))

        expect(written).toContain('https://example.org/wm225/A')
        expect(written).toContain(`https://example.org/wm225/${ids.note}`)
        expect(written).toContain(`https://example.org/wm225/${ids.otherNote}`)
        expect(written).not.toContain(ids.note)
    })

    it('leaves what is no id of the edition as it is', () => {
        const edition = { ...fixtureEdition(), base: 'https://example.org/wm225/' }
        const [system] = texts(versionAsMidi(versionA(edition), edition))

        expect(system).toMatch(/^linked-rolls \(/)
    })

    it('keeps the ids where the edition has no base to read them against', () => {
        const edition = fixtureEdition()
        const written = texts(versionAsMidi(versionA(edition), edition))

        expect(written).toContain('A')
        expect(written).toContain(ids.note)
    })
})

import { siglaOf, Version, Edition, idsIn } from "linked-rolls"
import { AnyEvent, write } from "midifile-ts"
import { zipSync } from "fflate"
import { emulationOf, EmulationOptions } from "./reproducingSystems"
import { pathOf, referenceOf } from "../edition/addresses"

/**
 * The texts of a performed file as references. The emulation labels every
 * note and pedal step with the id of the symbol it performs, and names the
 * version it plays by its id; read outside the edition, an id names
 * nothing. Each is written as the IRI the edition gives it, so that what
 * reads the file, MPM Desk among them, can follow a note back to the
 * symbol. A text that is no id of the edition, as the system's name and
 * the options are not, stays as it is, and so does every text where the
 * edition has no base to read an id against.
 */
const withIris = (track: AnyEvent[], edition: Edition): AnyEvent[] => {
    if (!URL.canParse(edition.base)) return track

    const ids = new Set(idsIn(edition))
    return track.map(event =>
        event.type === 'meta' && event.subtype === 'text' && ids.has(event.text)
            ? { ...event, text: referenceOf(pathOf(event.text), edition.base) }
            : event
    )
}

/**
 * The version performed on the machine it was coded for, as MIDI, or
 * nothing where the desk has no machine for its system.
 */
export const versionAsMidi = (
    version: Version,
    edition: Edition,
    options?: EmulationOptions
): Uint8Array | undefined => {
    const emulation = emulationOf(version.system, options)
    if (!emulation) return undefined

    emulation.emulateVersion(version, edition)

    const { tracks, header } = emulation.asMIDI()
    return write(tracks.map(track => withIris(track, edition)), header.ticksPerBeat)
}

const fileNameOf = (siglum: string) => `${siglum.replace(/[^\w.-]+/g, '_')}.mid`

/** Every version the desk can perform, each on its own machine. */
export const versionsAsMidiArchive = (
    versions: Version[],
    edition: Edition,
    options?: EmulationOptions
): Uint8Array => {
    const sigla = siglaOf(edition)

    return zipSync(Object.fromEntries(
        versions.flatMap(version => {
            const midi = versionAsMidi(version, edition, options)
            return midi ? [[fileNameOf(sigla.get(version.id) ?? version.id), midi] as const] : []
        })
    ))
}

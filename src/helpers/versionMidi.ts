import { EditionView, siglaOf, Version } from "linked-rolls"
import { write } from "midifile-ts"
import { zipSync } from "fflate"
import { emulationOf, EmulationOptions } from "./reproducingSystems"

/**
 * The version performed on the machine it was coded for, as MIDI, or
 * nothing where the desk has no machine for its system.
 */
export const versionAsMidi = (
    version: Version,
    view: EditionView,
    options?: EmulationOptions
): Uint8Array | undefined => {
    const emulation = emulationOf(version.system, options)
    if (!emulation) return undefined

    emulation.emulateVersion(version, view)

    const { tracks, header } = emulation.asMIDI()
    return write(tracks, header.ticksPerBeat)
}

const fileNameOf = (version: Version, among: Version[]) => {
    const sigla = siglaOf({ versions: among })
    const siglum = sigla.get(version.id) ?? version.id
    return `${siglum.replace(/[^\w.-]+/g, '_')}.mid`
}

/** Every version the desk can perform, each on its own machine. */
export const versionsAsMidiArchive = (
    versions: Version[],
    view: EditionView,
    options?: EmulationOptions
): Uint8Array =>
    zipSync(Object.fromEntries(
        versions.flatMap(version => {
            const midi = versionAsMidi(version, view, options)
            return midi ? [[fileNameOf(version, versions), midi] as const] : []
        })
    ))

import { EditionView, Emulation, Version } from "linked-rolls"
import { welteT100System, WelteT100Options } from "linked-rolls/welte-t100"
import { write } from "midifile-ts"
import { zipSync } from "fflate"

export const versionAsMidi = (
    version: Version,
    view: EditionView,
    options?: WelteT100Options
): Uint8Array => {
    const emulation = new Emulation(welteT100System, options)
    emulation.emulateVersion(version, view)

    const { tracks, header } = emulation.asMIDI()
    return write(tracks, header.ticksPerBeat)
}

const fileNameOf = (version: Version, among: Version[]) => {
    const base = version.siglum.trim().replace(/[^\w.-]+/g, '_') || version.id
    const homonyms = among.filter(other => other.siglum === version.siglum)

    return homonyms.length > 1
        ? `${base}_${homonyms.indexOf(version) + 1}.mid`
        : `${base}.mid`
}

export const versionsAsMidiArchive = (
    versions: Version[],
    view: EditionView,
    options?: WelteT100Options
): Uint8Array =>
    zipSync(Object.fromEntries(
        versions.map(version => [
            fileNameOf(version, versions),
            versionAsMidi(version, view, options)
        ])
    ))

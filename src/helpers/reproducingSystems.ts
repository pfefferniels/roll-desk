import { Concept, Emulation, ReproducingSystem, systemIdOf } from 'linked-rolls'
import { VelocityMap, welteT100System } from 'linked-rolls/welte-t100'

/**
 * What the desk needs of any system's settings. The velocity map is
 * shared by both Welte scales on purpose, so that a red reading and a
 * green one can be compared at all, and it is the one part of the
 * settings the drawing reads.
 */
export type SharedOptions = { velocity: VelocityMap }

/**
 * The systems the desk can perform a version on.
 *
 * The library reaches each one through a subpath of its own, the
 * emulator being an optional peer dependency, so the list of them is
 * the application's rather than the library's. A version names its
 * system and this says which machine plays it.
 */
const systems: ReproducingSystem<SharedOptions>[] = [welteT100System]

/** The system a version is coded for, or nothing where the desk has no machine for it. */
export const systemFor = (system: Concept | undefined): ReproducingSystem<SharedOptions> | undefined => {
    const id = systemIdOf(system)
    return systems.find(known => known.trackerBar.id === id)
}

/**
 * The emulation settings, one set per system: they differ in shape from
 * one to the next, and moving between a red version and a green one
 * must not carry either one's settings into the other.
 */
export type EmulationOptions = Readonly<Record<string, SharedOptions>>

export const optionsFor = (
    options: EmulationOptions | undefined,
    system: ReproducingSystem<SharedOptions>
): SharedOptions | undefined => options?.[system.trackerBar.id]

/**
 * A version performed on the machine it was coded for, or nothing where
 * the desk has none. A Licensee version is the case today: its bar is
 * known and no emulator has been fitted to that instrument.
 */
export const emulationOf = (
    versionSystem: Concept | undefined,
    options?: EmulationOptions
): Emulation<SharedOptions> | undefined => {
    const system = systemFor(versionSystem)
    return system && new Emulation(system, optionsFor(options, system))
}

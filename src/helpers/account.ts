import {
    AnySymbol, certainties, derivationsOf, Edit, EditionView, editsOf, idOf, isPerforation, principalDerivationOf,
    Reservation, reservationsAbout, reservationsAboutVersion, RollCopy, Version, VersionReservationType,
    versionsWitnessedBy, Witness, witnessesOf
} from "linked-rolls"
import { describePerforation } from "./constraints"

/** A derivation as a reader is told of it, and whether the version's text is read against it. */
export type DerivationLine = ReturnType<typeof derivationsOf>[number] & { principal: boolean }

/** A witness that reaches its version only through a later one, which it names. */
export type IndirectWitness = Witness & { through: string }

const isIndirect = (witness: Witness): witness is IndirectWitness => witness.through !== undefined

/** What is written out about a version for a reader. */
export interface VersionAccount {
    version: Version
    /** The derivation the text is read against first, then the hypotheses. */
    derivations: DerivationLine[]
    /** The copies speaking for the version at first hand, and the statements made of it. */
    witnesses: Witness[]
    /** The copies reaching it only through a version derived from it. */
    indirect: IndirectWitness[]
    /** The version's edits that carry a belief. */
    arguedEdits: Edit[]
    reservations: Reservation<VersionReservationType>[]
}

/** The account of the version under the id, or nothing where the id names no version. */
export const versionAccount = (view: EditionView, versionId: string): VersionAccount | undefined => {
    const version = view.get<Version>(versionId)
    if (version?.type !== 'Version') return undefined

    const principal = principalDerivationOf(version)
    const readAgainst = principal && idOf(principal)
    const witnesses = witnessesOf(view, versionId)

    return {
        version,
        derivations: derivationsOf(version)
            .map(derivation => ({ ...derivation, principal: derivation.parent === readAgainst }))
            .sort((a, b) => Number(b.principal) - Number(a.principal)),
        witnesses: witnesses.filter(witness => !isIndirect(witness)),
        indirect: witnesses.filter(isIndirect),
        arguedEdits: editsOf(version).filter(edit => edit['@annotation'] !== undefined),
        reservations: reservationsAboutVersion(view, version)
    }
}

/** A version a copy bears witness to, and how. */
export type Carriage = ReturnType<typeof versionsWitnessedBy>[number]

/** What is written out about a copy for a reader. */
export interface CopyAccount {
    copy: RollCopy
    /**
     * What its perforations carry at first hand first, then what they
     * carry through a later version, then what it is stated to carry,
     * the most certain first.
     */
    carriages: Carriage[]
    reservations: Reservation[]
}

const rankOf = (carriage: Carriage): number =>
    carriage.by === 'carriers'
        ? (isIndirect(carriage) ? -1 : -2)
        : certainties.indexOf(carriage.certainty ?? 'true')

/** How far back a carriage reaches, so that the indirect ones read up the stemma from the nearest. */
const reachOf = (view: EditionView, carriage: Carriage): number =>
    isIndirect(carriage) ? -view.lineageOf(carriage.version).length : 0

/** The account of the copy under the id, or nothing where the id names no copy. */
export const copyAccount = (view: EditionView, copyId: string): CopyAccount | undefined => {
    const copy = view.get<RollCopy>(copyId)
    if (copy?.type !== 'RollCopy') return undefined

    return {
        copy,
        carriages: versionsWitnessedBy(view, copyId)
            .sort((a, b) => rankOf(a) - rankOf(b) || reachOf(view, a) - reachOf(view, b)),
        reservations: reservationsAbout(copy)
    }
}

/** An edit in a line of text: what it does to the first perforation it touches, and how many more. */
export const describeEdit = (edit: Edit, view: EditionView): string => {
    const inserted = (edit.insert ?? []).filter(isPerforation)
    const deleted = (edit.delete ?? []).map(id => view.get<AnySymbol>(id)).filter(isPerforation)
    const [first, ...others] = [...inserted, ...deleted]
    if (!first) return 'An edit'

    const verb = inserted.length > 0 && deleted.length > 0 ? 'Replaces' : inserted.length > 0 ? 'Inserts' : 'Deletes'
    const more = others.length > 0 ? ` and ${others.length} more` : ''
    return `${verb} ${describePerforation(first, view)}${more}`
}

import { Edition, EditionView, Expression, Hole, Note, RollCopy, Text, Version, assignReference, mm, systemOf, track, welteT100 } from "linked-rolls"
import { emptyMetadata } from "../providers/EditionContext"

const hole = (id: string, from: number, to: number, position: number): Hole => ({
    type: 'Hole',
    id,
    horizontal: { unit: 'mm', from: mm(from), to: mm(to) },
    vertical: { unit: 'track', from: track(position) }
})

const note = (id: string, pitch: number, carrier: string): Note => ({
    type: 'note',
    id,
    pitch,
    carriers: [assignReference(carrier)]
})

const expression = (id: string, expressionType: string, carrier: string): Expression => ({
    type: 'expression',
    id,
    expressionType,
    scope: 'treble',
    carriers: [assignReference(carrier)]
})

const version = (id: string, edits: Version['edits'], basedOn?: string): Version => ({
    type: 'Version',
    id,
    siglum: id,
    system: systemOf(welteT100),
    versionType: 'edition',
    edits,
    motivations: [],
    ...(basedOn ? { basedOn: assignReference(basedOn) } : {})
})

export const ids = {
    a: 'A',
    b: 'B',
    note: 'note-60',
    otherNote: 'note-62',
    forzandoOff: 'forzando-off',
    forzandoOn: 'forzando-on',
    label: 'label'
} as const

/**
 * A roll in two versions: a note at 1000 mm with a forzando off falling
 * into it, a forzando on shortly before, which version B takes away,
 * a second note further on, and a label. All on one copy.
 */
export const fixtureEdition = (): Edition => {
    const copy: RollCopy = {
        type: 'RollCopy',
        id: 'copy',
        ops: [],
        measurements: {},
        conditions: [],
        modifications: [],
        keeper: { name: 'Test', sameAs: [] },
        features: [
            hole('hole-note', 1000, 1010, 47),
            hole('hole-other-note', 1020, 1030, 49),
            hole('hole-off', 1004, 1006, 96),
            hole('hole-on', 990, 992, 95)
        ]
    }
    const label: Text = { type: 'text', id: ids.label, text: 'WM 225', carriers: [] }

    // Its own metadata, since immer freezes whatever a produced edition
    // reaches, and the constant is shared by every fixture.
    return {
        ...structuredClone(emptyMetadata),
        copies: [copy],
        versions: [
            version(ids.a, [{
                type: 'edit',
                id: 'edit-a',
                insert: [
                    note(ids.note, 60, 'hole-note'),
                    note(ids.otherNote, 62, 'hole-other-note'),
                    expression(ids.forzandoOff, 'ForzandoOff', 'hole-off'),
                    expression(ids.forzandoOn, 'ForzandoOn', 'hole-on'),
                    label
                ]
            }]),
            version(ids.b, [{ type: 'edit', id: 'edit-b', delete: [ids.forzandoOn] }], ids.a)
        ]
    }
}

export const viewOf = (edition: Edition) => new EditionView(edition)

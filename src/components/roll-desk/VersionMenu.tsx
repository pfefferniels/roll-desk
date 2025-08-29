import { Delete, Edit as EditIcon, Person, Link, GroupAdd, GroupRemove, CallSplit, Lightbulb, MoveUp, TypeSpecimen } from "@mui/icons-material"
import { Button } from "@mui/material"
import { AnySymbol, assign, Edit, Motivation, isEdit, isSymbol, Version, isMotivation, MeaningComprehension, fillEdits, getSnapshot, merge, split, versionTypes, editMotivations, EditMotivation, flat } from "linked-rolls"
import { useContext, useState } from "react"
import { EditString } from "./EditString"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
// import { EditAssumption } from "./EditAssumption"
import { SelectVersion } from "./SelectVersion"
import { useHotkeys } from "react-hotkeys-hook"
import { EditType } from "./EditVersionType"
import { EditionContext, EditionOp } from "../../providers/EditionContext"

const mergeEdits = (versionId: string, edits: Edit[]): EditionOp => {
    return (draft) => {
        if (edits.length < 2) {
            return
        }

        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        const newEdit = merge(edits)
        for (const edit of edits) {
            version.edits.splice(
                version.edits.indexOf(edit), 1
            )
        }
        version.edits.push(newEdit)
    }
}

const splitEdits = (versionId: string, selection: Edit[]): EditionOp => {
    return (draft) => {
        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        version.edits.push(...split(selection[0]))
        version.edits.splice(
            version.edits.indexOf(selection[0]), 1
        )

    }
}

const deriveVersion = (versionId: string, selection: VersionSelection[]): EditionOp =>
    (draft) => {
        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        const edits = selection.filter(isEdit)
        for (const edit of edits) {
            const index = version.edits.indexOf(edit)
            if (index !== -1) {
                version.edits.splice(index, 1)
            }
        }

        draft.versions.push({
            siglum: version.siglum + '_derived',
            id: v4(),
            basedOn: assign('derivation', version),
            edits,
            motivations: [],
            type: 'authorised-revision'
        })
    }

const removeSymbols = (versionId: string, symbols: AnySymbol[]): EditionOp => {
    return (draft) => {
        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        for (const symbol of symbols) {
            for (const edit of version.edits) {
                if (!edit.insert) continue
                const index = edit.insert.findIndex(s => s.id === symbol.id)
                if (index !== -1) {
                    edit.insert.splice(index, 1)
                }

                // the edit is empty now, we can safely remove it
                if (edit.insert.length === 0 && edit.delete?.length) {
                    version.edits.splice(version.edits.indexOf(edit), 1)
                }
            }
        }
    }
}

const remove = (versionId: string): EditionOp => {
    return (draft) => {
        draft.versions = draft.versions.filter(v => v.id !== versionId)
    }
}

export type VersionSelection = AnySymbol | Edit | Motivation<string>

interface MenuProps {
    versionId: string
    selection: VersionSelection[]
    onClearSelection: () => void
}

export const VersionMenu = ({ versionId, onClearSelection, selection }: MenuProps) => {
    const { edition, apply } = useContext(EditionContext)
    const [assignActor, setAssignActor] = useState(false)
    const [editSiglum, setEditSiglum] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [versionType, setVersionType] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<Edit[]>()

    useHotkeys(['m'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'm':
                if (!selection.every(isEdit)) return
                apply(mergeEdits(
                    versionId, selection
                ));
                break;
        }
    })

    const addMotivation = (about: Edit[]) => {
        if (about.length === 0) return
        setEditsToMotivate(about)
    }

    if (!edition) return null

    const version = edition.versions.find(v => v.id === versionId)
    if (!version) return null

    return (
        <>
            <Ribbon title='Version'>
                <Button
                    onClick={() => setVersionType(true)}
                    size='small'
                    startIcon={<TypeSpecimen />}
                >
                    Type
                </Button>
                <Button
                    onClick={() => setAssignActor(true)}
                    size='small'
                    startIcon={<Person />}
                >
                    Actor
                </Button>
                <Button
                    onClick={() => apply(remove(versionId))}
                    size='small'
                    startIcon={<Delete />}
                >
                    Remove
                </Button>
                <Button
                    onClick={() => setEditSiglum(true)}
                    startIcon={<EditIcon />}
                    size='small'
                >
                    Edit Siglum
                </Button>
            </Ribbon>
            {selection.length > 0 && (
                <>
                    {selection.every(isSymbol) && (
                        <Ribbon title='Symbol'>
                            <Button
                                size='small'
                                startIcon={<EditIcon />}
                            >
                                Edit
                            </Button>
                            <Button
                                size='small'
                                startIcon={<Delete />}
                                onClick={() => {
                                    apply(
                                        removeSymbols(versionId, selection)
                                    )
                                }}
                            >
                                Remove
                            </Button>
                        </Ribbon>
                    )}
                    {selection.every(isEdit) && (
                        <Ribbon title='Edits'>
                            {selection.length === 1 && (
                                <Button
                                    onClick={() => addMotivation(selection)}
                                    size='small'
                                    startIcon={<TypeSpecimen />}
                                >
                                    Type
                                </Button>
                            )}
                            {selection.length >= 2 && (
                                <>
                                    <Button
                                        size='small'
                                        startIcon={<Lightbulb />}
                                        onClick={() => addMotivation(selection)}
                                    >
                                        Add Motivation
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            apply(
                                                mergeEdits(versionId, selection)
                                            )
                                            onClearSelection()
                                        }}
                                        startIcon={<GroupAdd />}
                                        size='small'
                                    >
                                        Merge
                                    </Button>
                                </>
                            )}
                            {selection.length === 1 && (
                                <Button
                                    onClick={() => {
                                        apply(
                                            splitEdits(versionId, selection)
                                        )
                                        onClearSelection()
                                    }}
                                    size='small'
                                    startIcon={<GroupRemove />}
                                >
                                    Split
                                </Button>
                            )}
                        </Ribbon>
                    )}
                </>
            )}
            <Ribbon title='Derivation'>
                <Button
                    onClick={() => setAttachTo(true)}
                    size='small'
                    startIcon={<Link />}
                >
                    Attach To
                </Button>
                {selection.length > 0 && selection.every(isEdit) && (
                    <Button
                        onClick={() => {
                            apply(deriveVersion(
                                versionId, selection
                            ))
                        }}
                        startIcon={<CallSplit />}
                        size='small'
                    >
                        Derive New Version
                    </Button>
                )}
            </Ribbon>

            <EditString
                open={editSiglum}
                value={version.siglum}
                onDone={(newSiglum) => {
                    apply(draft => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return
                        version.siglum = newSiglum
                    })
                    setEditSiglum(false)
                }}
                onClose={() => setEditSiglum(false)}
            />

            <EditString
                open={assignActor}
                onClose={() => setAssignActor(false)}
                value={version.actor ? flat(version.actor).name : ''}
                onDone={(str) => {
                    apply((draft) => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return

                    })
                    version.actor = assign('actorAssignment', {
                        name: str,
                        id: v4(),
                        sameAs: ['']
                    })
                    setAssignActor(false)
                }}
            />

            <SelectVersion
                open={attachTo}
                onClose={() => setAttachTo(false)}
                onDone={(previousVersion) => {
                    apply((draft) => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return

                        const snapshot = getSnapshot(version)
                        version.basedOn = assign('derivation', previousVersion)
                        version.edits = []
                        fillEdits(version, snapshot, { toleranceStart: 3, toleranceEnd: 3 })
                    })
                }}
                versions={edition.versions}
            />

            <EditType
                open={versionType}
                onClose={() => setVersionType(false)}
                onSave={(type) => {
                    apply((draft) => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return
                        version.type = type
                    })
                }}
                value={version.type}
                types={versionTypes}
            />

            <EditString
                open={!!editsToMotivate}
                onClose={() => setEditsToMotivate(undefined)}
                value=''
                onDone={(motivationDescription) => {
                    if (!editsToMotivate) return

                    const comprehension: MeaningComprehension<Edit> = {
                        type: 'meaningComprehension',
                        comprehends: editsToMotivate
                    }

                    const motivation: Motivation<string> = {
                        assigned: motivationDescription,
                        id: v4(),
                        type: 'motivationAssignment',
                        belief: {
                            type: 'belief',
                            certainty: 'true',
                            id: v4(),
                            reasons: [comprehension]
                        }
                    }

                    apply((d) => {
                        const version = d.versions.find(v => v.id === versionId)
                        if (!version) return
                        version.motivations.push(motivation)
                    })
                    setEditsToMotivate(undefined)
                }}
            />
        </>
    )
}

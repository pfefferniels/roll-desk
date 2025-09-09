import { Delete, Edit as EditIcon, Person, Link, GroupAdd, GroupRemove, CallSplit, Lightbulb, TypeSpecimen } from "@mui/icons-material"
import { Button } from "@mui/material"
import { AnySymbol, assign, Edit, Motivation, isEdit, isSymbol, MeaningComprehension, versionTypes, flat, isMotivation, MergeEdits, SplitEdit, ConnectVersions, getAt } from "linked-rolls"
import { useContext, useState } from "react"
import { EditString } from "./EditString"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
import { SelectVersion } from "./SelectVersion"
import { useHotkeys } from "react-hotkeys-hook"
import { EditType } from "./EditVersionType"
import { EditionContext, EditionOp } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"

/*
const mergeEdits = (versionId: string, edits: Edit[], editionView: EditionView): EditionOp => {
    return (draft) => {
        if (edits.length < 2) {
            return
        }

        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        const newEdit = editionView.planMerge(edits)
        version.edits.push(newEdit)
        for (const edit of edits) {
            version.edits.splice(
                version.edits.findIndex(e => e.id === edit.id), 1
            )
        }
    }
}

const splitEdits = (versionId: string, selection: Edit[], editionView: EditionView): EditionOp => {
    return (draft) => {
        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        version.edits.push(...editionView.planSplit(selection[0]))
        version.edits.splice(
            version.edits.findIndex(e => e.id === selection[0].id), 1
        )
    }
}*/

const deriveVersion = (versionId: string, selection: VersionSelection[]): EditionOp =>
    (draft) => {
        const version = draft.versions.find(v => v.id === versionId)
        if (!version) return

        const edits = selection.filter(isEdit)
        for (const edit of edits) {
            const index = version.edits.findIndex(e => e.id === edit.id)
            if (index !== -1) {
                version.edits.splice(index, 1)
            }
        }

        draft.versions.push({
            siglum: version.siglum + '_derived',
            id: v4(),
            basedOn: assign('derivation', version.id),
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
}

export const VersionMenu = ({ versionId }: MenuProps) => {
    const { selection, setSelection } = useSelection(item => isEdit(item) || isSymbol(item) || isMotivation(item))
    const { edition, apply, view } = useContext(EditionContext)

    const [assignActor, setAssignActor] = useState(false)
    const [editSiglum, setEditSiglum] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [versionType, setVersionType] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<string[]>()

    useHotkeys(['m', 's'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'm':
                if (!selection.every(isEdit)) return
                apply(new MergeEdits(versionId, selection))
                setSelection([])
                break;
            case 's':
                if (!selection.every(isEdit)) return
                selection.forEach(edit => {
                    apply(new SplitEdit(versionId, edit))
                })
                setSelection([])
                break;
        }
    })

    const addMotivation = (about: Edit[]) => {
        if (about.length === 0) return
        setEditsToMotivate(about.map(e => e.id))
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
                    Siglum
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
                            <Button
                                size='small'
                                onClick={() => {
                                    const symbols = selection.filter(isSymbol)

                                    apply(draft => {
                                        if (!view) return

                                        const version = draft.versions.find(v => v.id === versionId)
                                        if (!version) return

                                        if (!version.basedOn) return
                                        const snapshot = view.snapshot(version.basedOn.assigned)
                                        if (!snapshot) return

                                        for (const symbolA of symbols) {
                                            for (const symbolB of snapshot) {
                                                if (view.isCollatable(symbolA, symbolB)) {
                                                    console.log('collatable found')
                                                    const path = view.getPath(symbolB.id)
                                                    if (!path) continue

                                                    const symbol = getAt<AnySymbol>(path, draft)
                                                    if (!symbol) continue

                                                    symbol?.carriers.push(...symbolA.carriers)

                                                    const originalPath = view.getPath(symbolA.id)
                                                    if (!originalPath) continue

                                                    const insert = getAt<AnySymbol[]>(originalPath.slice(0, -1), draft)
                                                    if (!insert || !Array.isArray(insert)) continue

                                                    const index = insert.findIndex(s => s.id === symbolA.id)
                                                    if (index !== -1) {
                                                        insert.splice(index, 1)
                                                    }
                                                }
                                            }
                                        }
                                    })
                                }}
                            >
                                Recollate
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
                                        Motivate
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            apply(new MergeEdits(versionId, selection))
                                            setSelection([])
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
                                        apply(new SplitEdit(versionId, selection[0]))
                                        setSelection([])
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
                        version.actor = assign('actorAssignment', {
                            name: str,
                            id: v4(),
                            sameAs: ['']
                        })
                    })
                    setAssignActor(false)
                }}
            />

            <SelectVersion
                currentVersionId={versionId}
                open={attachTo}
                onClose={() => setAttachTo(false)}
                onDone={(previousVersionId) => {
                    apply(
                        new ConnectVersions(
                            versionId,
                            previousVersionId
                        )
                    )
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

                    const comprehension: MeaningComprehension = {
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

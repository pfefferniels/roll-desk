import { Delete, Edit as EditIcon, Person, Link, GroupAdd, GroupRemove, CallSplit, Lightbulb, MoveUp, TypeSpecimen } from "@mui/icons-material"
import { Button } from "@mui/material"
import { AnySymbol, assign, Edit, Motivation, isEdit, isSymbol, Version, isMotivation, MeaningComprehension, fillEdits, getSnapshot, merge, split, versionTypes, editMotivations, EditMotivation, flat } from "linked-rolls"
import { useState } from "react"
import { EditString } from "./EditString"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
// import { EditAssumption } from "./EditAssumption"
import { SelectVersion } from "./SelectVersion"
import { useHotkeys } from "react-hotkeys-hook"
import { EditType } from "./EditVersionType"
import { produce } from "immer"

export type VersionSelection = AnySymbol | Edit | Motivation<string>

interface MenuProps {
    version: Version
    versions: Version[]
    selection: VersionSelection[]
    onChange: (version: Version) => void
    onAdd: (version: Version) => void
    onRemove: (version: Version) => void
}

export const VersionMenu = ({ version, versions, selection, onChange, onAdd, onRemove }: MenuProps) => {
    const [assignActor, setAssignActor] = useState(false)
    const [assignMotivation, setAssignMotivation] = useState<Motivation<string>>()
    const [editSiglum, setEditSiglum] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [versionType, setVersionType] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<Edit[]>()

    useHotkeys(['m'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'm':
                handleMerge();
                break;
        }
    })

    const handleMerge = () => {
        if (selection.length < 2 || !selection.every(isEdit)) {
            return
        }

        const newEdit = merge(selection)
        const updatedVersion = produce(version, draft => {
            // Remove all selected edits
            for (const edit of selection) {
                const index = draft.edits.indexOf(edit)
                if (index !== -1) {
                    draft.edits.splice(index, 1)
                }
            }
            // Add the merged edit
            draft.edits.push(newEdit)
        })
        onChange(updatedVersion)
    }


    const handleNewVersion = () => {
        const edits = selection.filter(isEdit)
        const updatedVersion = produce(version, draft => {
            for (const edit of edits) {
                const index = draft.edits.indexOf(edit)
                if (index !== -1) {
                    draft.edits.splice(index, 1)
                }
            }
        })
        
        const newVersion: Version = {
            siglum: version.siglum + '_derived',
            id: v4(),
            basedOn: assign('derivation', updatedVersion),
            edits,
            motivations: [],
            type: 'authorised-revision'
        }

        // TODO: calculate impact on later versions

        onAdd(newVersion)
    }

    const removeMotivations = (motivations: Motivation<any>[]) => {
        const updatedVersion = produce(version, draft => {
            draft.motivations = draft.motivations.filter(m => !motivations.includes(m))
        })
        onChange(updatedVersion)
    }

    const addMotivation = (about: Edit[]) => {
        if (about.length === 0) return


        setEditsToMotivate(about)

        /*
        if (about.length === 1) {
            const motivation: Motivation<EditMotivation> = about[0].motivation || {
                assigned: 'correct-error',
                id: v4(),
                type: 'motivationAssignment',
                belief: {
                    id: v4(),
                    type: 'belief',
                    certainty: 'true',
                    reasons: []
                }
            }

            setAssignMotivation(motivation)
        }
        else {*/
        /*}*/
    }

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
                    onClick={() => onRemove(version)}
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
                                    const updatedVersion = produce(version, draft => {
                                        for (const symbol of selection) {
                                            for (const edit of draft.edits) {
                                                if (!edit.insert) continue
                                                const index = edit.insert.findIndex(s => s.id === symbol.id)
                                                if (index !== -1) {
                                                    edit.insert.splice(index, 1)
                                                }

                                                // the edit is empty now, we can safely remove it
                                                if (edit.insert.length === 0 && edit.delete?.length) {
                                                    const editIndex = draft.edits.indexOf(edit)
                                                    if (editIndex !== -1) {
                                                        draft.edits.splice(editIndex, 1)
                                                    }
                                                }
                                            }
                                        }
                                    })
                                    onChange(updatedVersion)
                                }}
                            >
                                Remove
                            </Button>
                        </Ribbon>
                    )}
                    {selection.every(isMotivation) && (
                        <Ribbon title='Motivation'>
                            <Button
                                onClick={() => removeMotivations(selection)}
                                size='small'
                                startIcon={<Delete />}
                            >
                                Remove
                            </Button>
                            {selection.length === 1 && (
                                <Button
                                    onClick={() => {
                                        setAssignMotivation(selection[0])
                                    }}
                                    size='small'
                                    startIcon={<EditIcon />}
                                >
                                    Edit
                                </Button>
                            )}
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
                                        onClick={handleMerge}
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
                                        const updatedVersion = produce(version, draft => {
                                            const splitEdits = split(selection[0])
                                            draft.edits.push(...splitEdits)
                                            const originalIndex = draft.edits.indexOf(selection[0])
                                            if (originalIndex !== -1) {
                                                draft.edits.splice(originalIndex, 1)
                                            }
                                        })
                                        onChange(updatedVersion)
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
                        onClick={handleNewVersion}
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
                    const updatedVersion = produce(version, draft => {
                        draft.siglum = newSiglum
                    })
                    onChange(updatedVersion)
                    setEditSiglum(false)
                    onChange(version)
                }}
                onClose={() => setEditSiglum(false)}
            />

            <EditString
                open={assignActor}
                onClose={() => setAssignActor(false)}
                value={version.actor ? flat(version.actor).name : ''}
                onDone={(str) => {
                    version.actor = assign('actorAssignment', {
                        name: str,
                        id: v4(),
                        sameAs: ['']
                    })
                    setAssignActor(false)
                    onChange(version)
                }}
            />

            <SelectVersion
                open={attachTo}
                onClose={() => setAttachTo(false)}
                onDone={(previousVersion) => {
                    const snapshot = getSnapshot(version)
                    version.basedOn = assign('derivation', previousVersion)
                    version.edits = []
                    fillEdits(version, snapshot, { toleranceStart: 3, toleranceEnd: 3 })
                    onChange(version)
                }}
                versions={versions}
            />

            <EditType
                open={versionType}
                onClose={() => setVersionType(false)}
                onSave={(type) => {
                    version.type = type
                    onChange(version)
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

                    version.motivations.push(motivation)
                    setAssignMotivation(motivation)
                    onChange(version)
                    setEditsToMotivate(undefined)
                }}
            />
        </>
    )
}

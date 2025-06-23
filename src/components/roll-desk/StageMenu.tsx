import { Delete, Edit as EditIcon, Person, Link, GroupAdd, GroupRemove, CallSplit, Lightbulb, MoveUp } from "@mui/icons-material"
import { Button } from "@mui/material"
import { AnySymbol, assign, Edit, Motivation, isEdit, isSymbol, Stage, isMotivation, MeaningComprehension, fillEdits, getSnaphsot, merge, split } from "linked-rolls"
import { useState } from "react"
import { EditSiglum } from "./EditSiglum"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
import { EditAssumption } from "./EditAssumption"
import { SelectStage } from "./SelectStage"
import { useHotkeys } from "react-hotkeys-hook"

export type StageSelection = AnySymbol | Edit | Motivation<string>

interface MenuProps {
    stage: Stage
    stages: Stage[]
    selection: StageSelection[]
    onChange: (stage: Stage) => void
    onAdd: (stage: Stage) => void
    onRemove: (stage: Stage) => void
}

export const StageMenu = ({ stage, stages, selection, onChange, onAdd, onRemove }: MenuProps) => {
    const [assignActor, setAssignActor] = useState(false)
    const [assignMotivation, setAssignMotivation] = useState<Motivation<string>>()
    const [editSiglum, setEditSiglum] = useState(false)
    const [attachTo, setAttachTo] = useState(false)

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
        for (const edit of selection) {
            stage.edits.splice(
                stage.edits.indexOf(edit), 1
            )
        }
        stage.edits.push(newEdit)
        onChange(stage)
    }


    const handleNewStage = () => {
        const edits = selection.filter(isEdit)
        // console.log('edits', edits)
        for (const edit of edits) {
            const index = stage.edits.indexOf(edit)
            if (index !== -1) {
                stage.edits.splice(index, 1)
            }
        }
        const newStage: Stage = {
            siglum: stage.siglum + '_derived',
            id: v4(),
            basedOn: assign('derivation', stage),
            edits,
            motivations: [],
        }
        onAdd(newStage)
    }

    const removeMotivations = (motivations: Motivation<any>[]) => {
        stage.motivations = stage.motivations.filter(m => !motivations.includes(m))
        onChange(stage)
    }

    const addMotivation = (about: Edit[]) => {
        const comprehension: MeaningComprehension<Edit> = {
            comprehends: about
        }

        const motivation: Motivation<string> = {
            assigned: '...',
            id: v4(),
            type: 'motivationAssignment',
            belief: {
                type: 'belief',
                certainty: 'true',
                id: v4(),
                reasons: [comprehension]
            }
        }

        stage.motivations.push(motivation)
        setAssignMotivation(motivation)
        onChange(stage)
    }

    return (
        <>
            <Ribbon title='Stage'>
                <Button
                    onClick={() => setAssignActor(true)}
                    size='small'
                    startIcon={<Person />}
                >
                    Actor
                </Button>
                <Button
                    onClick={() => onRemove(stage)}
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
                                startIcon={<MoveUp />}
                            >
                                Shift Vertically
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
                            <Button
                                size='small'
                                startIcon={<Lightbulb />}
                                onClick={() => addMotivation(selection)}
                            >
                                Add Motivation
                            </Button>
                            {selection.length >= 2 && selection.every(isEdit) && (
                                <Button
                                    onClick={handleMerge}
                                    startIcon={<GroupAdd />}
                                    size='small'
                                >
                                    Merge
                                </Button>
                            )}
                            {selection.length === 1 && selection.every(isEdit) && (
                                <Button
                                    onClick={() => {
                                        stage.edits.push(...split(selection[0]))
                                        stage.edits.splice(
                                            stage.edits.indexOf(selection[0]), 1
                                        )
                                        onChange(stage)
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
                        onClick={handleNewStage}
                        startIcon={<CallSplit />}
                        size='small'
                    >
                        Derive New Stage
                    </Button>
                )}
            </Ribbon>

            <EditSiglum
                open={editSiglum}
                siglum={stage.siglum}
                onDone={(newSiglum) => {
                    stage.siglum = newSiglum
                    setEditSiglum(false)
                    onChange(stage)
                }}
                onClose={() => setEditSiglum(false)}
            />

            <EditAssumption
                open={assignActor}
                onClose={() => setAssignActor(false)}
                assumption={stage.actor || assign('actorAssignment', { name: '', sameAs: [] })}
                onChange={(assumption) => {
                    stage.actor = assumption
                    setAssignActor(false)
                    onChange(stage)
                }}
            />

            {assignMotivation && (
                <EditAssumption
                    open={!!assignMotivation}
                    onClose={() => setAssignMotivation(undefined)}
                    assumption={assignMotivation}
                    onChange={(assumption) => {
                        stage.motivations.splice(
                            stage.motivations.indexOf(assignMotivation), 1, assumption
                        )
                        setAssignMotivation(undefined)
                        onChange(stage)
                    }}
                />
            )}

            <SelectStage
                open={attachTo}
                onClose={() => setAttachTo(false)}
                onDone={(previousStage) => {
                    const snapshot = getSnaphsot(stage)
                    stage.basedOn = assign('derivation', previousStage)
                    stage.edits = []
                    fillEdits(stage, snapshot)
                    onChange(stage)
                }}
                stages={stages}
            />
        </>
    )
}

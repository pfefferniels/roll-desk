import { Delete, Edit as EditIcon, Person, Link } from "@mui/icons-material"
import { Button } from "@mui/material"
import { AnySymbol, assign, Edit, Motivation, isEdit, isSymbol, Stage, isMotivation, MeaningComprehension, fillEdits, getSnaphsot, merge } from "linked-rolls"
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

        stage.motivations.push({
            assigned: '...',
            id: v4(),
            type: 'motivationAssignment',
            belief: {
                type: 'belief',
                certainty: 'true',
                id: v4(),
                reasons: [comprehension]
            }
        })
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
            </Ribbon>
            <Ribbon title='Siglum'>
                <Button
                    onClick={() => setEditSiglum(true)}
                    startIcon={<EditIcon />}
                    size='small'
                >
                    Edit
                </Button>
            </Ribbon>
            {selection.length > 0 && (
                <>
                    {selection.every(isSymbol) && (
                        <>
                            <Button>
                                Edit Symbol
                            </Button>
                            <Button>
                                Shift Vertically
                            </Button>
                        </>
                    )}
                    {selection.every(isMotivation) && (
                        <Button onClick={() => removeMotivations(selection)}>
                            Remove Motivation
                        </Button>
                    )}
                    {selection.every(isEdit) && (
                        <>
                            <Button onClick={() => addMotivation(selection)}>
                                Add Motivation
                            </Button>
                            <Button onClick={handleNewStage}>
                                Derive New Stage
                            </Button>
                        </>
                    )}
                    {selection.length >= 2 && selection.every(isEdit) && (
                        <>
                            <Button
                                onClick={handleMerge}
                            >
                                Merge
                            </Button>
                            <Button>
                                Split
                            </Button>
                        </>
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

            <SelectStage
                open={attachTo}
                onClose={() => setAttachTo(false)}
                onDone={(previousStage) => {
                    const snapshot = getSnaphsot(stage)
                    stage.basedOn = assign('derivation', previousStage)
                    stage.edits = []
                    fillEdits(stage, snapshot)
                }}
                stages={stages}
            />
        </>
    )
}

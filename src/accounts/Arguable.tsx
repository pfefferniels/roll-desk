import { Add, Delete, Edit } from "@mui/icons-material";
import { Button, Stack, Typography } from "@mui/material";
import { ToolButton } from "../desk/ToolButton";
import { beliefIn, isEdit, isSymbol, Path } from "linked-rolls";
import { ReactNode, useContext, useState } from "react";
import { useSelection } from "../desk/SelectionContext";
import { EditChoice, EditString } from "../fields/EditString";
import { useAssumption } from "./useAssumption";
import { EditionContext } from "../edition/EditionContext";
import { Argumentation, BeliefAdoption, MeaningComprehension, certainties } from "linked-rolls";
import { CertaintyMark } from "./CertaintyMark";
import { BeliefAccount } from "./Reasons";

interface ArguableProps {
    path: Path
    children: ReactNode
    asSVG?: {
        buttonPlacement: {
            x: number,
            y: number
        }
    }
}

export function Arguable({ asSVG, path, children }: ArguableProps) {
    const { edition, viewOnly } = useContext(EditionContext)

    const [editValue, setEditValue] = useState(false)
    const [addCitation, setAddCitation] = useState(false)
    const [addPlain, setAddPlain] = useState(false)

    const { assumption: about,
        createBelief,
        clearBelief,
        addReason,
        removeReason,
        setCertainty
    } = useAssumption(path)
    const { selection } = useSelection()

    if (!about) {
        throw new Error("Assumption not found at path: " + path.join('.'))
    }

    const belief = about['@annotation']?.belief;
    // A statement one reasoning concluded together with others, as a
    // program's run does, is held with the belief of their set. The
    // editor who holds it for reasons of their own takes it out of the set.
    const ofSet = !belief && edition ? beliefIn(edition, about) : undefined

    if (viewOnly && !belief && !ofSet) {
        return asSVG ? <g>{children}</g> : <span>{children}</span>
    }

    const mark = (
        <CertaintyMark certainty={belief?.certainty ?? ofSet?.certainty} at={asSVG?.buttonPlacement}>
            {ofSet && (
                <Stack spacing={1}>
                    <Typography variant='caption' color='text.secondary'>
                        Concluded together with others in one run, and held as they are
                    </Typography>
                    <BeliefAccount belief={ofSet} />
                    {!viewOnly && (
                        <Button onClick={() => createBelief()}>
                            Hold for Reasons of Your Own
                        </Button>
                    )}
                </Stack>
            )}

            {(!belief && !ofSet && !viewOnly) && (
                <Button onClick={() => createBelief()}>
                    Create Belief
                </Button>
            )}

            {belief && (
                <Stack spacing={1}>
                    <BeliefAccount
                        belief={belief}
                        onRemove={viewOnly ? undefined : removeReason}
                        actions={!viewOnly && (
                            <>
                                <ToolButton label='Change the certainty' size='small' onClick={() => setEditValue(true)}>
                                    <Edit fontSize='small' />
                                </ToolButton>
                                <ToolButton label='Withdraw the belief' size='small' onClick={() => clearBelief()}>
                                    <Delete fontSize='small' />
                                </ToolButton>
                            </>
                        )}
                    />

                    {!viewOnly && (
                        <Stack direction='column' spacing={1}>
                            {selection.length > 0 && selection.every(el => isSymbol(el) || isEdit(el)) && (
                                <Button
                                    variant='contained'
                                    onClick={() => {
                                        const comprehension: MeaningComprehension = {
                                            type: 'meaningComprehension',
                                            actor: {
                                                name: '',
                                                sameAs: []
                                            },
                                            comprehends: selection.map(s => s.id)
                                        }

                                        addReason(comprehension)
                                    }}
                                >
                                    Comprehend Selection
                                </Button>
                            )}

                            <Button
                                variant='contained'
                                startIcon={<Add />}
                                onClick={() => setAddCitation(true)}
                            >
                                Add Citation
                            </Button>

                            <Button
                                variant='contained'
                                startIcon={<Add />}
                                onClick={() => setAddPlain(true)}
                            >
                                Add Plain-Text Reason
                            </Button>
                        </Stack>
                    )}

                    <EditChoice
                        open={editValue}
                        label='Certainty'
                        value={belief.certainty}
                        items={certainties}
                        onClose={() => setEditValue(false)}
                        onDone={(newValue) => {
                            setCertainty(newValue);
                            setEditValue(false);
                        }}
                    />

                    <EditString
                        open={addCitation}
                        label='Reference'
                        value={"Your reference ..."}
                        onClose={() => setAddCitation(false)}
                        onDone={(str) => {
                            const beliefAdoption: BeliefAdoption = {
                                type: 'beliefAdoption',
                                actor: {
                                    name: '',
                                    sameAs: ['']
                                },
                                note: str,
                            }

                            addReason(beliefAdoption)
                            setAddCitation(false)
                        }}
                    />

                    <EditString
                        open={addPlain}
                        label='Reason'
                        value={"Your reason ..."}
                        onClose={() => setAddPlain(false)}
                        onDone={(str) => {
                            const plainArg: Argumentation = {
                                type: 'simpleArgumentation',
                                actor: {
                                    name: '',
                                    sameAs: ['']
                                },
                                note: str,
                            }

                            addReason(plainArg)
                            setAddPlain(false)
                        }}
                    />
                </Stack>
            )}
        </CertaintyMark>
    )

    if (!asSVG) {
        return (
            <span>
                {children}
                {mark}
            </span>
        )
    }

    return (
        <g>
            {children}
            {mark}
        </g>
    )
}

import { Add, Delete, Done, DoneAll, Edit, QuestionMarkTwoTone, RadioButtonUnchecked, RemoveDone } from "@mui/icons-material";
import { Box, Button, IconButton, List, ListItem, ListItemText, Popover, Portal, Stack, Tooltip } from "@mui/material";
import { AnySymbol, Argumentation, BeliefAdoption, certainties, EditorialAssumption, isEdit, isSymbol, MeaningComprehension } from "linked-rolls";
import { ReactNode, useEffect, useState } from "react";
import { useSelection } from "../../providers/SelectionContext";
import { Doubts } from "doubtful";
import { EditChoice, EditString } from "./EditString";
import { AssumptionPath, useAssumption } from "../../hooks/useAssumption";

interface ArguableProps<Name, Type> {
    anchor?: Element
    viewOnly: boolean
    path: AssumptionPath
    children: ReactNode
    asSVG?: {
        buttonPlacement: {
            x: number,
            y: number
        }
    }
}

export function Arguable<Name, Type>({ asSVG, anchor, path, viewOnly, children }: ArguableProps<Name, Type>) {
    const [anchorEl, setAnchorEl] = useState<Element | null>(anchor || null)
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

    useEffect(() => setAnchorEl(anchor || null), [anchor])

    if (!about) {
        throw new Error("Assumption not found at path: " + path.join('.'))
    }

    const button = (
        <Tooltip title={about.belief ? about.belief.certainty : 'No Belief'}>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
                {about.belief?.certainty === 'true' && (
                    <DoneAll />
                )}
                {about.belief?.certainty === 'likely' && (
                    <Done />
                )}
                {about.belief?.certainty === 'possible' && (
                    <QuestionMarkTwoTone fontSize='small' />
                )}
                {(about.belief?.certainty === 'unlikely' || about.belief?.certainty === 'false') && (
                    <RemoveDone />
                )}
                {!about.belief && (
                    <RadioButtonUnchecked />
                )}
            </IconButton>
        </Tooltip>
    )

    const popover = (
        <Popover
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
        >
            {(!about.belief && !viewOnly) && (
                <Button onClick={() => createBelief()}>
                    Create Belief
                </Button>
            )
            }
            {
                about.belief && (
                    <>
                        <div style={{ padding: '1rem' }}>
                            held to be: <i>{about.belief?.certainty}</i>

                            {!viewOnly && (
                                <>
                                    <IconButton size='small' onClick={() => setEditValue(true)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton size='small' onClick={() => {
                                        clearBelief()
                                    }}>
                                        <Delete />
                                    </IconButton>
                                </>
                            )}
                            <br />

                            {about.belief.reasons.length > 0 && <b>Reasons</b>}
                            <List style={{ paddingLeft: '1rem', maxWidth: '500px' }}>
                                {about.belief.reasons.map((reason, i) => {
                                    if (reason.type === 'meaningComprehension') {
                                        return (
                                            <ListItem
                                                key={`reason_${i}`}
                                                secondaryAction={
                                                    !viewOnly && (
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => removeReason(i)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    )}
                                            >
                                                <ListItemText
                                                    primary={
                                                        reason.comprehends.map((subject: any) => {
                                                            if (typeof subject === 'string') {
                                                                return <span>{subject}</span>
                                                            }
                                                            else if (isEdit(subject)) {
                                                                return <span>{subject.motivation?.assigned || subject.id.slice(0, 8)} | </span>
                                                            }
                                                            else if (isSymbol(subject)) {
                                                                return <span>{'text' in subject ? subject.text : subject.type}</span>
                                                            }
                                                            else {
                                                                return <span>unknown type</span>
                                                            }
                                                        })
                                                    }
                                                    secondary={
                                                        <span>Meaning Comprehension</span>
                                                    }
                                                />
                                            </ListItem>
                                        )
                                    }
                                    else {
                                        return (
                                            <ListItem
                                                key={`reason_${i}`}
                                                secondaryAction={
                                                    !viewOnly && (
                                                        <IconButton
                                                            size='small'
                                                            onClick={() => removeReason(i)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    )}
                                            >
                                                <ListItemText
                                                    primary={reason.note || 'no note'}
                                                    secondary={
                                                        <span>{reason.type}</span>
                                                    }
                                                />
                                            </ListItem>
                                        )
                                    }
                                })}
                            </List>

                            <Stack direction='column' spacing={1}>
                                {selection.length > 0 && selection.every(el => isSymbol(el)) && (
                                    <Button
                                        variant='contained'
                                        onClick={() => {
                                            if (!about.belief) return
                                            const comprehension: MeaningComprehension<AnySymbol> = {
                                                type: 'meaningComprehension',
                                                actor: {
                                                    name: '',
                                                    sameAs: []
                                                },
                                                comprehends: selection as AnySymbol[]
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
                        </div>

                        <EditChoice
                            open={editValue}
                            value={about.belief.certainty}
                            items={certainties}
                            onClose={() => setEditValue(false)}
                            onDone={(newValue) => {
                                setCertainty(newValue);
                                setEditValue(false);
                            }}
                        />

                        <EditString
                            open={addCitation}
                            value={"Your reference ..."}
                            onClose={() => setAddCitation(false)}
                            onDone={(str) => {
                                if (!about.belief) return;

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
                            value={"Your reason ..."}
                            onClose={() => setAddPlain(false)}
                            onDone={(str) => {
                                if (!about.belief) return;

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
                    </>
                )
            }
        </Popover >
    )

    if (!asSVG) {
        return (
            <Box>
                {children}
                {!anchor && button}
                {viewOnly && <Doubts about={about.id} />}
                {popover}
            </Box>
        )
    }

    return (
        <g>
            {children}
            <foreignObject x={asSVG.buttonPlacement.x} y={asSVG.buttonPlacement.y} width={40} height={40}>
                <div style={{ transform: "scale(0.8)" }}>
                    {button}
                </div>
                {viewOnly && <Doubts about={about.id} />}
                <Portal>
                    {popover}
                </Portal>
            </foreignObject>
        </g>
    )
}

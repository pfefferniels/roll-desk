import { Add, Delete, Done, DoneAll, Edit, QuestionMarkTwoTone, RadioButtonUnchecked, RemoveDone } from "@mui/icons-material";
import { Button, IconButton, List, ListItem, ListItemText, Popover, Portal, Stack, Tooltip } from "@mui/material";
import { isEdit, isRollFeature, isSymbol, Path } from "linked-rolls";
import { ReactNode, useContext, useEffect, useState } from "react";
import { useSelection } from "../../providers/SelectionContext";
import { EditChoice, EditString } from "./EditString";
import { useAssumption } from "../../hooks/useAssumption";
import { EditionContext } from "../../providers/EditionContext";
import { Argumentation, BeliefAdoption, MeaningComprehension, certainties } from "linked-rolls";

interface ArguableProps<Name, Type> {
    anchor?: Element
    path: Path
    children: ReactNode
    asSVG?: {
        buttonPlacement: {
            x: number,
            y: number
        }
    }
}

export function Arguable<Name, Type>({ asSVG, anchor, path, children }: ArguableProps<Name, Type>) {
    const { view, viewOnly } = useContext(EditionContext)

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

    const belief = about['@annotation']?.belief;

    const button = (
        <Tooltip title={belief ? belief.certainty : 'No Belief'}>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
                {belief?.certainty === 'true' && (
                    <DoneAll />
                )}
                {belief?.certainty === 'likely' && (
                    <Done />
                )}
                {belief?.certainty === 'possible' && (
                    <QuestionMarkTwoTone fontSize='small' />
                )}
                {(belief?.certainty === 'unlikely' || belief?.certainty === 'false') && (
                    <RemoveDone />
                )}
                {!belief && (
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
            {(!belief && !viewOnly) && (
                <Button onClick={() => createBelief()}>
                    Create Belief
                </Button>
            )
            }
            {
                belief && (
                    <>
                        <div style={{ padding: '1rem' }}>
                            held to be: <i>{belief?.certainty}</i>

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

                            {belief.reasons.length > 0 && <b>Reasons</b>}
                            <List style={{ paddingLeft: '1rem', maxWidth: '500px' }}>
                                {belief.reasons.map((reason, i) => {
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
                                                        reason.comprehends.map((subject: string) => {
                                                            const target = view?.get(subject)
                                                            const key = `comprehends-${subject}`

                                                            if (!target) {
                                                                return <span>{subject}</span>
                                                            }

                                                            if (isSymbol(target)) {
                                                                return <span key={key}>{'text' in target ? target.text : 'no text'}</span>
                                                            }

                                                            console.log('target', target)

                                                            return <span key={key}>unknown type</span>
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

                            {!viewOnly && (
                                <Stack direction='column' spacing={1}>
                                    {selection.length > 0 && selection.every(el => isSymbol(el) || isEdit(el)) && (
                                        <Button
                                            variant='contained'
                                            onClick={() => {
                                                if (!belief) return
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
                        </div>

                        <EditChoice
                            open={editValue}
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
                            value={"Your reference ..."}
                            onClose={() => setAddCitation(false)}
                            onDone={(str) => {
                                if (!belief) return;

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
                                if (!belief) return;

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
            <span>
                {children}
                {!anchor && button}
                {popover}
            </span>
        )
    }

    return (
        <g>
            {children}
            <foreignObject x={asSVG.buttonPlacement.x} y={asSVG.buttonPlacement.y} width={40} height={40}>
                <div style={{ transform: "scale(0.8)" }}>
                    {button}
                </div>
                <Portal>
                    {popover}
                </Portal>
            </foreignObject>
        </g>
    )
}

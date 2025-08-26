import { Add, Delete, Done, DoneAll, Edit, QuestionMarkTwoTone, RadioButtonUnchecked, RemoveDone } from "@mui/icons-material";
import { Box, Button, IconButton, List, ListItem, ListItemText, Popover, Portal, Stack, Tooltip } from "@mui/material";
import { AnySymbol, Argumentation, Belief, BeliefAdoption, certainties, Certainty, EditorialAssumption, isEdit, isSymbol, MeaningComprehension } from "linked-rolls";
import { PropsWithChildren, ReactNode, useEffect, useState } from "react";
import { v4 } from "uuid";
import { useSelection } from "../../providers/SelectionContext";
import { Doubts } from "doubtful";
import { EditChoice, EditString } from "./EditString";
/*
interface PersonEditProps {
    person: Person;
    onChange: (person: Person) => void;
}

export const PersonEdit = ({ person, onChange }: PersonEditProps) => {
    return (
        <FormControl fullWidth>
            <FormLabel>Person</FormLabel>
            <TextField
                value={person.name}
                onChange={(e) => {
                    person.name = e.target.value;
                    onChange({ ...person });
                }}
            />
        </FormControl>
    );
}
*/

export const OptionalForeignObject = ({ children, condition }: PropsWithChildren & { condition: boolean }) => {
    if (!condition) return children;
    return <>{children}</>
}

interface ArguableProps<Name, Type> {
    anchor?: Element
    viewOnly: boolean
    about: EditorialAssumption<Name, Type>
    onChange: (assumption: EditorialAssumption<Name, Type>) => void
    children: ReactNode
    asSVG?: {
        buttonPlacement: {
            x: number,
            y: number
        }
    }
}

export function Arguable<Name, Type>({ asSVG, anchor, about, onChange, viewOnly, children }: ArguableProps<Name, Type>) {
    const [anchorEl, setAnchorEl] = useState<Element | null>(anchor || null)
    const [editValue, setEditValue] = useState(false)
    const [addCitation, setAddCitation] = useState(false)
    const [addPlain, setAddPlain] = useState(false)

    const { selection } = useSelection()

    useEffect(() => setAnchorEl(anchor || null), [anchor])

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
                <Button onClick={() => {
                    const newBelief: Belief = {
                        type: 'belief',
                        certainty: 'true',
                        id: v4(),
                        reasons: [],
                    }
                    about.belief = newBelief;
                    onChange(about);
                }}>
                    Create Belief
                </Button>
            )}
            {about.belief && (
                <>
                    <div style={{ padding: '1rem' }}>
                        held to be: <i>{about.belief?.certainty}</i>

                        {!viewOnly && (
                            <>
                                <IconButton size='small' onClick={() => setEditValue(true)}>
                                    <Edit />
                                </IconButton>
                                <IconButton size='small' onClick={() => {
                                    about.belief = undefined;
                                    onChange(about);
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
                                                        onClick={() => {
                                                            about.belief?.reasons.splice(i, 1)
                                                            onChange(about);
                                                        }}
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
                                                            return <span>{subject.motivation?.assigned || subject.id.slice(0,8)} | </span>
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
                                                        onClick={() => {
                                                            about.belief?.reasons.splice(i, 1)
                                                            onChange(about);
                                                        }}
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
                                        about.belief.reasons.push(comprehension)
                                        onChange(about);
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
                            if (about.belief) {
                                about.belief.certainty = newValue as Certainty;
                                onChange(about);
                            }
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
                            about.belief.reasons.push(beliefAdoption)
                            onChange(about);
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
                            about.belief.reasons.push(plainArg)
                            onChange(about);
                        }}
                    />
                </>
            )}
        </Popover>
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

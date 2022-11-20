import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, MenuItem, Select, Typography } from "@mui/material"
import { useContext, useEffect, useMemo, useState } from "react"
import { createEditor, Node } from "slate"
import { Slate, Editable, withReact } from "slate-react"
import { uuid } from "../../lib/globals"
import { AnnotationContext, RdfStoreContext } from "../../providers"
import * as rdf from "rdflib";
import { Delete } from "@mui/icons-material"

const enum AnnotationMotivation {
    Technique = 'technique',
    Form = 'form',
    Intratext = 'intratext',
    Intertext = 'intertext',
    Context = 'context',
    Interpretation = 'interpretation',
    Variants = 'variants',
    Questions = 'questions'
}

type AnnotationLevel = 1 | 2 | 3

const OA = new (rdf.Namespace as any)('http://www.w3.org/ns/oa#')
const ME = new (rdf.Namespace as any)('https://measuring-early-records.org/')
const RDF = new (rdf.Namespace as any)('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
const DC = new (rdf.Namespace as any)('http://purl.org/dc/terms/')

const serialize = (nodes: Node[]) => {
    return nodes.map(n => Node.string(n)).join('\n');
}

const initialBody = [
    {
        type: 'paragraph',
        children: [{
            text: ''
        }]
    }
]

interface AnnotationBodyProps {
    bodyId: string
}

/**
 * UI to edit an existing annotation body or to create a new one.
 */
export const AnnotationBody: React.FC<AnnotationBodyProps> = ({ bodyId }) => {
    const storeCtx = useContext(RdfStoreContext)

    const [purpose, setPurpose] = useState<AnnotationMotivation>(AnnotationMotivation.Interpretation)
    const [level, setLevel] = useState<AnnotationLevel>(1)
    const [text, setText] = useState<any>(initialBody)
    const [changedSinceLastSave, setChangedSinceLastSave] = useState(false)

    const editor = useMemo(() => withReact(createEditor()), [])

    const store = () => {
        if (!storeCtx) {
            console.warn('Failed retrieving RDF store.')
            return
        }

        const store = storeCtx.rdfStore

        // storing the body of the annotation
        const body = store.sym(ME(bodyId))

        // make sure not to set more than one value
        const existingValue = store.anyStatementMatching(body, RDF('value'))
        if (existingValue) store.removeStatement(existingValue)

        store.add(body, RDF('value'), serialize(text), body.doc())
        store.add(body, RDF('type'), OA('TextualBody'), body.doc())
        store.add(body, DC('format'), 'application/tei+xml', body.doc())
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                flexDirection: 'column'
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: 'row',
                }}
            >
                <Select
                    size='small'
                    label='motivated by'
                    value={purpose}
                    onChange={(e) => {
                        setPurpose(e.target.value as AnnotationMotivation)
                    }}>
                    <MenuItem value={AnnotationMotivation.Technique}>Technique</MenuItem>
                    <MenuItem value={AnnotationMotivation.Form}>Form</MenuItem>
                    <MenuItem value={AnnotationMotivation.Intratext}>Intratext</MenuItem>
                    <MenuItem value={AnnotationMotivation.Intertext}>Intertext</MenuItem>
                    <MenuItem value={AnnotationMotivation.Context}>Context</MenuItem>
                    <MenuItem value={AnnotationMotivation.Interpretation}>Interpretation</MenuItem>
                    <MenuItem value={AnnotationMotivation.Questions}>Questions</MenuItem>
                    <MenuItem value={AnnotationMotivation.Variants}>Variants</MenuItem>
                </Select>
                <Select
                    size='small'
                    label='level'
                    value={level}
                    onChange={(e) => setLevel(e.target.value as AnnotationLevel)}>
                    <MenuItem value={1}>Level 1</MenuItem>
                    <MenuItem value={2}>Level 2</MenuItem>
                    <MenuItem value={3}>Level 3</MenuItem>
                </Select>
            </Box>

            <Slate
                editor={editor}
                value={text}
                onChange={text => {
                    setText(text)
                    setChangedSinceLastSave(true)
                }}>
                <Editable
                    className='annotation-editor'
                    placeholder='Enter some annotation …'
                    autoFocus />
            </Slate>

            <Button
                onClick={() => {
                    store()
                    setChangedSinceLastSave(false)
                }}
                disabled={!changedSinceLastSave}>Save</Button>
        </Box>
    )
}

interface CreateAnnoProps {
    targets: string[]
    setTargets: (targets: string[]) => void
}

/**
 * Opens a dialog to either create a new annotation.
 */
export const CreateAnno: React.FC<CreateAnnoProps> = ({ targets, setTargets }) => {
    const storeCtx = useContext(RdfStoreContext)

    const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false)
    const [bodyIds, setBodyIds] = useState<string[]>([`body_${uuid()}`])
    const [creator, setCreator] = useState('pfefferniels')

    const annotationId = `annotation_${uuid()}`

    const store = () => {
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        // storing the annotation itself
        const annotation = store.sym(ME(annotationId));


        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), target, annotation.doc());
        })

        bodyIds.forEach(bodyId => {
            store.add(annotation, OA('hasBody'), ME(bodyId), annotation.doc());
        })

        store.add(annotation, OA('hasMotivation'), OA('commenting'), annotation.doc())
        store.add(annotation, DC('creator'), ME(creator), annotation.doc())
        store.add(annotation, DC('created'), new Date(Date.now()).toISOString(), annotation.doc())
        store.add(annotation, RDF('type'), OA('Annotation'), annotation.doc())

        closeDialog()
    }

    const closeDialog = () => {
        setAnnotationDialogOpen(false)
        setTargets([])
        setBodyIds([`body_${uuid()}`])
    }

    if (targets.length === 0) return null

    return (
        <>
            <Button
                variant='contained'
                sx={{ position: 'fixed', bottom: 100, right: 16 }}
                onClick={() => setAnnotationDialogOpen(true)}>
                Annotate ({targets.length})
            </Button>

            <Dialog open={annotationDialogOpen}>
                <DialogTitle>Annotate</DialogTitle>

                <DialogContent>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            flexDirection: 'column',
                        }}
                    >
                        <div>
                            Targets:

                            <List dense>
                                {targets.map((target, i) => (
                                    <ListItem
                                        key={`target_${i}`}
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                aria-label="delete"
                                                disabled={targets.length === 1}
                                                onClick={() => {
                                                    setTargets([
                                                        ...targets.slice(0, targets.indexOf(target)),
                                                        ...targets.slice(targets.indexOf(target) + 1)
                                                    ])
                                                }}>
                                                <Delete />
                                            </IconButton>
                                        }
                                    >
                                        {target}
                                    </ListItem>))}
                            </List>
                        </div>

                        {bodyIds.map(bodyId => <AnnotationBody key={bodyId} bodyId={bodyId} />)}

                        <Button
                            onClick={() => {
                                setBodyIds(
                                    [...bodyIds,
                                    `body_${uuid()}`]
                                )
                            }}
                        >Add Body</Button>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button onClick={store}>Save</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, MenuItem, Select, Typography } from "@mui/material"
import { useContext, useMemo, useState } from "react"
import { createEditor, Node } from "slate"
import { Slate, Editable, withReact } from "slate-react"
import { uuid } from "../../lib/globals"
import { AnnotationContext, RdfStoreContext } from "../../providers"
import * as rdf from "rdflib";
import { Delete } from "@mui/icons-material"

/**
 * `commenting` is used in a subjective meaning,
 * whereas `describing` refers to something more
 * objective, making the latter suitable for explaining
 * e.g. editorial decisions. 
 * 
 * More motivation types might be added at a later point
 * (`identifying`, `linking`?)
 */
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

export const Annotator = () => {
    const storeCtx = useContext(RdfStoreContext)
    const { targets, setTargets } = useContext(AnnotationContext)

    const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false)
    const [annotationMotivation, setAnnotationMotivation] = useState(AnnotationMotivation.Interpretation)
    const [annotationLevel, setAnnotationLevel] = useState<1 | 2 | 3>(1)
    const [annotationBody, setAnnotationBody] = useState<any>(initialBody)
    const [creator, setCreator] = useState('pfefferniels')

    const editor = useMemo(() => withReact(createEditor()), [])

    const storeAnnotation = () => {
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        const bodyId = uuid()

        // storing the body of the annotation
        const body = store.sym('https://measuring-early-records.org/body_' + bodyId)
        store.add(body, RDF('value'), serialize(annotationBody), body.doc())
        store.add(body, RDF('type'), OA('TextualBody'), body.doc())
        store.add(body, DC('format'), 'application/tei+xml', body.doc())

        // storing the annotation itself
        const annotation = store.sym('https://measuring-early-records.org/annotation_' + uuid());
        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), target, annotation.doc());
        })
        store.add(annotation, OA('hasBody'), body, annotation.doc());
        store.add(annotation, OA('hasMotivation'), ME(annotationMotivation), annotation.doc())
        store.add(annotation, DC('creator'), ME(creator), annotation.doc())
        store.add(annotation, DC('created'), new Date(Date.now()).toISOString(), annotation.doc())
        store.add(annotation, RDF('type'), OA('Annotation'), annotation.doc())

        setAnnotationDialogOpen(false)
        setTargets([])
        setAnnotationBody(initialBody)
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
                            <ul style={{ listStyleType: 'none' }}>
                            </ul>
                        </div>

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
                                value={annotationMotivation}
                                onChange={(e) => {
                                    setAnnotationMotivation(e.target.value as AnnotationMotivation)
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
                                value={annotationLevel}
                                onChange={(e) => {
                                    setAnnotationLevel(e.target.value as (1 | 2 | 3))
                                }}>
                                <MenuItem value={1}>Level 1</MenuItem>
                                <MenuItem value={2}>Level 2</MenuItem>
                                <MenuItem value={3}>Level 3</MenuItem>
                            </Select>
                        </Box>

                        <Slate
                            editor={editor}
                            value={annotationBody}
                            onChange={annotationBody => setAnnotationBody(annotationBody)}>
                            <Editable
                                className='annotation-editor'
                                placeholder='Enter some annotation …'
                                autoFocus />
                        </Slate>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={storeAnnotation}>Save</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

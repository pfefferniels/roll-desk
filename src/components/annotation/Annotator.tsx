import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Typography } from "@mui/material"
import { useContext, useMemo, useState } from "react"
import { createEditor, Node } from "slate"
import { Slate, Editable, withReact } from "slate-react"
import { uuid } from "../../lib/globals"
import { AnnotationContext, RdfStoreContext } from "../../providers"
import * as rdf from "rdflib";

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
    Commenting = 'oa:commenting',
    Describing = 'oa:describing',
    Questioning = 'oa:questioning'
}

const serialize = (nodes: Node[]) => {
    return nodes.map(n => Node.string(n)).join('\n');
}

export const Annotator = () => {
    const storeCtx = useContext(RdfStoreContext)
    const { targets, setTargets } = useContext(AnnotationContext)

    const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false)
    const [annotationMotivation, setAnnotationMotivation] = useState(AnnotationMotivation.Commenting)
    const [annotationBody, setAnnotationBody] = useState<any>([
        {
            type: 'paragraph',
            children: [{
                text: ''
            }]
        }
    ])

    const editor = useMemo(() => withReact(createEditor()), [])

    const storeAnnotation = () => {
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        const OA = new (rdf.Namespace as any)('http://www.w3.org/ns/oa#');
        const RDF = new (rdf.Namespace as any)('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
        const DCTERMS = new (rdf.Namespace as any)('http://purl.org/dc/terms/')

        const bodyId = uuid()

        const annotation = store.sym('https://measuring-early-records.org/annotation_' + uuid());
        const body = store.sym('https://measuring-early-records.org/body_' + bodyId)

        store.add(body, RDF('rdf:value'), serialize(annotationBody), body.doc())

        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), target, annotation.doc());
        })
        store.add(annotation, OA('hasBody'), body, annotation.doc());
        store.add(annotation, OA('hasMotivation'), annotationMotivation, annotation.doc())
        store.add(annotation, DCTERMS('created'), new Date(Date.now()).toISOString(), annotation.doc())

        setAnnotationDialogOpen(false)
        setTargets([])
    }

    if (targets.length === 0) return null

    return (
        <>
            <Button
                variant='contained'
                sx={{ position: 'fixed', bottom: 100, right: 16 }}
                onClick={() => setAnnotationDialogOpen(true)}>
                Annotate
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
                        <Typography>Targets: {targets.join(' | ')}</Typography>

                        <Select
                            size='small'
                            label='motivated by'
                            value={annotationMotivation}
                            onChange={(e) => {
                                setAnnotationMotivation(e.target.value as AnnotationMotivation)
                            }}>
                            <MenuItem value={AnnotationMotivation.Commenting}>Commenting</MenuItem>
                            <MenuItem value={AnnotationMotivation.Describing}>Describing</MenuItem>
                            <MenuItem value={AnnotationMotivation.Questioning}>Questioning</MenuItem>
                        </Select>

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

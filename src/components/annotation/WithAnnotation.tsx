import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Typography } from "@mui/material";
import * as rdf from "rdflib";
import { useContext, useMemo, useState } from "react";
import { RdfStoreContext } from "../../providers/RDFStoreContext";
import { Editable, Slate, withReact } from 'slate-react'
import { createEditor, Node } from "slate";
import { uuid } from "../../lib/globals";

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

export interface WithAnnotationProps {
    onAnnotation?: (annotationTarget: string) => void,
    annotationTarget?: string
}

export function withAnnotation<T extends WithAnnotationProps = WithAnnotationProps>(
    WrappedComponent: React.ComponentType<T>
) {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

    const ComponentWithAnnotation = (props: T) => {
        const storeCtx = useContext(RdfStoreContext);

        const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
        const [annotationTarget, setAnnotationTarget] = useState('unknown');
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
                console.log('couldnt find rdf store');
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

            store.add(annotation, OA('hasTarget'), annotationTarget, annotation.doc());
            store.add(annotation, OA('hasBody'), body, annotation.doc());
            store.add(annotation, OA('hasMotivation'), annotationMotivation, annotation.doc())
            store.add(annotation, DCTERMS('created'), new Date(Date.now()).toISOString(), annotation.doc())

            setAnnotationDialogOpen(false);
        }

        return (
            <>
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
                            <Typography>Target: {annotationTarget}</Typography>

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

                <WrappedComponent
                    onAnnotation={(annotationTarget) => {
                        setAnnotationTarget(annotationTarget)
                        setAnnotationDialogOpen(true)
                    }}
                    {...(props as T)} />;
            </>
        );
    };

    ComponentWithAnnotation.displayName = `withAnnotation(${displayName})`;

    return ComponentWithAnnotation;
}

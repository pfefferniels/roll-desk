import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import * as rdf from "rdflib";
import { useContext, useMemo, useState } from "react";
import { RdfStoreContext } from "../../RDFStoreContext";
import { Editable, Slate, withReact } from 'slate-react'
import { createEditor, Node } from "slate";
import { uuid } from "../../lib/globals";

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
        const [annotationBody, setAnnotationBody] = useState<any>([
            {
                type: 'paragraph',
                children: [{
                    text: 'annotation body'
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
            store.add(annotation, OA('hasMotivation'), 'oa:commenting', annotation.doc())
            store.add(annotation, DCTERMS('created'), new Date(Date.now()).toISOString(), annotation.doc())

            setAnnotationDialogOpen(false);
        }

        return (
            <>
                <Dialog open={annotationDialogOpen}>
                    <DialogTitle>Annotate</DialogTitle>

                    <DialogContent>
                        Target: {annotationTarget}

                        <Slate
                            editor={editor}
                            value={annotationBody}
                            onChange={annotationBody => setAnnotationBody(annotationBody)}>
                            <Editable />
                        </Slate>
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

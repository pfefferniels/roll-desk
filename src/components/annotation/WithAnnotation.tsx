import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import * as rdf from "rdflib";
import { useContext, useMemo, useState } from "react";
import { RdfStoreContext } from "../../RDFStoreContext";
import { Editable, Slate, withReact } from 'slate-react'
import { createEditor } from "slate";

export interface WithAnnotationProps {
    onAnnotation?: (annotationTarget: string) => void,
    annotationTarget?: string
}

export function withAnnotation<T extends WithAnnotationProps = WithAnnotationProps>(
    WrappedComponent: React.ComponentType<T>
) {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

    const ComponentWithAnnotation = (props: Omit<T, keyof WithAnnotationProps>) => {
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

            const oa = new (rdf.Namespace as any)('http://www.w3.org/2006/oa/ns#');

            const annotation = store.sym('https://measuring-early-records.org/annotation123');

            store.add(annotation, oa('hasTarget'), annotationTarget, annotation.doc());
            store.add(annotation, oa('hasBody'), JSON.stringify(annotationBody), annotation.doc());

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

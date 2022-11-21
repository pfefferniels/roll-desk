import { Button } from "@mui/material"
import { useContext, useState } from "react"
import { Node } from "slate"
import { uuid } from "../../lib/globals"
import { RdfStoreContext, AnnotationContext } from "../../providers"
import { EditAnnotationDialog } from "./EditAnnotationDialog"
import { ME, OA, DC, RDF } from "./namespaces"

export const serialize = (nodes: Node[]) => {
    return nodes.map(n => Node.string(n)).join('\n');
}

/**
 * Opens a dialog to either create a new annotation.
 */
export const AnnotatorButton = () => {
    const storeCtx = useContext(RdfStoreContext)
    const { targets, setTargets } = useContext(AnnotationContext)

    const [annotationId, setAnnotationId] = useState<string | null>(null)

    /**
     * Inserts a new annotation object into the graph which
     * then can be opened with the EditAnnotationDialog
     */
    const createAnno = () => {
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const annoId = `annotation_${uuid()}`
        const store = storeCtx.rdfStore;

        // storing the annotation itself
        const annotation = store.sym(ME(annoId));

        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), target, annotation.doc());
        })

        store.add(annotation, OA('hasMotivation'), OA('commenting'), annotation.doc())
        store.add(annotation, DC('creator'), ME('pfefferniels'), annotation.doc())
        store.add(annotation, DC('created'), new Date(Date.now()).toISOString(), annotation.doc())
        store.add(annotation, RDF('type'), OA('Annotation'), annotation.doc())

        setAnnotationId(annoId)
    }

    if (targets.length === 0) return null

    return (
        <>
            <Button
                variant='contained'
                sx={{ position: 'fixed', bottom: 100, right: 16 }}
                onClick={createAnno}>
                Annotate ({targets.length})
            </Button>

            {annotationId && (
                <EditAnnotationDialog
                    dialogOpen={true}
                    onClose={() => {
                        setTargets([])
                        setAnnotationId(null)
                    }}
                    annoId={annotationId || ''} />
            )}
        </>
    )
}

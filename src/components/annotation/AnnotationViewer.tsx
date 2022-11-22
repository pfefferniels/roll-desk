import { Delete, Edit } from "@mui/icons-material";
import { Button, IconButton, List, ListItem, ListItemText, Paper } from "@mui/material";
import * as rdf from "rdflib"
import { NamedNode } from "rdflib";
import { SubjectType } from "rdflib/lib/types";
import { useContext, useEffect, useState } from "react";
import { downloadFile } from "../../lib/globals";
import { RdfStoreContext } from "../../providers";
import { EditAnnotationDialog } from "./EditAnnotationDialog";
import { OA, RDF } from "./namespaces";

export default function AnnotationViewer() {
    const storeCtx = useContext(RdfStoreContext)

    const [serialized, setSerialized] = useState('')
    const [annotations, setAnnotations] = useState<{ node: rdf.NamedNode, name: string, extract: string }[]>([])
    const [annotationToEdit, setAnnotationToEdit] = useState<rdf.NamedNode>()

    useEffect(() => {
        if (!storeCtx) return

        const rdfString = rdf.serialize(null, storeCtx.rdfStore)
        if (serialized === rdfString) return

        const store = storeCtx.rdfStore
        setAnnotations(
            store
                .statementsMatching(undefined, RDF('type'), OA('Annotation'))
                .map(statement => {
                    const name = statement.subject.toString()
                    let extracts: string[] = []
                    const bodyStmts = store.statementsMatching(statement.subject, OA('hasBody'))
                    bodyStmts.forEach(bodyStmt => {
                        const body = store.anyStatementMatching(bodyStmt?.object as SubjectType, RDF('value'))
                        const text = body?.object.toString()
                        extracts.push(text?.slice(0, 100) || '')
                    })

                    return {
                        node: statement.subject as NamedNode,
                        name: name,
                        extract: extracts.join(' […], ')
                    }
                })
        )
        setSerialized(rdfString!)
    })

    return (
        <div>
            <Paper style={{ position: 'fixed', padding: '0.5rem', right: '0.5rem' }}>
                <Button
                    onClick={() => {
                        downloadFile('annotations.ttl', serialized, 'text/turtle')
                    }}
                    variant='outlined'>Download Annotations</Button>
            </Paper>

            <List sx={{
                maxWidth: '400px'
            }}>
                {annotations.map((annotation, i) => {
                    return (
                        <ListItem
                            key={`annotationViewer_annot_${i}`}
                            secondaryAction={
                                <>
                                    <IconButton
                                        edge="end"
                                        aria-label="edit"
                                        onClick={() => setAnnotationToEdit(annotation.node)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => {
                                            // TODO: also remove body
                                            storeCtx!.rdfStore.removeMany(annotation.node)
                                            setAnnotations(
                                                [...annotations.slice(0, i), ...annotations.slice(i+1)]
                                            )
                                        }}>
                                        <Delete />
                                    </IconButton>
                                </>
                            }>
                            <ListItemText
                                primary={annotation.name}
                                secondary={annotation.extract} />
                        </ListItem>
                    )
                })}
            </List>

            {annotationToEdit && (
                <EditAnnotationDialog
                    dialogOpen={true}
                    onClose={() => setAnnotationToEdit(undefined)}
                    annotation={annotationToEdit} />
            )}
        </div>
    )
}

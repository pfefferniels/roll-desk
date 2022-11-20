import { Edit } from "@mui/icons-material";
import { Button, IconButton, List, ListItem, ListItemText, Paper } from "@mui/material";
import { maxWidth } from "@mui/system";
import * as rdf from "rdflib"
import { SubjectType } from "rdflib/lib/types";
import { useContext, useEffect, useState } from "react";
import { downloadFile } from "../../lib/globals";
import { RdfStoreContext } from "../../providers";

const RDF = new (rdf.Namespace as any)('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
const OA = new (rdf.Namespace as any)('http://www.w3.org/ns/oa#')

export default function AnnotationViewer() {
    const storeCtx = useContext(RdfStoreContext)

    const [serialized, setSerialized] = useState('')
    const [annotations, setAnnotations] = useState<{ name: string, extract: string }[]>([])

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
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => {
                                        // ...
                                    }}>
                                    <Edit />
                                </IconButton>
                            }>
                            <ListItemText
                                primary={annotation.name}
                                secondary={annotation.extract} />
                        </ListItem>
                    )
                })}
            </List>
        </div>
    )
}

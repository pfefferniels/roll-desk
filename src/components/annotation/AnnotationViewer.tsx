import { Delete, Edit, FileUpload } from "@mui/icons-material";
import FileDownload from "@mui/icons-material/FileDownload";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Paper } from "@mui/material";
import { Box } from "@mui/system";
import * as rdf from "rdflib"
import { NamedNode } from "rdflib";
import { SubjectType } from "rdflib/lib/types";
import { useContext, useEffect, useState } from "react";
import { downloadFile } from "../../lib/globals";
import { RdfStoreContext } from "../../providers";
import { EditAnnotationDialog } from "./EditAnnotationDialog";
import { OA, RDF } from "./namespaces";

interface ImportAnnotationDialogProps {
    dialogOpen: boolean
    setDialogOpen: (dialogOpen: boolean) => void
}

const ImportAnnotationDialog: React.FC<ImportAnnotationDialogProps> = ({ dialogOpen, setDialogOpen }) => {
    const [file, setFile] = useState<string>()
    const storeCtx = useContext(RdfStoreContext)

    const upload = (source: HTMLInputElement) => {
        if (!source || !source.files || source.files.length === 0) {
            return
        }
        const file = source.files[0]
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
            const content = fileReader.result as string
            setFile(content)
        };
        fileReader.readAsText(file)
    }

    const store = () => {
        if (!file) return 
        if (!storeCtx) return

        rdf.parse(file, storeCtx.rdfStore, 'http://example.org', 'text/turtle')
    }

    return (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Import Annotations</DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
                    <input
                        style={{
                            display: 'none'
                        }}
                        type='file'
                        id='alignment-input'
                        className='alignment-file'
                        accept='.ttl'
                        onChange={(e) => upload(e.target as HTMLInputElement)}
                    />
                    <label
                        htmlFor="alignment-input">
                        <Button variant="outlined" color="primary" component="span">
                            Upload annotations
                        </Button>
                    </label>

                    {file && <i className='note'>ready</i>}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                    store()
                    setDialogOpen(false)
                }}>Import</Button>
            </DialogActions>
        </Dialog>
    )
}

export default function AnnotationViewer() {
    const storeCtx = useContext(RdfStoreContext)

    const [serialized, setSerialized] = useState('')
    const [annotations, setAnnotations] = useState<{ node: rdf.NamedNode, name: string, extract: string }[]>([])
    const [annotationToEdit, setAnnotationToEdit] = useState<rdf.NamedNode>()
    const [importAnnotationDialogOpen, setImportAnnotationDialogOpen] = useState(false)

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
            <ImportAnnotationDialog
                dialogOpen={importAnnotationDialogOpen}
                setDialogOpen={setImportAnnotationDialogOpen} />

            <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
                    <IconButton onClick={() => setImportAnnotationDialogOpen(true)}>
                        <FileUpload />
                    </IconButton>

                    <IconButton onClick={() => {
                        downloadFile('annotations.ttl', serialized, 'text/turtle')
                    }}>
                        <FileDownload />
                    </IconButton>
                </Box>
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
                                                [...annotations.slice(0, i), ...annotations.slice(i + 1)]
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

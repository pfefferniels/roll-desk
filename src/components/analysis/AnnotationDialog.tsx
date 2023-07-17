import { Thing, addUrl, asUrl, buildThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, CircularProgress } from "@mui/material"
import { useContext, useMemo, useState } from "react"
import { createEditor, Node } from "slate";
import { Editable, Slate, withReact } from 'slate-react'
import './AnnotationDialog.css'
import { RDF } from "@inrupt/vocab-common-rdf"
import { crm, oa } from "../../helpers/namespaces"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { SaveOutlined } from "@mui/icons-material";

const serialize = (nodes: Node[]) => {
    return nodes.map(n => Node.string(n)).join('\n');
}

interface AnnotationDialogProps {
    analysis: Thing
    object: Thing
    open: boolean
    onClose: () => void
}

export const AnnotationDialog = ({ analysis, object, open, onClose }: AnnotationDialogProps) => {
    const { session } = useSession()
    const { solidDataset, setDataset } = useContext(DatasetContext)

    const [saving, setSaving] = useState(false)
    const [annotationBody, setAnnotationBody] = useState<any>([
        {
            type: 'paragraph',
            children: [{
                text: ''
            }]
        }
    ])

    const editor = useMemo(() => withReact(createEditor()), [])

    const saveToPod = async () => {
        if (!solidDataset) return

        setSaving(true)
        const annotation = buildThing()
            .addUrl(RDF.type, oa('Annotation'))
            .addUrl(RDF.type, crm('D29_Annotation_Object'))
            .addStringNoLocale(oa('hasBody'), serialize(annotationBody))
            .addUrl(oa('hasTarget'), asUrl(object))

        let modifiedDataset = setThing(solidDataset, annotation.build())
        modifiedDataset = setThing(solidDataset,
            addUrl(analysis, crm('P9_consists_of'), annotation.build()))

        setDataset(
            await saveSolidDatasetAt(getSourceUrl(solidDataset)!, modifiedDataset, { fetch: session.fetch as any })
        )
        setSaving(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Annotate</DialogTitle>

            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
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
                <Button
                    startIcon={saving ? <CircularProgress /> : <SaveOutlined />}
                    variant='contained'
                    disabled={saving}
                    onClick={() => {
                        saveToPod()
                        onClose()
                    }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
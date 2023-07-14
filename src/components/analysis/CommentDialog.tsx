import { SolidDataset, Thing, getSourceUrl, getStringNoLocale, saveSolidDatasetAt, setStringNoLocale, setThing } from "@inrupt/solid-client";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { crm } from "../../helpers/namespaces";
import { Save } from "@mui/icons-material";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";

interface CommentDialogProps {
    thing: Thing
    open: boolean
    onClose: () => void
}

export const CommentDialog = ({ thing, open, onClose }: CommentDialogProps) => {
    const { session } = useSession()
    const { solidDataset, setDataset } = useContext(DatasetContext)
    const [text, setText] = useState(getStringNoLocale(thing, crm('P3_has_note')) || '')
    const [loading, setLoading] = useState(false)

    useEffect(() => setText(getStringNoLocale(thing, crm('P3_has_note')) || ''), [thing])

    const saveToPod = async () => {
        if (!solidDataset) return

        setLoading(true)
        const modifiedDataset = setThing(
            solidDataset,
            setStringNoLocale(thing, crm('P3_has_note'), text)
        )
        setDataset(
            await saveSolidDatasetAt(getSourceUrl(solidDataset)!, modifiedDataset, { fetch: session.fetch as any })
        )
        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add/Edit Comment</DialogTitle>
            <DialogContent>
                <TextField
                    multiline
                    fullWidth
                    label='Note'
                    value={text}
                    onChange={e => setText(e.target.value)} />
            </DialogContent>
            <DialogActions>
                <Button
                    variant='contained'
                    startIcon={<Save />}
                    onClick={async () => {
                        await saveToPod()
                        onClose()
                    }}>
                    {loading ? <CircularProgress /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
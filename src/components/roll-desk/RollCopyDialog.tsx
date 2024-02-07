import { Thing, addStringNoLocale, addUrl, buildThing, createThing, getSourceUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { RDF } from "@inrupt/vocab-common-rdf";
import { MusicNote } from "@mui/icons-material";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, Stack, TextField, Typography, Select, MenuItem, Divider } from "@mui/material";
import { useCallback, useContext, useState } from "react";
import { crm, frbroo } from "../../helpers/namespaces"
import { v4 } from "uuid";

interface RollCopyDialogProps {
    // The F5 item. Pass it if you want to edit
    // details.
    item?: Thing

    // The expression to which attach the F5 Item to.
    attachTo?: Thing
    open: boolean
    onClose: () => void
    onDone: (item: Thing, rollAnalysis: string) => void
}

/**
 * Attaches the physical copy as an item to its
 * expressions and creates an expression if none
 * exists yet.
 */
export const RollCopyDialog = ({ item, attachTo, open, onClose, onDone }: RollCopyDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)
    const [file, setFile] = useState<File | null>(null);
    const [type, setType] = useState<'welte-red' | 'welte-green'>('welte-red')
    const [title, setTitle] = useState<string>('')
    const [loading, setLoading] = useState<'saving-item' | false>(false)

    const saveToPod = useCallback(async () => {
        if (!worksDataset) {
            console.log('No valid works dataset given')
            return
        }

        const containerUrl = getSourceUrl(worksDataset)
        if (!containerUrl) {
            console.log('unable to determine URL of the given dataset')
            return
        }

        let itemThing = buildThing(item || createThing({
            url: `${containerUrl}#${v4()}`
        }))
            .addUrl(RDF.type, frbroo('F5_Item'))
            .addUrl(crm('P2_has_type'), `https://linked-rolls.org/skos/${type}`)
            .build()

        if (title) {
            itemThing = addStringNoLocale(itemThing, crm('P102_has_title'), title)
        }

        let updatedDataset = worksDataset

        if (attachTo) {
            itemThing = addUrl(itemThing, frbroo('R7_is_example_of'), attachTo)
            const updatedExpression = buildThing(attachTo)
                .addUrl(frbroo('R7i_has_example'), itemThing)
                .build()
            updatedDataset = setThing(updatedDataset, updatedExpression)
        }

        updatedDataset = setThing(updatedDataset, itemThing)

        setLoading('saving-item')
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))
        setLoading(false)

        return itemThing
    }, [attachTo, item, session.fetch, setWorksDataset, title, type, worksDataset])

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add or Edit Roll Copy</DialogTitle>
            <DialogContent>
                <Stack spacing={2} p={1}>
                    <Typography>Physical Description</Typography>
                    <Select
                        size='small'
                        value={type}
                        onChange={(e) => setType(e.target.value as 'welte-red' | 'welte-green')}>
                        <MenuItem value='welte-red'>Welte red (100)</MenuItem>
                        <MenuItem value='welte-green'>Welte green</MenuItem>
                    </Select>
                    <TextField
                        size='small'
                        label='Title'
                        value={title}
                        onChange={e => setTitle(e.target.value)} />
                    <i>Note: The title is given only to easily recognize the roll copy.</i>
                    <Divider flexItem />
                    <Button variant="contained" component="label" startIcon={< MusicNote />}>
                        Upload Roll Analysis
                        <input
                            type="file"
                            hidden
                            accept=".txt"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={async () => {
                    const persistedItem = await saveToPod()
                    console.log('persisted item=', persistedItem)
                    if (!persistedItem) return
                    onDone(persistedItem, await file?.text() || '')
                    onClose()
                }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}


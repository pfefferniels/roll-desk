import { useState } from "react";
import { useDataset, useSession } from "@inrupt/solid-ui-react";
import { buildThing, createThing, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { RDF, RDFS } from "@inrupt/vocab-common-rdf";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

const CRM = "http://www.cidoc-crm.org/cidoc-crm/"
const FRBROO = "http://erlangen-crm.org/efrbroo/"

export const AddWorkDialog = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void; }) => {
    const [label, setLabel] = useState('');
    const { dataset } = useDataset();
    const { session } = useSession();

    const saveToPod = () => {
        const thing = buildThing(createThing())
            .addUrl(RDF.type, `${FRBROO}F1_Work`)
            .addStringNoLocale(RDFS.label, label)
            .build();

        if (!dataset) {
            console.warn('No dataset found to save the new work to.');
            return;
        }

        const modifiedDataset = setThing(dataset, thing);
        saveSolidDatasetAt('https://pfefferniels.inrupt.net/notes/test.ttl', modifiedDataset, { fetch: session.fetch as any });
    };

    return (
        <Dialog open={open}>
            <DialogTitle>Add Work</DialogTitle>

            <DialogContent>
                <TextField
                    placeholder={'Label'}
                    onChange={(e) => {
                        setLabel(e.target.value);
                    }} />
            </DialogContent>

            <DialogActions>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                    saveToPod();
                    setOpen(false);
                }}>Add</Button>
            </DialogActions>
        </Dialog>
    );
};

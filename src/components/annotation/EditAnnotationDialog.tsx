import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { uuid } from "../../lib/globals";
import { RdfStoreContext } from "../../providers";
import { Delete } from "@mui/icons-material";
import { AnnotationBody } from "./AnnotationBody";
import { ME, OA, DC, RDF } from "./namespaces";


export interface EditAnnotationDialogProps {
    annoId: string;
    dialogOpen: boolean;
    onClose: () => void;
}
/**
 * Opens a dialog to either create a new annotation.
 */

export const EditAnnotationDialog: React.FC<EditAnnotationDialogProps> = ({ annoId, dialogOpen, onClose }) => {
    const storeCtx = useContext(RdfStoreContext);

    const [targets, setTargets] = useState<string[]>([]);
    const [bodyIds, setBodyIds] = useState<string[]>([]);
    const [creator, setCreator] = useState('pfefferniels');

    useEffect(() => {
        // Load the given annotation ID from the store and fill the state accordingly
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        // storing the annotation itself
        setTargets(
            store.statementsMatching(ME(annoId), OA('hasTarget'))
                .map(statement => statement.object.toString()));
        setBodyIds(
            store.statementsMatching(ME(annoId), OA('hasBody'))
                .map(statement => statement.object.toString()));
        setCreator(
            store.anyStatementMatching(ME(annoId), DC('creator'))?.object.toString() || ''
        );
    }, []);

    const store = () => {
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        // make sure not to set the same annotation twice
        store.removeDocument(store.sym(ME(annoId)).doc());

        // storing the annotation itself
        const annotation = store.sym(ME(annoId));

        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), ME(target), annotation.doc());
        });

        bodyIds.forEach(bodyId => {
            store.add(annotation, OA('hasBody'), ME(bodyId), annotation.doc());
        });

        store.add(annotation, OA('hasMotivation'), OA('commenting'), annotation.doc());
        store.add(annotation, DC('creator'), creator, annotation.doc());
        store.add(annotation, DC('created'), new Date(Date.now()).toISOString(), annotation.doc());
        store.add(annotation, RDF('type'), OA('Annotation'), annotation.doc());
    };

    if (targets.length === 0)
        return null;

    return (
        <Dialog
            fullWidth
            maxWidth="md"
            open={dialogOpen}
            onClose={onClose}>
            <DialogTitle>Annotate</DialogTitle>

            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column'
                    }}
                >
                    <div>
                        Targets:

                        <List dense>
                            {targets.map((target, i) => (
                                <ListItem
                                    key={`target_${i}`}
                                    secondaryAction={<IconButton
                                        edge="end"
                                        aria-label="delete"
                                        disabled={targets.length === 1}
                                        onClick={() => {
                                            setTargets([
                                                ...targets.slice(0, targets.indexOf(target)),
                                                ...targets.slice(targets.indexOf(target) + 1)
                                            ]);
                                        }}>
                                        <Delete />
                                    </IconButton>}
                                >
                                    {target}
                                </ListItem>))}
                        </List>
                    </div>

                    {bodyIds.map(bodyId => <AnnotationBody key={bodyId} bodyId={bodyId} />)}

                    <Button
                        onClick={() => {
                            setBodyIds(
                                [...bodyIds,
                                `body_${uuid()}`]
                            );
                        }}
                    >Add Body</Button>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => {
                    store();
                    onClose();
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

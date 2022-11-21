import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { uuid } from "../../lib/globals";
import { RdfStoreContext } from "../../providers";
import { Delete } from "@mui/icons-material";
import { AnnotationBody } from "./AnnotationBody";
import { ME, OA, DC, RDF } from "./namespaces";
import { Literal, NamedNode } from "rdflib";

export interface EditAnnotationDialogProps {
    annotation: NamedNode;
    dialogOpen: boolean;
    onClose: () => void;
}

/**
 * Opens a dialog to either create a new annotation.
 * 
 * @note The prop annoId should be a full IRI.
 */
export const EditAnnotationDialog: React.FC<EditAnnotationDialogProps> = ({ annotation, dialogOpen, onClose }) => {
    const storeCtx = useContext(RdfStoreContext);

    const [targets, setTargets] = useState<(NamedNode | Literal)[]>([]);
    const [bodies, setBodies] = useState<NamedNode[]>([]);
    const [creator, setCreator] = useState<NamedNode>();

    useEffect(() => {
        // Load the given annotation ID from the store and fill the state accordingly
        if (!storeCtx) {
            console.warn('could not find RDF store');
            return;
        }

        const store = storeCtx.rdfStore;

        // storing the annotation itself
        setTargets(
            store.statementsMatching(annotation, OA('hasTarget'))
                .map(statement => {
                    return statement.object as Literal
                }));
        setBodies(
            store.statementsMatching(annotation, OA('hasBody'))
                .map(statement => statement.object as NamedNode));
        setCreator(
            store.anyStatementMatching(annotation, DC('creator'))?.object as NamedNode || undefined
        );
    }, []);

    const store = () => {
        if (!storeCtx) {
            console.warn('Failed loading RDF store')
            return
        }

        const store = storeCtx.rdfStore

        // make sure not to set the same annotation twice
        store.removeMany(annotation)

        console.log(store.statementsMatching(annotation))

        // storing the annotation itself
        targets.forEach(target => {
            store.add(annotation, OA('hasTarget'), target, annotation.doc());
        });

        bodies.forEach(body => {
            store.add(annotation, OA('hasBody'), body, annotation.doc());
        });

        store.add(annotation, OA('hasMotivation'), OA('commenting'), annotation.doc());
        store.add(annotation, DC('creator'), creator, annotation.doc());
        store.add(annotation, DC('created'), new Date(Date.now()).toISOString(), annotation.doc());
        store.add(annotation, RDF('type'), OA('Annotation'), annotation.doc());
    }

    const createBody = () => {
        if (!storeCtx) {
            console.warn('Failed loading RDF store')
            return
        }

        const store = storeCtx.rdfStore
        
        return store.sym(ME(`body_${uuid()}`))
    }

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
                                    {target.toString()}
                                </ListItem>))}
                        </List>
                    </div>

                    {bodies.map(body => <AnnotationBody key={`body_${body.value}`} body={body} />)}

                    <Button
                        onClick={() => {
                            setBodies(
                                [...bodies,
                                createBody()!]
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

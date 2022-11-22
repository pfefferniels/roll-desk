import { Box, Button, MenuItem, Paper, Select } from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { createEditor } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import { RdfStoreContext } from "../../providers";
import { serialize } from "./AnnotatorButton";
import { ME, RDF, OA, DC } from "./namespaces";
import { AnnotationMotivation } from "./AnnotationMotivation";
import { NamedNode } from "rdflib";

export type AnnotationLevel = 1 | 2 | 3

const deserialize = (raw: string) => {
    return ([
        {
            type: 'paragraph',
            children: [{
                text: raw
            }]
        }
    ]
    )
}

interface AnnotationBodyProps {
    body: NamedNode;
}

/**
 * UI to edit an existing annotation body or to create a new one.
 */
export const AnnotationBody: React.FC<AnnotationBodyProps> = ({ body }) => {
    const storeCtx = useContext(RdfStoreContext);

    const [purpose, setPurpose] = useState<AnnotationMotivation>(AnnotationMotivation.Interpretation);
    const [level, setLevel] = useState<AnnotationLevel>(1);
    const [text, setText] = useState<any[]>(deserialize(
        storeCtx!.rdfStore.anyStatementMatching(body, RDF('value'))?.object.toString() || ''
    ));
    const [changedSinceLastSave, setChangedSinceLastSave] = useState(false);

    const editor = useMemo(() => withReact(createEditor()), []);
    editor.children = text

    const store = () => {
        if (!storeCtx) {
            console.warn('Failed retrieving RDF store.');
            return;
        }

        const store = storeCtx.rdfStore;

        // make sure not to set the same body twice
        store.removeMany(body)

        // storing the body of the annotation
        store.add(body, RDF('value'), serialize(text), body.doc());
        store.add(body, RDF('type'), OA('TextualBody'), body.doc());
        store.add(body, DC('format'), 'application/tei+xml', body.doc());
        store.add(body, OA('hasPurpose'), ME(purpose), body.doc());
        store.add(body, ME('hasAnnotationLevel'), ME(`level_${level}`), body.doc());
    };

    return (
        <Box
            component={Paper}
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                flexDirection: 'column',
                padding: '1rem',
                marginTop: '1rem'
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: 'row',
                }}>
                <Select
                    size='small'
                    label='motivated by'
                    value={purpose}
                    onChange={(e) => {
                        setChangedSinceLastSave(true);
                        setPurpose(e.target.value as AnnotationMotivation);
                    }}>
                    <MenuItem value={AnnotationMotivation.Technique}>Technique</MenuItem>
                    <MenuItem value={AnnotationMotivation.Form}>Form</MenuItem>
                    <MenuItem value={AnnotationMotivation.Intratext}>Intratext</MenuItem>
                    <MenuItem value={AnnotationMotivation.Intertext}>Intertext</MenuItem>
                    <MenuItem value={AnnotationMotivation.Context}>Context</MenuItem>
                    <MenuItem value={AnnotationMotivation.Interpretation}>Interpretation</MenuItem>
                    <MenuItem value={AnnotationMotivation.Questions}>Questions</MenuItem>
                    <MenuItem value={AnnotationMotivation.Variants}>Variants</MenuItem>
                </Select>
                <Select
                    size='small'
                    label='level'
                    value={level}
                    onChange={(e) => {
                        setChangedSinceLastSave(true);
                        setLevel(e.target.value as AnnotationLevel);
                    }}>
                    <MenuItem value={1}>Level 1</MenuItem>
                    <MenuItem value={2}>Level 2</MenuItem>
                    <MenuItem value={3}>Level 3</MenuItem>
                </Select>
            </Box>

            <Slate
                editor={editor}
                value={text}
                onChange={text => {
                    setText(text)
                    setChangedSinceLastSave(true);
                }}>
                <Editable
                    className='annotation-editor'
                    placeholder='Enter some annotation …'
                    autoFocus />
            </Slate>

            <Button
                onClick={() => {
                    store();
                    setChangedSinceLastSave(false);
                }}
                disabled={!changedSinceLastSave}>Save</Button>
        </Box>
    );
};

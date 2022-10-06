import { Button, Paper } from "@mui/material";
import * as rdf from "rdflib"
import { useContext } from "react";
import { RdfStoreContext } from "../RDFStoreContext";

export default function Annotations() {
    const storeCtx = useContext(RdfStoreContext)

    return (
        <div>
            <Paper style={{ position: 'fixed', padding: '0.5rem', right: '0.5rem' }}>
                <Button variant='outlined'>Download Annotations</Button>
            </Paper>

            {storeCtx && (
                <pre>
                    ${rdf.serialize(null, storeCtx.rdfStore)}
                </pre>
            )}
        </div>
    )
}

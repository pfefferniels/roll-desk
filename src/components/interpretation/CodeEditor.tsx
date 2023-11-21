import { Button, Stack } from "@mui/material";
import { XMLEditor } from "./XMLEditor"
import Grid2 from '@mui/system/Unstable_Grid';
import { Thing } from "@inrupt/solid-client";
import { useState } from "react";
import { GenerateMPMDialog } from "./GenerateMPMDialog";
import { MPM, parseMPM } from "mpm-ts";
import { MEI } from "../../lib/mei";
import { loadVerovio } from "../../lib/loadVerovio.mjs";
import { AutoGraph, CompareArrows, Delete } from "@mui/icons-material";
import { EnrichmentDialog } from "./EnrichmentDialog";
import { enrichMEI } from "../../lib/mei/enrichMEI";

const initialMPM = `
<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="https://github.com/axelberndt/MPM/releases/latest/download/mpm.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="https://github.com/axelberndt/MPM/releases/latest/download/mpm.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
<mpm xmlns="http://www.cemfi.de/mpm/ns/1.0">
    <performance name="a performance" pulsesPerQuarter="720">
        <global>
            <header></header>
            <dated></dated>
        </global>
    </performance>
</mpm>`

interface CodeEditorProps {
    onSaveMPM: (mpm: MPM) => void
    onSaveMEI: (mei: MEI) => void
    mpm?: MPM
    mei?: MEI
    alignment?: Thing
}

export const CodeEditor = ({ onSaveMPM, onSaveMEI, mpm, mei, alignment }: CodeEditorProps) => {
    const [generateMPMOpen, setGenerateMPMOpen] = useState(false)
    const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false)

    const removePerformanceInstructions = () => {
        if (!mei) return
        mei?.removeAllMarks()
        onSaveMEI(mei)
    }

    return (
        <>
            <Grid2 spacing={2} container>
                <Grid2 xs={12}>
                    <Stack sx={{ mt: 1}} spacing={1} direction='row'>
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<AutoGraph />}
                            disabled={!alignment}
                            onClick={() => setGenerateMPMOpen(true)}>
                            Generate MPM
                        </Button>
                        <Button
                            variant='outlined'
                            size='small'
                            onClick={removePerformanceInstructions}
                            startIcon={<Delete />}>
                            Remove performance instructions from MEI
                        </Button>
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<CompareArrows />}
                            onClick={() => setEnrichmentDialogOpen(true)}>
                            Enrich MEI from MPM
                        </Button>
                    </Stack>
                </Grid2>
                <Grid2 xs={6}>
                    <XMLEditor
                        text={mpm?.serialize() || initialMPM}
                        onSave={text => onSaveMPM(parseMPM(text))} />
                </Grid2>
                <Grid2 xs={6}>
                    <XMLEditor
                        text={mei?.asString() || ''}
                        onSave={async (text) => {
                            const verovio = await loadVerovio()
                            onSaveMEI(new MEI(text, verovio, new DOMParser()))
                        }} />
                </Grid2>
            </Grid2>

            {alignment && <GenerateMPMDialog
                alignment={alignment}
                open={generateMPMOpen}
                onClose={() => setGenerateMPMOpen(false)}
                onCreate={(_, mpm) => onSaveMPM(mpm)}
            />}

            <EnrichmentDialog
                open={enrichmentDialogOpen}
                onClose={() => setEnrichmentDialogOpen(false)}
                onDone={(options) => {
                    if (!mpm || !mei) return
                    onSaveMEI(enrichMEI(mpm, mei))
                    setEnrichmentDialogOpen(false)
                }} />
        </>
    )
}
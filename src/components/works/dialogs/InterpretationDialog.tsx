import { Thing, UrlString, asUrl, buildThing, createThing, getSourceUrl, getStringNoLocale, getThing, getThingAll, getUrl, getUrlAll, overwriteFile, saveSolidDatasetAt, setThing } from "@inrupt/solid-client";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { DCTERMS, OWL, RDF, RDFS } from "@inrupt/vocab-common-rdf";
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, CircularProgress, Stack, Typography, TextField } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { crm, crmdig, frbroo, mer } from "../../../helpers/namespaces";
import { datasetUrl } from "../../../helpers/datasetUrl";
import { v4 } from "uuid";
import { Cutout } from "linked-rolls/lib/.ldo/rollo.typings";

interface InterpretationDialogProps {
    // the expression
    interpretation?: Thing

    // the mer:Roll to which attach 
    // the interpretation to when creating
    // and the cutout which it annotates
    attachToRoll?: Thing
    cutout?: UrlString

    open: boolean
    onClose: () => void
}

export const InterpretationDialog = ({ interpretation, attachToRoll, cutout, open, onClose }: InterpretationDialogProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)

    const [meiFile, setMEIFile] = useState<File | null>(null)
    const [title, setTitle] = useState<string>()
    const [authorName, setAuthorName] = useState<string>()
    const [authorLink, setAuthorLink] = useState<UrlString>()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!worksDataset || !interpretation) return 

        setTitle(getStringNoLocale(interpretation, crm('P102_has_title')) || undefined)

        const creationUrl = getUrl(interpretation, crm('R19i_was_realised_through'))
        if (!creationUrl) return 

        const creation = getThing(worksDataset, creationUrl)
        if (!creation) return

        const actorUrl = getUrl(creation, crm('P14_carried_out_by'))
        if (!actorUrl) return

        const actor = getThing(worksDataset, actorUrl)
        if (!actor) return

        setAuthorLink(getUrl(actor, OWL.sameAs) || undefined)
        setAuthorName(getStringNoLocale(actor, crm('P141_is_identified_by')) || undefined)
    }, [worksDataset, interpretation, open])

    const saveToPod = async () => {
        if (!worksDataset) {
            console.log('No valid works dataset given')
            return
        }

        const containerUrl = getSourceUrl(worksDataset)
        if (!containerUrl) {
            console.log('unable to determine URL of the given dataset')
            return
        }

        const interpretationThing = buildThing(interpretation || createThing())
            .setUrl(RDF.type, frbroo('F1_Work'))
            .setUrl(crm('P2_has_type'), mer('Interpretation'))
            .setStringNoLocale(crm('P102_has_title'), title || '')

        if (attachToRoll) {
            interpretationThing.setUrl(frbroo('R2_is_derivative_of'), attachToRoll)
        }

        if (cutout) {
            interpretationThing.setUrl(crmdig('L43_annotates'), cutout)
        }

        const mpmThing = buildThing(createThing())
            .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('MPM'))

        const scoreThing = buildThing(createThing())
            .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
            .addUrl(RDF.type, crmdig('D1_Digital_Object'))
            .addUrl(crm('P2_has_type'), mer('DigitalScore'))

        const alignmentThing = buildThing(createThing())
            .addUrl(RDF.type, frbroo('F22_Self_Contained_Expression'))
            .addUrl(crm('P2_has_type'), mer('Alignment'))

        if (meiFile) {
            // TODO: use private pod instead
            const meiUrl = `${datasetUrl}/${v4()}.mei`

            setLoading(true)
            const savedFile = await overwriteFile(meiUrl, meiFile, { fetch: session.fetch as any })
            if (savedFile) {
                scoreThing.addUrl(RDFS.label, meiUrl)
            }
        }

        // try to find an existing person in the dataset
        let actor = authorLink && getThingAll(worksDataset)
            .find(thing => getUrlAll(thing, OWL.sameAs).includes(authorLink))

        // if that did not succeed, create a new entity
        if (!actor) {
            actor = buildThing()
                .addUrl(RDF.type, frbroo('E21_Person'))
                .addUrl(OWL.sameAs, authorLink || session.info.webId!)
                .addStringNoLocale(crm('P141_is_identified_by'), authorName || '')
                .build()
        }

        // Cf. https://cidoc-crm.org/sites/default/files/Roles.pdf 
        // on how to define different roles. For now, P2 has note
        // should be used if the constellations are more complex.
        const creationEvent = buildThing()
            .addUrl(RDF.type, frbroo('F28_Expression_Creation'))
            .addUrl(crm('P14_carried_out_by'), actor)
            .addDatetime(DCTERMS.created, new Date(Date.now()))
            .addUrl(frbroo('R17_created'), mpmThing.build())
            .addUrl(frbroo('R17_created'), scoreThing.build())
            .addUrl(frbroo('R17_created'), alignmentThing.build())

        mpmThing.addUrl(frbroo('R17i_was_created_by'), creationEvent.build())
        scoreThing.addUrl(frbroo('R17i_was_created_by'), creationEvent.build())
        alignmentThing.addUrl(frbroo('R17i_was_created_by'), creationEvent.build())

        let updatedDataset = setThing(worksDataset, mpmThing.build())
        updatedDataset = setThing(updatedDataset, scoreThing.build())
        updatedDataset = setThing(updatedDataset, alignmentThing.build())

        if (attachToRoll) {
            creationEvent.addUrl(frbroo('R19_created_a_realisation_of'), interpretationThing.build())

            const updatedInterpretation = interpretationThing
                .addUrl(frbroo('R12_is_realised_in'), asUrl(mpmThing.build(), containerUrl))
                .addUrl(frbroo('R12_is_realised_in'), asUrl(scoreThing.build(), containerUrl))
                .addUrl(frbroo('R12_is_realised_in'), asUrl(alignmentThing.build(), containerUrl))
                .addUrl(frbroo('R19i_was_realised_through'), creationEvent.build())
                .build()

            updatedDataset = setThing(updatedDataset, updatedInterpretation)
        }
        updatedDataset = setThing(updatedDataset, actor)
        updatedDataset = setThing(updatedDataset, creationEvent.build())

        setLoading(true)
        setWorksDataset(await saveSolidDatasetAt(containerUrl, updatedDataset, { fetch: session.fetch as any }))
        setLoading(false)
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{interpretation ? 'Edit' : 'Add'} Interpretation</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    <TextField
                        fullWidth
                        variant='filled'
                        size='small'
                        label='Title'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)} />

                    <TextField
                        fullWidth
                        variant='filled'
                        size='small'
                        label='Author'
                        value={authorName}
                        placeholder='John Doe'
                        onChange={(e) => setAuthorName(e.target.value)} />

                    <TextField
                        fullWidth
                        variant='filled'
                        size='small'
                        label='Link (e.g. to ORCID)'
                        value={authorLink}
                        placeholder={session.info.webId || 'https://…'}
                        onChange={(e) => setAuthorLink(e.target.value)} />

                    <Typography>
                        <i>
                            If no link is specified, the currently
                            logged-in user is assumed to be the author.
                        </i>
                    </Typography>
                    <TextField fullWidth variant='filled' size='small' label='Date' />
                    <Typography>
                        <i>If not specifed, the current date will be assumed.</i>
                    </Typography>
                    <Stack direction='row' spacing={2}>
                        <Button variant="contained" component="label">
                            Upload MEI
                            <input
                                type="file"
                                hidden
                                accept=".mei"
                                onChange={(e) => setMEIFile(e.target.files ? e.target.files[0] : null)}
                            />
                        </Button>
                        <Typography>
                            <i>If no MEI is specified, an empty skeleton will be
                                created which can be edited at a later stage.</i>
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button variant='outlined' onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    disabled={loading}
                    onClick={async () => {
                        await saveToPod()
                        onClose()
                    }}>
                    {loading ? <CircularProgress /> : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    )
}


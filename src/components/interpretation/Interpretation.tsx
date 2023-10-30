import { useEffect, useState } from "react"
import { CircularProgress, IconButton, Paper, Snackbar, Stack } from "@mui/material"
import { Thing, getDatetime, getFile, getSolidDataset, getSourceUrl, getStringNoLocale, getStringNoLocaleAll, getThing, getUrl, getUrlAll, overwriteFile, saveSolidDatasetAt, setThing, setUrl } from "@inrupt/solid-client"
import { useDataset, useSession, useThing } from "@inrupt/solid-ui-react"
import { crm, frbroo, mer } from "../../helpers/namespaces"
import { DCTERMS, RDFS } from "@inrupt/vocab-common-rdf"
import { MEI } from "../../lib/mei"
import { loadVerovio } from "../../lib/loadVerovio.mjs"
import { MPM, parseMPM } from "mpmify"
import { enrichMEI } from "../../lib/mei/enrichMEI"
import * as d3 from 'd3';
import { DownloadDialog } from "./DownloadDialog"
import { ArrowBack, AutoGraph, Code, Edit, FileDownload, PlayArrow, Settings } from "@mui/icons-material"
import { GenerateMPMDialog } from "./GenerateMPMDialog"
import { datasetUrl } from "../../helpers/datasetUrl"
import { v4 } from "uuid"
import { XMLEditor } from "./XMLEditor"
import { useNavigate } from "react-router-dom"

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

const addGlow = (svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>) => {
    //Container for the gradients
    var defs = svg.append("defs");

    //Filter for the outside glow
    const filter = defs.append("filter")
        .attr("id", "glow");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "10")
        .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "coloredBlur");
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");

    svg.selectAll("[data-resp]")
        .style('fill', 'orange')
        .style("filter", "url(#glow)");
}

interface InterpretationProps {
    interpretationUrl: string
}

export const Interpretation = ({ interpretationUrl }: InterpretationProps) => {
    const { session } = useSession()
    const navigate = useNavigate()

    const { dataset } = useDataset(interpretationUrl, { fetch: session.fetch as any })
    const { thing: interpretation } = useThing(interpretationUrl, interpretationUrl, { fetch: session.fetch as any })

    const [realisations, setRealisations] = useState<Thing[]>([])

    const [mpm, setMPM] = useState<MPM>()
    const [mei, setMEI] = useState<MEI>()
    const [alignment, setAlignment] = useState<Thing>()

    const [message, setMessage] = useState<string>()
    const [downloadOpen, setDownloadOpen] = useState(false)
    const [generateMPMOpen, setGenerateMPMOpen] = useState(false)
    const [xmlMode, setXMLMode] = useState((false))

    const saveMPM = async (mpm: MPM) => {
        if (!dataset) return

        setMessage('Saving MPM ...')
        setMPM(mpm)

        const mpmRealisation =
            realisations.find(realisation => getUrlAll(realisation, crm('P2_has_type')).includes(mer('MPM')))

        if (!mpmRealisation) {
            setMessage('Unable to find existing MPM realisation')
            return
        }

        let fileUrl = getUrl(mpmRealisation, RDFS.label)
        if (!fileUrl) {
            fileUrl = `${datasetUrl}/${v4()}.mpm`
            const modifiedMpmExpression = setUrl(mpmRealisation, RDFS.label, fileUrl)
            const modifiedDataset = setThing(dataset, modifiedMpmExpression)
            await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
        }

        await overwriteFile(fileUrl, new Blob([mpm.serialize()], {
            type: 'application/xml'
        }), { fetch: session.fetch as any })

        setMessage('MPM successfully saved')
    }

    useEffect(() => {
        const loadRealisations = async () => {
            if (!interpretation || !dataset) return

            const realisationUrls = getUrlAll(interpretation, frbroo('R12_is_realised_in'))

            for (const realisationUrl of realisationUrls) {
                const realisation = getThing(dataset, realisationUrl)
                if (!realisation) {
                    console.log('Unable to resolve realisation', realisationUrl)
                    continue
                }

                setRealisations(prev => [...prev, realisation])

                const type = getUrl(realisation, crm('P2_has_type'))

                if (type === mer('DigitalScore')) {
                    const fileUrl = getUrl(realisation, RDFS.label)
                    setMessage(`Loading MEI file ${fileUrl}`)

                    const meiContents = await getFile(fileUrl || '', { fetch: session.fetch as any })
                    if (!meiContents) {
                        console.log('Unable to load contents of MPM', realisation)
                        continue
                    }

                    setMEI(new MEI(await meiContents.text(), await loadVerovio(), new DOMParser()))
                }
                else if (type === mer('MPM')) {
                    const fileUrl = getUrl(realisation, RDFS.label)
                    setMessage(`Loading MPM file ${fileUrl}`)

                    const mpmContents = await getFile(fileUrl || '', { fetch: session.fetch as any })
                    if (!mpmContents) {
                        console.log('Unable to load contents of MPM', realisation)
                        continue
                    }

                    setMPM(parseMPM(await mpmContents.text()))
                }
                else if (type === mer('Alignment')) {
                    setMessage(`Loading alignment pairs from ${realisationUrl}`)
                    const alignmentDataset = await getSolidDataset(realisationUrl, { fetch: session.fetch as any })
                    const alignmentThing = getThing(alignmentDataset, realisationUrl)
                    if (alignmentThing) {
                        setAlignment(alignmentThing)
                        setMessage(`Alignment pairs succesfully loaded.`)
                    }
                }
            }

            if (mpm && mei) {
                setMEI(enrichMEI(mpm, mei))
            }
        }

        loadRealisations()
    }, [session.fetch, interpretation, dataset])

    if (!interpretation) {
        return <CircularProgress />
    }

    const title = getStringNoLocale(interpretation, crm('P102_has_title')) || '[no title]'
    const note = getStringNoLocaleAll(interpretation, crm('P3_has_note')) || '[no note]'
    const date = getDatetime(interpretation, DCTERMS.created)
    const author = getUrl(interpretation, crm('P14_carried_out_by')) || '[no author]'

    return (
        <>
            <Snackbar
                open={!!message}
                onClose={() => setMessage(undefined)}
                message={message} />

            <IconButton onClick={() => navigate('/works')}>
                <ArrowBack />
            </IconButton>

            <Paper sx={{ padding: 2, margin: 2 }}>
                <Stack direction='row' spacing={2}>
                    <div>
                        <div><b>{title}</b></div>
                        <div>({author}, {date?.toString() || '[no date]'})</div>
                    </div>

                    <Paper>
                        <IconButton
                            disabled={!alignment}
                            onClick={() => setGenerateMPMOpen(true)}>
                            <AutoGraph />
                        </IconButton>
                        <IconButton onClick={() => setXMLMode(!xmlMode)}>
                            <Code />
                        </IconButton>
                        <IconButton disabled={!mpm && !mei}>
                            <Edit />
                        </IconButton>
                        <IconButton>
                            <PlayArrow />
                        </IconButton>
                        <IconButton onClick={() => setDownloadOpen(true)}>
                            <FileDownload />
                        </IconButton>
                        <IconButton>
                            <Settings />
                        </IconButton>
                    </Paper>
                </Stack>

                <div>
                    <b>Notes:</b>
                    <p>
                        {note}
                    </p>
                </div>

                {xmlMode ?
                    <XMLEditor text={mpm?.serialize() || initialMPM} onSave={text => saveMPM(parseMPM(text))} />
                    : (mei && <div dangerouslySetInnerHTML={{__html: mei.asSVG()}} />)
                }
            </Paper>

            {mei && mpm && (
                <DownloadDialog
                    open={downloadOpen}
                    onClose={() => setDownloadOpen(false)}
                    mpm={mpm}
                    mei={mei}
                />
            )}

            {alignment && <GenerateMPMDialog
                alignment={alignment}
                open={generateMPMOpen}
                onClose={() => setGenerateMPMOpen(false)}
                onCreate={(_, mpm) => saveMPM(mpm)}
            />}
        </>
    )
}

import { useEffect, useState } from "react"
import { CircularProgress, IconButton, Paper, Snackbar, Stack, ToggleButton } from "@mui/material"
import Grid2 from '@mui/system/Unstable_Grid';
import { SolidDataset, Thing, getDatetime, getFile, getSolidDataset, getSourceUrl, getStringNoLocale, getStringNoLocaleAll, getThing, getUrl, getUrlAll, overwriteFile, saveSolidDatasetAt, setStringNoLocale, setThing, setUrl } from "@inrupt/solid-client"
import { useSession } from "@inrupt/solid-ui-react"
import { crm, frbroo, mer } from "../../helpers/namespaces"
import { DCTERMS, RDFS } from "@inrupt/vocab-common-rdf"
import { MEI } from "../../lib/mei"
import { loadVerovio } from "../../lib/loadVerovio.mjs"
import { MPM, parseMPM } from "mpmify"
import * as d3 from 'd3';
import { DownloadDialog } from "./DownloadDialog"
import { ArrowBack, Code, FileDownload, PlayArrow, Settings } from "@mui/icons-material"
import { datasetUrl } from "../../helpers/datasetUrl"
import { v4 } from "uuid"
import { useNavigate } from "react-router-dom"
import { NotesEditor } from "./NotesEditor"
import { CodeEditor } from "./CodeEditor"
import { Overlay } from "./Overlay";
import { asMSM } from "../../lib/mei/asMSM";

const addGlow = (svg: d3.Selection<d3.BaseType, unknown, HTMLElement, any>) => {
    console.log('adding glow to svg', svg)
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

    const [dataset, setDataset] = useState<SolidDataset>()
    const [interpretation, setInterpretation] = useState<Thing>()

    const [realisations, setRealisations] = useState<Thing[]>([])

    const [mpm, setMPM] = useState<MPM>()
    const [mei, setMEI] = useState<MEI>()
    const [alignment, setAlignment] = useState<Thing>()

    const [message, setMessage] = useState<string>()
    const [hoveredInstruction, setHoveredInstruction] = useState<{ meiEl: Element, mpmEl: string } | null>(null)
    const [downloadOpen, setDownloadOpen] = useState(false)
    const [xmlMode, setXMLMode] = useState(false)
    const [scoreSVG, setScoreSVG] = useState<string>()

    const getInstructionInfo = (mpmId: string) => {
        if (!mpm) return
        const mpmFragment = new DOMParser().parseFromString(mpm.serialize(), 'application/xml')
        const mpmEl = mpmFragment.querySelector(`[*|id='${mpmId.slice(1)}']`)
        if (!mpmEl) return
        return new XMLSerializer()
            .serializeToString(mpmEl)
            .replace(/xmlns="[^"]+"/, '')
            .replace(/xml:id="[^"]+"/, '')
            .replace(/type="[^"]+"/, '')
    }

    const saveNote = async (note: string) => {
        if (!interpretation || !dataset) return

        const updatedInterpretation = setStringNoLocale(interpretation, crm('P3_has_note'), note)
        const updatedDataset = setThing(dataset, updatedInterpretation)
        setDataset(
            await saveSolidDatasetAt(interpretationUrl, updatedDataset, { fetch: session.fetch as any })
        )
    }

    const saveMEI = async (mei: MEI) => {
        if (!dataset) return

        setMessage('Saving MEI ...')
        setMEI(mei)

        const meiRealisation =
            realisations.find(realisation => getUrlAll(realisation, crm('P2_has_type')).includes(mer('DigitalScore')))

        if (!meiRealisation) {
            setMessage('Unable to find existing MEI realisation')
            return
        }

        let fileUrl = getUrl(meiRealisation, RDFS.label)
        if (!fileUrl) {
            setMessage(`No existing MEI file linked. Creating a new one ...`)
            fileUrl = `${datasetUrl}/${v4()}.mei`
            const modifiedMpmExpression = setUrl(meiRealisation, RDFS.label, fileUrl)
            const modifiedDataset = setThing(dataset, modifiedMpmExpression)
            setDataset(
                await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
            )
        }

        await overwriteFile(fileUrl, new Blob([mei.asString()], {
            type: 'application/xml'
        }), { fetch: session.fetch as any })

        setMessage('MEI successfully saved')
    }

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
            setDataset(
                await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
            )
        }

        await overwriteFile(fileUrl, new Blob([mpm.serialize()], {
            type: 'application/xml'
        }), { fetch: session.fetch as any })

        setMessage('MPM successfully saved')
    }

    const play = async () => {
        if (!mpm || !mei) return

        const request = {
            mpm: mpm.serialize(),
            msm: asMSM(mei).serialize()
        }

        console.log('request:', request)

        const response = await fetch(`http://localhost:8080/convert`, {
            method: 'POST',
            body: JSON.stringify(request)
        })

        console.log(await response.text())
    }

    useEffect(() => {
        setTimeout(() => {
            addGlow(d3.select('#verovio svg'))
            document.querySelectorAll('[data-corresp]').forEach(meiEl => {
                console.log(meiEl)
                meiEl.addEventListener('mouseover', () => {
                    setHoveredInstruction({
                        meiEl,
                        mpmEl: meiEl.getAttribute('data-corresp') || ''
                    })
                })
                meiEl.addEventListener('mouseleave', () => {
                    setHoveredInstruction(null)
                })
            })
        }, 1000)
    }, [scoreSVG])

    useEffect(() => {
        const loadDataset = async () => {
            const solidDataset = await getSolidDataset(interpretationUrl, { fetch: session.fetch as any })
            setDataset(solidDataset)
        }

        loadDataset()
    }, [session.fetch, interpretationUrl])

    useEffect(() => {
        const loadInterpretation = async () => {
            if (!dataset) return
            const interpretationThing = getThing(dataset, interpretationUrl)
            if (interpretationThing) {
                setInterpretation(interpretationThing)
            }
        }

        loadInterpretation()
    }, [dataset, interpretationUrl])

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

                    const updatedMEI = new MEI(await meiContents.text(), await loadVerovio(), new DOMParser())
                    setMEI(updatedMEI)
                    setScoreSVG(updatedMEI.asSVG())
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
                        <ToggleButton color='primary' value='check' selected={xmlMode} onChange={() => setXMLMode(!xmlMode)}>
                            <Code />
                        </ToggleButton>
                        <IconButton onClick={play}>
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

                {xmlMode ?
                    <CodeEditor
                        alignment={alignment}
                        mei={mei}
                        mpm={mpm}
                        onSaveMEI={saveMEI}
                        onSaveMPM={saveMPM} />
                    : (
                        <Grid2 spacing={2} container>
                            <Grid2 xs={8}>
                                <div id='verovio' dangerouslySetInnerHTML={{ __html: scoreSVG || 'Loading ...'}} />
                            </Grid2>
                            <Grid2 xs={4}>
                                <NotesEditor notes={note[0] || ''} save={(content) => saveNote(content)} />
                            </Grid2>
                        </Grid2>
                    )
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

            <Overlay anchorEl={hoveredInstruction?.meiEl}>
                <div style={{ margin: '1rem' }}>
                    <code>
                        {hoveredInstruction && getInstructionInfo(hoveredInstruction.mpmEl)}
                    </code>
                </div>
            </Overlay>
        </>
    )
}

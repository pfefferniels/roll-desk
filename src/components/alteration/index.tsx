import { getContentType, getFile, getSourceUrl, getStringNoLocale, getUrl, isRawData, Thing } from "@inrupt/solid-client"
import { useSession } from "@inrupt/solid-ui-react"
import { RDFS } from "@inrupt/vocab-common-rdf"
import { PlayArrowRounded } from "@mui/icons-material"
import { Button, IconButton, Typography } from "@mui/material"
import { useState } from "react"
import { loadVerovio } from "../../lib/globals"
import { RawPerformance } from "../../lib/midi"
import { FindEntity } from "../network-overview/FindEntity"
import { read } from "midifile-ts"
import { MIDIViewer } from "../grids/MIDIViewer"

type SelectionMode = 'score' | 'midi'

/**
 * The formal alteration editor allows to specify how a performer 
 * alters the formal structure of a score. It will insert a bunch
 * of `FormalAlteration` entities into the graph and create a new 
 * MEI file with <section>s and <expansion> added to the original 
 * file.
 */
export const FormalAlterationEditor = () => {
    const { session } = useSession()
    const [entityFinderOpen, setEntityFinderOpen] = useState(false)
    const [selectionMode, setSelectionMode] = useState<SelectionMode>()

    const [svg, setSVG] = useState()
    const [performance, setPerformance] = useState<RawPerformance>()

    const handleFindEntity = (type: SelectionMode) => {
        setSelectionMode(type)
        setEntityFinderOpen(true)
    }

    const renderMIDI = async (thing: Thing) => {
        const fileURL = getStringNoLocale(thing, RDFS.label)
        console.log('fileurl=', fileURL)
        if (!fileURL) return

        try {
            const file = await getFile(fileURL, { fetch: session.fetch })
            if (!isRawData(file)) {
                console.warn('The resource should not be a dataset and should have the MIME type "application/xml"')
            }
            setPerformance(new RawPerformance(read(await file.arrayBuffer())))
        }
        catch (e) {
            console.warn(e)
        }
    }

    const renderMEI = async (thing: Thing) => {
        const fileURL = getUrl(thing, RDFS.label)
        if (!fileURL) return

        try {
            const file = await getFile(fileURL, { fetch: session.fetch })
            if (!isRawData(file) || getContentType(file) !== 'application/xml') {
                console.warn('The resource should not be a dataset and should have the MIME type "application/xml"')
            }

            // load the MEI file into verovio
            const meiData = await file.text()
            const vrvToolkit = await loadVerovio()
            vrvToolkit.setOptions({
                pageHeight: document.body.clientHeight,
                pageWidth: document.body.clientWidth,
                adjustPageHeight: true,
                svgHtml5: true
            })
            vrvToolkit.loadData(meiData)

            // render to SVG and save it as a state
            const svg = vrvToolkit.renderToSVG(1)
            setSVG(svg)
        } catch (err) {
            console.warn(err)
        }
    }

    return (
        <div>
            <Typography>
                Here you can encode a particular structure of formal alterations
                which a performer applied to a given score.
            </Typography>

            <div>
                <Button onClick={() => handleFindEntity('score')}>Choose Score</Button>
                <Button onClick={() => handleFindEntity('midi')}>Choose MIDI</Button>
            </div>

            <IconButton>
                <PlayArrowRounded />
            </IconButton>

            <div style={{width: '80vw'}} dangerouslySetInnerHTML={{__html: svg || ''}} />

            {performance && <MIDIViewer piece={performance} width={800} height={400} />}
            
            <div>
                <h3>Alterations Overview</h3>
            </div>

            <FindEntity
                type='http://www.cidoc-crm.org/cidoc-crm/E31_Document'
                open={entityFinderOpen}
                onClose={() => setEntityFinderOpen(false)}
                onFound={(thing: Thing) => {
                    if (selectionMode === 'midi') {
                        renderMIDI(thing)
                    }
                    else if (selectionMode === 'score') {
                        renderMEI(thing)
                    }
                }} />
        </div>
    )
}
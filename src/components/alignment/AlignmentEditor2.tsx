import { Thing, UrlString, addUrl, asUrl, buildThing, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { useDataset, useSession, useThing } from "@inrupt/solid-ui-react"
import { useEffect, useRef, useState } from "react"
import { crm, frbroo, mer } from "../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { ScoreViewer } from "../score/ScoreViewer"
import MidiViewer from "../midi-ld/MidiViewer"
import { PairContainer } from "./PairContainer"
import { Button, IconButton, Snackbar } from "@mui/material"
import { ArrowBack, Edit } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"

interface AlignmentEditorProps {
  interpretationUrl: string
}

export const AlignmentEditor = ({ interpretationUrl }: AlignmentEditorProps) => {
  const session = useSession()
  const navigate = useNavigate()

  const { dataset } = useDataset(interpretationUrl, { fetch: session.fetch as any })
  const { thing: interpretation } = useThing(interpretationUrl, interpretationUrl, { fetch: session.fetch as any })

  const [meiUrl, setMEIUrl] = useState<UrlString>()
  const [midiUrl, setMIDIUrl] = useState<UrlString>()

  const [pairs, setPairs] = useState<Thing[]>([])
  const [alignment, setAlignment] = useState<Thing>()

  const [selectedScoreNote, setSelectedScoreNote] = useState<UrlString>()
  const [selectedMIDINote, setSelectedMIDINote] = useState<UrlString>()

  const [message, setMessage] = useState<string>()

  const parentRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!dataset || !interpretation) return

      // find digital score and existing alignment pairs among the realisations
      const realisationUrls = getUrlAll(interpretation, frbroo('R12_is_realised_in'))
      for (const realisationUrl of realisationUrls) {
        const realisation = getThing(dataset, realisationUrl)
        if (!realisation) continue

        const types = getUrlAll(realisation, crm('P2_has_type'))
        if (types.includes(mer('DigitalScore'))) {
          const label = getUrl(realisation, RDFS.label)
          if (label) setMEIUrl(label)
        }
        else if (types.includes(mer('Alignment'))) {
          const pairUrls = getUrlAll(realisation, crm('P9_consists_of'))
          const pairThings = pairUrls.map(pairUrl => getThing(dataset, pairUrl)).filter(pair => !!pair)
          setPairs(pairThings as Thing[])
          setAlignment(realisation)
        }
      }

      // find the MIDI
      const rollUrl = getUrl(interpretation, frbroo('R2_is_derivative_of'))
      setMessage(`Loading MIDI for roll ${rollUrl}`)
      if (!rollUrl) return

      const rollDataset = await getSolidDataset(rollUrl, { fetch: session.fetch as any })
      if (!rollDataset) return

      const rollThing = getThing(rollDataset, rollUrl)
      if (!rollThing) return

      const rollCopyUrl = getUrl(rollThing, frbroo('R12_is_realised_in'))
      if (!rollCopyUrl) return

      const rollCopy = getThing(rollDataset, rollCopyUrl)
      if (!rollCopy) return

      const rollCopyLabel = getUrl(rollCopy, RDFS.label)
      if (!rollCopyLabel) return

      setMIDIUrl(rollCopyLabel)
      setMessage(`Done.`)
    }

    loadData()
  }, [interpretation, dataset, session.fetch])

  useEffect(() => {
    if (!dataset || !alignment || !selectedMIDINote || !selectedScoreNote) return

    setMessage(`creating new pair with ${selectedMIDINote} and ${selectedScoreNote}`)

    const savePair = async () => {
      setMessage(`Saving pair ...`)
      const newPair = buildThing()
        .addUrl(RDF.type, mer('AlignmentPair'))
        .addUrl(mer('has_score_note'), `${meiUrl}#${selectedScoreNote}`)
        .addUrl(mer('has_midi_note'), selectedMIDINote)
        .build()

      setPairs(prev => [...prev, newPair])
      console.log('add to pairs', newPair)

      const updatedAlignment = buildThing(alignment)
        .addUrl(crm('P9_consists_of'), newPair)
        .setUrl(mer('has_score'), meiUrl || '')
        .setUrl(mer('has_recording'), midiUrl || '')
        .build()

      let updatedDataset = setThing(dataset, newPair)
      updatedDataset = setThing(dataset, updatedAlignment)
      await saveSolidDatasetAt(getSourceUrl(dataset)!, updatedDataset, { fetch: session.fetch as any })
      setMessage(`Pair succesfully saved`)

      setSelectedMIDINote(undefined)
      setSelectedScoreNote(undefined)
    }

    savePair()
  }, [selectedMIDINote, selectedScoreNote, alignment, dataset, meiUrl, session.fetch])

  return (
    <>
      <Snackbar message={message} open={!!message} />

      <IconButton onClick={() => navigate('/works')}>
        <ArrowBack />
      </IconButton>

      <IconButton>
        <Edit />
      </IconButton>

      <Button variant='contained'>Perform Alignment</Button>

      <svg ref={parentRef} width={1000} height={1000}>
        <svg height={300}>
          {meiUrl && (
            <ScoreViewer
              asSvg
              url={meiUrl}
              landscape
              onSelect={(noteId) => setSelectedScoreNote(noteId)}
              onDone={() => { }} />
          )}
        </svg>

        <svg height={800} transform="translate(0, 200)">
          {midiUrl && (
            <MidiViewer
              asSvg
              url={midiUrl}
              onDone={() => { }}
              onSelect={(event) => event && setSelectedMIDINote(asUrl(event))} />
          )}
        </svg>

        <g id='pairs'>
          <PairContainer
            pairs={pairs}
            parentRef={parentRef.current} />
        </g>
      </svg>
    </>
  )
}
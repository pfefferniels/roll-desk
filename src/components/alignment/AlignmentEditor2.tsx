import { Thing, UrlString, addUrl, asUrl, buildThing, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, removeThing, removeUrl, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { useDataset, useSession, useThing } from "@inrupt/solid-ui-react"
import { useEffect, useRef, useState } from "react"
import { crm, frbroo, mer } from "../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { ScoreViewer } from "../score/ScoreViewer"
import MidiViewer from "../midi-ld/MidiViewer"
import { PairContainer } from "./PairContainer"
import { Button, IconButton, Paper, Snackbar } from "@mui/material"
import { ArrowBack, Edit } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { PianoRoll, ScoreFollower } from "alignmenttool"
import { MEI } from "../../lib/mei"

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

  const [pianoRoll, setPianoRoll] = useState<PianoRoll>()
  const [mei, setMEI] = useState<MEI>()

  const [pairs, setPairs] = useState<Thing[]>([])
  const [alignment, setAlignment] = useState<Thing>()

  const [selectedScoreNote, setSelectedScoreNote] = useState<UrlString>()
  const [selectedMIDINote, setSelectedMIDINote] = useState<UrlString>()

  const [rollDone, setRollDone] = useState(false)
  const [scoreDone, setScoreDone] = useState(false)
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
      updatedDataset = setThing(updatedDataset, updatedAlignment)
      await saveSolidDatasetAt(getSourceUrl(dataset)!, updatedDataset, { fetch: session.fetch as any })
      setMessage(`Pair succesfully saved`)

      setSelectedMIDINote(undefined)
      setSelectedScoreNote(undefined)
    }

    savePair()
  }, [selectedMIDINote, selectedScoreNote, alignment, dataset, meiUrl, midiUrl, session.fetch])

  const performAlignment = async () => {
    if (!mei || !pianoRoll) return
    const sf = new ScoreFollower(mei.asHMM(), 4)
    const matches = sf.getMatchResult(pianoRoll).events.map(match => {
      const newPair = buildThing()
        .addUrl(RDF.type, mer('AlignmentPair'))
        .addUrl(mer('has_score_note'), `${meiUrl}#${match.meiId}`)
        .addUrl(mer('has_midi_note'), match.id)
        .build()
      return newPair
    })

    setPairs(matches)
    setMessage('Pairs interpolated.')

    if (!alignment || !dataset) return

    const chunkSize = 100;
    let modifiedDataset = dataset
    let modifiedAlignment: Thing | null = alignment

    setMessage(`Removing existing pairs`)
    const alignmentsToRemove = getUrlAll(alignment, crm('P9_consists_of'))
    for (let i = 0; i < alignmentsToRemove.length; i += chunkSize) {
      const chunk = alignmentsToRemove.slice(i, i + chunkSize);

      for (const pairToRemove of chunk) {
        modifiedAlignment = removeUrl(alignment, crm('P9_consists_of'), pairToRemove)
        modifiedDataset = removeThing(modifiedDataset, pairToRemove)
      }

      modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
      modifiedDataset = await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
    }

    const thingsAdded = []
    for (let i = 0; i < matches.length; i += chunkSize) {
      const chunk = matches.slice(i, i + chunkSize);

      for (const pairThing of chunk) {
        modifiedDataset = setThing(modifiedDataset, pairThing)
        thingsAdded.push(pairThing)
      }
      modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
      modifiedDataset = await saveSolidDatasetAt(getSourceUrl(modifiedDataset)!, modifiedDataset, { fetch: session.fetch as any })
      setMessage(`Saving chunk ${i}-${i + chunkSize}`)
    }

    modifiedAlignment = getThing(modifiedDataset, asUrl(alignment))
    if (!modifiedAlignment) return

    for (const thing of thingsAdded) {
      modifiedAlignment = addUrl(modifiedAlignment, crm('P9_consists_of'), thing)
    }

    setMessage(`Updating alignment ...`)
    modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
    modifiedDataset = await saveSolidDatasetAt(getSourceUrl(modifiedDataset)!, modifiedDataset, { fetch: session.fetch as any })

    setAlignment(modifiedAlignment)
    setMessage('Done saving alignment.')
  }

  return (
    <>
      <Snackbar message={message} open={!!message} />

      <Paper sx={{ p: 1, width: 'fit-content', ml: 1 }}>
        <IconButton onClick={() => navigate('/works')}>
          <ArrowBack />
        </IconButton>

        <IconButton>
          <Edit />
        </IconButton>

        <Button
          variant='contained'
          onClick={performAlignment}>Perform Alignment</Button>
      </Paper>

      <svg ref={parentRef} width={1000} height={1000}>
        <svg height={200}>
          {meiUrl && (
            <ScoreViewer
              asSvg
              url={meiUrl}
              landscape
              onSelect={(noteId) => setSelectedScoreNote(noteId)}
              onDone={(mei) => {
                setMEI(mei)
                setScoreDone(true)
              }} />
          )}
        </svg>

        <svg height={800} transform="translate(0, 200)">
          {midiUrl && (
            <MidiViewer
              asSvg
              url={midiUrl}
              onDone={(pr) => {
                setPianoRoll(pr)
                setRollDone(true)
              }}
              onSelect={(event) => event && setSelectedMIDINote(asUrl(event))} />
          )}
        </svg>

        <g id='pairs'>
          <PairContainer
            ready={rollDone && scoreDone}
            pairs={pairs}
            parentRef={parentRef.current} />
        </g>
      </svg>
    </>
  )
}
import { Thing, UrlString, addUrl, asUrl, buildThing, getFile, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, removeThing, removeUrl, saveSolidDatasetAt, setThing, setUrl } from "@inrupt/solid-client"
import { useDataset, useSession, useThing } from "@inrupt/solid-ui-react"
import { useEffect, useRef, useState } from "react"
import { crm, frbroo, mer } from "../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import MidiViewer from "../roll-o/MidiViewer"
import { PairContainer } from "./PairContainer"
import { Button, IconButton, Paper } from "@mui/material"
import { ArrowBack, Edit } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import Matcher, { Match, MatchResult, NoteEvent, NoteEventVector, MidiNoteVector } from "alignmenttool"
import { MEI } from "../../lib/mei"
import { useSnackbar } from "../../providers/SnackbarContext"
import { loadVerovio } from "../../lib/loadVerovio.mjs"

interface AlignmentEditorProps {
  interpretationUrl: string
}

export const AlignmentEditor = ({ interpretationUrl }: AlignmentEditorProps) => {
  const session = useSession()
  const navigate = useNavigate()
  const { setMessage } = useSnackbar()

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

  const parentRef = useRef<SVGSVGElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

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
          if (label) {
            setMEIUrl(label)
            getFile(label, { fetch: session.fetch as any })
              .then(blob => blob.text())
              .then(async text => {
                const mei_ = new MEI(text, await loadVerovio(), new DOMParser())
                setMEI(mei_)
                svgRef.current!.innerHTML = mei_.asSVG({
                  adjustPageWidth: true,
                  adjustPageHeight: true,
                  svgHtml5: true,
                  pageWidth: 60000,
                  breaks: 'none'
                })

                setTimeout(() => {
                  const defScale = svgRef.current?.querySelector('.definition-scale')
                  if (!defScale) return

                  const viewBox = defScale.getAttribute('viewBox')
                  if (!viewBox) return

                  const width = viewBox.split(' ')[3]
                  if (!width) return

                  const canvas = document.querySelector('#verovio-canvas')
                  if (!canvas) return

                  canvas.setAttribute('width', (+width / 2).toString())
                }, 500)
              })
          }
        }
        else if (types.includes(mer('Alignment'))) {
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
  }, [interpretation, dataset, session.fetch, setMessage])

  // everytime the alignment changes, fetch its pairs
  useEffect(() => {
    if (!alignment || !dataset) return

    const pairUrls = getUrlAll(alignment, crm('P9_consists_of'))
    const pairThings = pairUrls.map(pairUrl => getThing(dataset, pairUrl)).filter(pair => !!pair)
    setPairs(pairThings as Thing[])
  }, [alignment, dataset])

  useEffect(() => {
    if (!dataset || !selectedMIDINote || !selectedScoreNote) return

    setMessage(`creating new pair with ${selectedMIDINote} and ${selectedScoreNote}`)

    const savePair = async () => {
      let updatedAlignment = alignment
      if (!updatedAlignment) {
        setMessage(`Creating new alignment object`)
        updatedAlignment = buildThing().build()
      }

      updatedAlignment = buildThing(updatedAlignment)
        .setUrl(mer('has_score'), meiUrl || '')
        .setUrl(mer('has_recording'), midiUrl || '')
        .build()

      setMessage(`Saving pair ...`)
      const newPair = buildThing()
        .addUrl(RDF.type, mer('AlignmentPair'))
        .addUrl(mer('has_score_note'), `${meiUrl}#${selectedScoreNote}`)
        .addUrl(mer('has_midi_note'), selectedMIDINote)
        .build()

      setPairs(prev => [...prev, newPair])

      updatedAlignment = buildThing(updatedAlignment)
        .addUrl(crm('P9_consists_of'), newPair)
        .build()

      let updatedDataset = setThing(dataset, newPair)
      updatedDataset = setThing(updatedDataset, updatedAlignment)
      await saveSolidDatasetAt(getSourceUrl(dataset)!, updatedDataset, { fetch: session.fetch as any })
      setMessage(`Pair succesfully saved`)

      setSelectedMIDINote(undefined)
      setSelectedScoreNote(undefined)
    }

    savePair()
  }, [selectedMIDINote, selectedScoreNote, alignment, dataset, meiUrl, midiUrl, session.fetch, setMessage])

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

    // make sure that score and MIDI file are properly attached 
    // to the alignment
    modifiedAlignment = setUrl(modifiedAlignment, mer('has_score'), meiUrl || '')
    modifiedAlignment = setUrl(modifiedAlignment, mer('has_recording'), midiUrl || '')

    setMessage(`Updating alignment ...`)
    modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
    modifiedDataset = await saveSolidDatasetAt(getSourceUrl(modifiedDataset)!, modifiedDataset, { fetch: session.fetch as any })

    setAlignment(modifiedAlignment)
    setMessage('Done saving alignment.')
  }

  const removePair = async (pair: Thing) => {
    if (!dataset || !alignment) return

    setMessage(`Removing pair`)
    let modifiedDataset = removeThing(dataset, pair)
    let modifiedAlignment = getThing(modifiedDataset, asUrl(alignment))
    if (!modifiedAlignment) return

    modifiedAlignment = removeUrl(modifiedAlignment, crm('P9_consists_of'), asUrl(pair))
    modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
    setAlignment(modifiedAlignment)

    setMessage(`Saving ...`)
    await saveSolidDatasetAt(getSourceUrl(modifiedDataset)!, modifiedDataset, { fetch: session.fetch as any })
    setMessage(`Done.`)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mei) return

      const verovioCanvas = document.getElementById('verovio-canvas')
      if (!verovioCanvas) return

      const notes = verovioCanvas.getElementsByClassName('note')
      for (const note of notes) {
        note.addEventListener('click', () => {
          setSelectedScoreNote(note.getAttribute('data-id') || undefined)
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [mei])

  return (
    <>
      <Paper sx={{ p: 1, width: 'fit-content', ml: 1 }}>
        <IconButton onClick={() => navigate('/')}>
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
        <svg height={200} width={2000} id='verovio-canvas' ref={svgRef} />

        <svg height={800} transform="translate(0, 200)">
          {midiUrl && (
            <MidiViewer
              asSvg
              url={midiUrl}
              onDone={setPianoRoll}
              onSelect={(event) => event && setSelectedMIDINote(asUrl(event))}
            />
          )}
        </svg>

        <g id='pairs'>
          <PairContainer
            ready={(pianoRoll && mei) !== undefined}
            pairs={pairs}
            parentRef={parentRef.current}
            onRemove={removePair}
          />
        </g>
      </svg>
    </>
  )
}
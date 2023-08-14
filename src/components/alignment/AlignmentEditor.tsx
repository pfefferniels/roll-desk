import { SolidDataset, Thing, UrlString, addUrl, asUrl, buildThing, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, overwriteFile, removeAll, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useCallback, useEffect, useRef, useState } from 'react';
import { oa, mer, crm, crmdig } from '../../helpers/namespaces';
import { CircularProgress, IconButton, Link, Tooltip } from '@mui/material';
import { ArrowBack, FastForward, PlayArrow, SaveOutlined } from '@mui/icons-material';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import MidiViewer from '../midi-ld/MidiViewer';
import { ScoreViewer } from '../score/ScoreViewer';
import './AlignmentEditor.css'
import { MEI } from '../../lib/mei';
import { HMM, PianoRoll, ScoreFollower } from 'alignmenttool';
import { useNavigate } from 'react-router-dom';
import { PairContainer } from './PairContainer';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { PairDataContext } from '../../providers/PairData';
import { MEIContext } from '../../providers/MEIContext';

const findScoreTimeOfNote = (hmm: HMM, meiId: string) => {
  const result = hmm.events.find(
    event => event.clusters.findIndex(
      cluster => cluster.findIndex(note => note.meiID === meiId) !== -1)
      !== -1)?.scoreTime
  if (result === undefined) return -1
  return result
}

const buildPair = (midiEvent: Thing | UrlString | null, meiId: UrlString | null) => {
  const annotation = buildThing()
    .addUrl(RDF.type, oa('Annotation'))
    .addUrl(RDF.type, crmdig('D29_Annotation_Object'))
    .addUrl(crm('P2_has_type'), mer('AlignmentPair'))

  if (midiEvent) {
    annotation.addUrl(oa('hasBody'), midiEvent)
  }

  if (meiId) {
    annotation.addUrl(oa('hasTarget'), meiId)
  }

  return annotation.build()
}

type MatchType = 'exact' | 'alteration' | 'omission' | 'addition'

export interface PairT {
  midiEventUrl: UrlString | null
  meiId: UrlString | null
  type: MatchType
}

interface AlignmentEditorProps {
  url: string
}

/*
 * An alignment expresses the fact that a performance
 * is based on a particular score. It provides 
 * further details about this connection, such as 
 * which score note is represented by which event
 * in the performance.
 */
export const AlignmentEditor = ({ url }: AlignmentEditorProps) => {
  const { session } = useSession()
  const navigate = useNavigate()

  const [dataset, setDataset] = useState<SolidDataset>()
  const [alignment, setAlignment] = useState<Thing>()
  const [meiUrl, setMEIUrl] = useState<UrlString>()
  const [midiUrl, setMidiUrl] = useState<UrlString>()

  const [pairs, setPairs] = useState<PairT[]>([])

  const [saving, setSaving] = useState(false)

  const renderedMEI = useRef<MEI>()
  const renderedMidi = useRef<PianoRoll>()

  const handleMEIReady = useCallback((mei: MEI) => {
    renderedMEI.current = mei
  }, [])

  const handleMidiReady = useCallback((midi: PianoRoll) => {
    renderedMidi.current = midi
  }, [])

  const parentRef = useRef<SVGSVGElement>(null)

  const [selectedMidiEvent, setSelectedMidiEvent] = useState<Thing>()
  const [selectedNote, setSelectedNote] = useState<string>()
  const [selectedPair, setSelectedPair] = useState<PairT>()

  useEffect(() => {
    if (!selectedMidiEvent || !selectedNote) return

    setPairs(prevPairs => [...prevPairs, {
      midiEventUrl: asUrl(selectedMidiEvent),
      meiId: selectedNote,
      type: 'exact'
    }])
    setSelectedMidiEvent(undefined)
    setSelectedNote(undefined)
  }, [selectedMidiEvent, selectedNote])

  const performAlignment = (from?: PairT) => {
    if (!renderedMEI.current || !renderedMidi.current) return

    const hmm = renderedMEI.current.asHMM()
    console.log(hmm.events.at(-1)?.scoreTime)

    const pr = new PianoRoll()
    pr.events = renderedMidi.current.events

    if (from) {
      if (!from.meiId || !from.midiEventUrl) return

      const scoreBegin = findScoreTimeOfNote(hmm, from.meiId) || 0
      hmm.events = hmm.events.filter(event => event.scoreTime > scoreBegin)

      const midiBegin = pr.events.find(event => event.id === from.midiEventUrl)?.ontime || 0
      pr.events = pr.events.filter(event => event.ontime > midiBegin)
    }

    const follower = new ScoreFollower(hmm, 4)
    const matches = follower.getMatchResult(pr).events.map(match => {
      let type: MatchType = 'exact'
      if (!match.meiId) type = 'addition'
      else {
        const midiEvent = renderedMidi.current?.events.find(event => event.id === match.id)
        const scoreEvent = renderedMEI.current?.getById(match.meiId)

        if (scoreEvent?.pnum !== midiEvent?.pitch) {
          type = 'alteration'
        }
      }
      // TODO determine omissions

      return {
        midiEventUrl: match.id,
        meiId: match.meiId || null,
        type
      }
    })

    if (from) {
      setPairs([...pairs.slice(0, pairs.indexOf(from)), ...matches])
    }
    else {
      setPairs(matches)
    }
  }

  const savePairs = async () => {
    if (!alignment || !dataset) return

    setSaving(true)
    const chunkSize = 100;
    let modifiedDataset = dataset
    let modifiedAlignment = removeAll(alignment, crm('P9_consists_of'))
    for (let i = 0; i < pairs.length; i += chunkSize) {
      const chunk = pairs.slice(i, i + chunkSize);

      for (const pair of chunk) {
        const pairThing = buildPair(pair.midiEventUrl, `${meiUrl}/${pair.meiId}`)
        modifiedDataset = setThing(modifiedDataset, pairThing)
        modifiedAlignment = addUrl(modifiedAlignment, crm('P9_consists_of'), pairThing)
      }
      modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
      modifiedDataset = await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setAlignment(modifiedAlignment)
    setDataset(modifiedDataset)

    setSaving(false)
  }

  useEffect(() => {
    const fetchThings = async () => {
      try {
        const solidDataset = await getSolidDataset(url, { fetch: session.fetch as any });
        setDataset(solidDataset)

        if (solidDataset) {
          const alignment_ = getThing(solidDataset, url)
          if (alignment_) {
            setAlignment(alignment_)

            const scoreExpression = getThing(
              solidDataset,
              getUrl(alignment_, mer('has_score')) || ''
            )
            const recordingExpression = getThing(
              solidDataset,
              getUrl(alignment_, mer('has_recording')) || ''
            )

            if (!scoreExpression || !recordingExpression) {
              console.log('unable to retrieve score or recording')
              return
            }

            setMEIUrl(getUrl(scoreExpression, RDFS.label) || undefined)
            setMidiUrl(getUrl(recordingExpression, RDFS.label) || undefined)

            const pairUrls = getUrlAll(alignment_, crm('P9_consists_of'))
            setPairs(pairUrls
              .map(pairUrl => getThing(solidDataset, pairUrl))
              .filter(pair => pair !== null)
              .map(pairThing => ({
                midiEventUrl: getUrl(pairThing!, oa('hasBody')) || null,
                meiId: urlAsLabel(getUrl(pairThing!, oa('hasTarget'))) || null,
                type: 'exact'
              })))
          }
        }
      } catch (e) {
        console.error('Error fetching Things:', e);
      }
    };

    fetchThings();
  }, [url, session.fetch, session.info.isLoggedIn]);

  const overwriteMEI = async (newMEI: MEI) => {
    if (!meiUrl) return

    await overwriteFile(
      meiUrl,
      new Blob([newMEI.asString()], { type: 'application/xml' }),
      { fetch: session.fetch as any })
  }

  if (!alignment) return <div>not yet ready</div>

  return (
    <DatasetContext.Provider value={{ solidDataset: dataset, setDataset }}>
      <Grid2 container spacing={1} m={1} className='alignment-editor'>
        <Grid2 xs={12}>
          <h4>
            <IconButton onClick={() => navigate('/works')}>
              <ArrowBack />
            </IconButton>
            Alignment
            <IconButton onClick={() => window.open(asUrl(alignment))}>
              <Link />
            </IconButton>
            <Tooltip title='Align score to MIDI. Be careful: this operation will overwrite existing pairs.'>
              <IconButton onClick={() => performAlignment()}>
                <PlayArrow />
              </IconButton>
            </Tooltip>
            <Tooltip title='Aligns the following pairs'>
              <IconButton disabled={!selectedPair} onClick={() => performAlignment(selectedPair)}>
                <FastForward />
              </IconButton>
            </Tooltip>
            {pairs.length > 0 && (
              <IconButton onClick={savePairs}>
                {saving ? <CircularProgress /> : <SaveOutlined />}
              </IconButton>
            )}
          </h4>
        </Grid2>
        <Grid2 xs={8}>
          <svg ref={parentRef} width={1000} height={900}>
            {midiUrl && (
              <MidiViewer
                asSvg
                url={midiUrl}
                onDone={handleMidiReady}
                onSelect={(event) => event && setSelectedMidiEvent(event)} />
            )}

            <g transform='translate(0, -3500) scale(8 8)'>
              {meiUrl && (
                <ScoreViewer
                  asSvg
                  url={meiUrl}
                  landscape
                  onSelect={(noteId) => setSelectedNote(noteId)}
                  onDone={handleMEIReady} />
              )}
            </g>

            <MEIContext.Provider value={{
              mei: renderedMEI.current,
              updateMEI: overwriteMEI
            }}>
              <PairDataContext.Provider value={(meiId) => {
                const affectedPairs = pairs.filter(pair => pair.meiId === meiId)
                return {
                  note: renderedMEI.current?.getById(meiId),
                  midiEvents: affectedPairs.map(pair => {
                    const eventUrl = pair.midiEventUrl
                    return renderedMidi.current?.events.find(event => event.id === eventUrl)
                  })
                }
              }}>
                <PairContainer
                  parentRef={parentRef.current}
                  pairs={pairs}
                  color='black'
                  onSelect={(pair) => setSelectedPair(pair)}
                  onRemove={(pair) => setPairs(prev => [...prev.slice(0, prev.indexOf(pair)), ...prev.slice(prev.indexOf(pair) + 1)])} />
              </PairDataContext.Provider>
            </MEIContext.Provider>
          </svg>
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

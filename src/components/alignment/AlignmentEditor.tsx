import { SolidDataset, Thing, UrlString, addUrl, asUrl, buildThing, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, removeAll, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useEffect, useRef, useState } from 'react';
import { oa, mer, crm, crmdig } from '../../helpers/namespaces';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { ArrowBack, LinkOutlined, PlayArrowOutlined, SaveOutlined } from '@mui/icons-material';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import MidiViewer from '../midi-ld/MidiViewer';
import { ScoreViewer } from '../score/ScoreViewer';
import './AlignmentEditor.css'
import { Mei } from '../../lib/mei';
import { PianoRoll, ScoreFollower } from 'alignmenttool';
import { Pair } from './Pair';
import { useNavigate } from 'react-router-dom';

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
  const [meiUrl, setMeiUrl] = useState<UrlString>()
  const [midiUrl, setMidiUrl] = useState<UrlString>()
  const [pairs, setPairs] = useState<Thing[]>([])
  const [saving, setSaving] = useState(false)

  const renderedMei = useRef<Mei>()
  const renderedMidi = useRef<PianoRoll>()

  const performAlignment = () => {
    if (!renderedMei.current || !renderedMidi.current) return

    const hmm = renderedMei.current.asHMM()

    const follower = new ScoreFollower(hmm, 4)
    const matches = follower.getMatchResult(renderedMidi.current)

    setPairs(
      matches.events.map(match => {
        const annotation = buildThing()
          .addUrl(RDF.type, oa('Annotation'))
          .addUrl(RDF.type, crmdig('D29_Annotation_Object'))
          .addUrl(crm('P2_has_type'), mer('AlignmentPair'))
          .addUrl(oa('hasBody'), match.id)
        if (match.meiId) {
          annotation.addUrl(oa('hasTarget'), `${meiUrl}#${match.meiId}`)
        }
        return annotation.build()
      })
    )
  }

  const savePairs = async () => {
    if (!alignment || !dataset) return

    setSaving(true)
    let modifiedDataset = dataset
    let modifiedAlignment = alignment
    modifiedAlignment = removeAll(modifiedAlignment, crm('P9_consists_of'))
    for (const pair of pairs) {
      modifiedDataset = setThing(modifiedDataset, pair)
      modifiedAlignment = addUrl(modifiedAlignment, crm('P9_consists_of'), pair)
    }
    modifiedDataset = setThing(modifiedDataset, modifiedAlignment)
    setAlignment(modifiedAlignment)

    setDataset(
      await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
    )
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

            setMeiUrl(getUrl(scoreExpression, RDFS.label) || undefined)
            setMidiUrl(getUrl(recordingExpression, RDFS.label) || undefined)

            const pairUrls = getUrlAll(alignment_, crm('P9_consists_of'))
            setPairs(pairUrls
              .map(pairUrl => getThing(solidDataset, pairUrl))
              .filter(pair => pair !== null) as Thing[])
          }
        }
      } catch (e) {
        console.error('Error fetching Things:', e);
      }
    };

    fetchThings();
  }, [url, session.fetch, session.info.isLoggedIn]);

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
              <LinkOutlined />
            </IconButton>
            <Tooltip title='Align score to MIDI. Be careful: this operation will overwrite existing pairs.'>
              <IconButton onClick={performAlignment}>
                <PlayArrowOutlined />
              </IconButton>
            </Tooltip>
            {pairs.length > 0 && (
              <IconButton onClick={savePairs}>
                {saving ? <CircularProgress /> : <SaveOutlined />}
              </IconButton>
            )}
          </h4>
        </Grid2>
        <Grid2 xs={4}>
          {pairs.length === 0
            ? 'No alignments yet'
            : pairs.map((pair, i) => (
              <Pair
                key={`alignment_card_${i}`}
                pair={pair} />
            ))}
        </Grid2>
        <Grid2 xs={8}>
          <Grid2>
            {meiUrl && (
              <div>
                <ScoreViewer url={meiUrl} landscape onDone={mei => renderedMei.current = mei} />
              </div>
            )}
          </Grid2>
          <Grid2>
            {midiUrl && <MidiViewer url={midiUrl} onDone={midi => renderedMidi.current = midi} />}
          </Grid2>
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

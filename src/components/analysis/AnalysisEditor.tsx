import React, { useEffect, useState } from 'react';
import MidiViewer from '../midi-ld/MidiViewer';
import { useSession, useThing } from '@inrupt/solid-ui-react';
import { Box, Card, CardContent, CircularProgress } from '@mui/material';
import { SolidDataset, Thing, getSolidDataset, getSourceUrl, getStringNoLocale, getThing, getUrl } from '@inrupt/solid-client';
import { crm } from '../../helpers/namespaces';
import { RDFS } from '@inrupt/vocab-common-rdf';

interface AnalysisEditorProps {
  url: string
}

/**
 * This components the analysis or interpretation 
 * of a Welte recording, meaning that it represents
 * `E13 Attribute Assignment`s to single events of a 
 * particular piano roll, possibly associated
 * `I1 Argumentation`s and allows creating and editing
 * them.
 */
export const AnalysisEditor = ({ url }: AnalysisEditorProps) => {
  const { session } = useSession()
  const [error, setError] = useState<any>()
  const [dataset, setDataset] = useState<SolidDataset>()
  const [analysis, setAnalysis] = useState<Thing>()

  useEffect(() => {
    const fetchThings = async () => {
      try {
        const solidDataset = await getSolidDataset(url, { fetch: session.fetch as any });
        setDataset(solidDataset)
        if (solidDataset) {
          setAnalysis(getThing(solidDataset, url) || undefined)
        }
      } catch (e) {
        console.error('Error fetching Things:', e);
        setError(e)
      }
    };

    fetchThings();
  }, [url, session.fetch, session.info.isLoggedIn]);

  if (!analysis) {
    if (error) return <span>Failed loading analysis</span>
    return <CircularProgress />
  }

  const recording = getUrl(analysis, crm('P67_refers_to'))
  const midi = recording && dataset && getThing(dataset, recording)
  const midiUrl = midi && getUrl(midi, RDFS.label)
  const note = getStringNoLocale(analysis, crm('P3_has_note'))

  return (
    <div>
      <h1>Interpretation</h1>
      <Card sx={{ width: '40rem'}}>
        <CardContent>
          <Box mb={1}>
            referring to: {midiUrl}
          </Box>
          <Box>
            Note: {note}
          </Box>
        </CardContent>
      </Card>

      {midiUrl && <MidiViewer url={midiUrl || ''} />}
    </div>
  );
};

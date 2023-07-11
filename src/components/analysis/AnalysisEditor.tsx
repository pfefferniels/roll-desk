import React, { useEffect, useState } from 'react';
import MidiViewer from '../midi-ld/MidiViewer';
import { useSession, useThing } from '@inrupt/solid-ui-react';
import { Box, Button, Card, CardActions, CardContent, CircularProgress, Drawer, IconButton } from '@mui/material';
import { SolidDataset, Thing, asUrl, getInteger, getSolidDataset, getSourceUrl, getStringNoLocale, getThing, getUrl, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
import { crm } from '../../helpers/namespaces';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { Edit, SaveAltRounded } from '@mui/icons-material';
import { AnalysisDialog } from '../works/AnalysisDialog';

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
  const [newAttributes, setNewAttributes] = useState<Thing[]>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [savingE13, setSavingE13] = useState(false)

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

  const saveE13 = async (e13: Thing) => {
    if (!dataset) return 
    if (!analysis) return 

    setSavingE13(true)
    const updatedDataset = setThing(dataset, e13)
    setDataset(
      await saveSolidDatasetAt(url, updatedDataset, { fetch: session.fetch as any })
    )
    setSavingE13(false)
  }

  const recording = getUrl(analysis, crm('P67_refers_to'))
  const midi = recording && dataset && getThing(dataset, recording)
  const midiUrl = midi && getUrl(midi, RDFS.label)

  return (
    <div>
      <div style={{ margin: '1rem' }}>
        <span><b>Analysis</b> {asUrl(analysis)}</span>
        <IconButton onClick={() => setEditDialogOpen(true)}>
          <Edit />
        </IconButton>
      </div>

      {midiUrl && (
        <MidiViewer
          url={midiUrl || ''}
          onChange={(e13s) => setNewAttributes(e13s)} />
      )}

      <Drawer open={true} variant='permanent' anchor='left'>
        <Box m={1}>
          <Button variant='contained'>Add Argumentation</Button>
        </Box>

        {newAttributes?.map(attr => (
          <Card key={`attr_${attr.url}`} sx={{ margin: '1rem' }}>
            <CardContent>
              {urlAsLabel(getUrl(attr, crm('P177_assigned_property_of_type')))}
              = {getInteger(attr, crm('P141_assigned'))}
            </CardContent>
            <CardActions>
              <IconButton onClick={() => saveE13(attr)}>
                {savingE13 ? <CircularProgress /> : <SaveAltRounded />}
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Drawer>

      <AnalysisDialog analysis={analysis} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </div>
  );
};

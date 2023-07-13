import { useEffect, useState } from 'react';
import MidiViewer from '../midi-ld/MidiViewer';
import { useSession } from '@inrupt/solid-ui-react';
import { Box, Button, Card, CardContent, CircularProgress, Divider, Drawer, IconButton, Stack } from '@mui/material';
import { SolidDataset, Thing, asUrl, buildThing, getInteger, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
import { crm } from '../../helpers/namespaces';
import { RDFS } from '@inrupt/vocab-common-rdf';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { Edit, SaveAltOutlined, SaveAltRounded } from '@mui/icons-material';
import { AnalysisDialog } from '../works/AnalysisDialog';
import { E13Accordion } from './E13Accordion';

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
  const [e13s, setE13s] = useState<Thing[]>()
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [newE13, setNewE13] = useState<Thing>()
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

  useEffect(() => {
    if (!dataset || !analysis) return
    const e13Links = getUrlAll(analysis, crm('P9_consists_of'))
    setE13s(
      e13Links
        .reduce((acc, link) => {
          const e13 = getThing(dataset, link)
          if (e13) acc.push(e13)
          return acc
        }, [] as Thing[])
    )
  }, [url, session.fetch, session.info.isLoggedIn, analysis, dataset])

  if (!analysis) {
    if (error) return <span>Failed loading analysis</span>
    return <CircularProgress />
  }

  const saveE13 = async (e13: Thing) => {
    if (!dataset) return
    if (!analysis) return

    setAnalysis(
      buildThing(analysis)
        .addUrl(crm('P9_consists_of'), asUrl(e13, getSourceUrl(dataset)!))
        .build()
    )
    setSavingE13(true)
    let updatedDataset = setThing(dataset, e13)
    updatedDataset = setThing(updatedDataset, analysis)
    setDataset(
      await saveSolidDatasetAt(url, updatedDataset, { fetch: session.fetch as any })
    )
    setSavingE13(false)
  }

  const recording = getUrl(analysis, crm('P67_refers_to'))
  const midi = recording && dataset && getThing(dataset, recording)
  const midiUrl = midi && getUrl(midi, RDFS.label)

  return (
    <div style={{ marginLeft: '25vw' }}>
      <div style={{ margin: '1rem' }}>
        <span><b>Analysis</b> {asUrl(analysis)}</span>
        <IconButton onClick={() => setEditDialogOpen(true)}>
          <Edit />
        </IconButton>
      </div>

      {midiUrl && (
        <MidiViewer
          url={midiUrl || ''}
          onChange={setNewE13} />
      )}

      <Drawer variant='permanent' anchor='left' PaperProps={{ style: { width: '25vw' } }}>
        <Box m={1}>
          <Button variant='contained'>Add Argumentation</Button>
        </Box>

        <Box m={1}>
          <Stack spacing={1}>
            <h4 style={{ margin: 0 }}>Attribute Assignments</h4>
            {e13s?.map(e13 => (
              <E13Accordion e13={e13} key={`e13_${asUrl(e13)}`} />
            ))}

            <Divider />

            <h4>New E13s</h4>
            {newE13 && (
              <Card style={{ marginTop: '1rem' }}>
                {urlAsLabel(getUrl(newE13, crm('P177_assigned_property_of_type')))} → {getInteger(newE13, crm('P141_assigned'))}

                <div style={{ float: 'right' }}>
                  <IconButton onClick={() => saveE13(newE13)}>
                    {savingE13 ? <CircularProgress /> : <SaveAltOutlined />}
                  </IconButton>
                </div>
              </Card>
            )}
          </Stack>
        </Box>
      </Drawer>

      <AnalysisDialog analysis={analysis} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </div >
  );
};

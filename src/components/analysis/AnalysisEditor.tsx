import { useEffect, useState } from 'react';
import MidiViewer from '../midi-ld/MidiViewer';
import { useSession } from '@inrupt/solid-ui-react';
import { Box, Button, CircularProgress, IconButton, Stack } from '@mui/material';
import { SolidDataset, Thing, UrlString, asUrl, buildThing, createThing, getInteger, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, isThing, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
import { crm, mer, midi as midiNs } from '../../helpers/namespaces';
import { DCTERMS, RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { Edit, LinkOutlined } from '@mui/icons-material';
import { AnalysisDialog } from '../works/AnalysisDialog';
import { E13Accordion } from './E13Accordion';
import Grid2 from '@mui/material/Unstable_Grid2/Grid2';
import AddE13Button from './AddE13Button';

const buildE13 = (
  property: string,
  assignTo: Thing,
  defaultValue: number | Thing,
  carriedOutBy?: UrlString) => {
  const thing = buildThing(createThing())
    .addUrl(RDF.type, crm('E13_Attribute_Assignment'))
    .addUrl(crm('P140_assigned_attribute_to'), assignTo)
    .addUrl(crm('P177_assigned_property_of_type'), property)
    .addDate(DCTERMS.created, new Date(Date.now()))

  if (carriedOutBy) {
    thing.addUrl(crm('P14_carried_out'), carriedOutBy)
  }

  if (typeof defaultValue === 'number') {
    thing.addInteger(crm('P141_assigned'), defaultValue)
  }
  else if (isThing(defaultValue)) {
    thing.addUrl(crm('P141_assigned'), defaultValue)
  }

  return thing.build()
}

const buildRange = (min: number, max: number, mean?: number) => {
  const thing = buildThing(createThing())
    .addUrl(RDF.type, mer('Range'))
    .addInteger(mer('min'), min)
    .addInteger(mer('max'), max)

  if (mean) {
    thing.addInteger(mer('mean'), mean)
  }

  return thing.build()
}

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
  const [selectedEvent, setSelectedEvent] = useState<Thing>()

  const [savingE13, setSavingE13] = useState(false)

  const addE13Options =
    [
      {
        name: 'Modify Onset Boundaries',
        handleClick: () => {
          if (!selectedEvent) return

          const currentTick = getInteger(selectedEvent, crm('P82a_begin_of_the_begin'))
          saveE13([
            buildE13(crm('P82a_begin_of_the_begin'), selectedEvent, currentTick || 0),
            buildE13(crm('P81a_end_of_the_begin'), selectedEvent, currentTick || 0)
          ])
        },
      },
      {
        name: 'Modify Offset Boundaries',
        handleClick: () => {
          if (!selectedEvent) return

          const currentTick = getInteger(selectedEvent, crm('P81b_begin_of_the_end'))
          saveE13([
            buildE13(crm('P81b_begin_of_the_end'), selectedEvent, currentTick || 0),
            buildE13(crm('P82b_end_of_the_end'), selectedEvent, currentTick || 0)
          ])
        }
      },
      {
        name: 'Modify Pitch',
        handleClick: () => {
          if (!selectedEvent) return

          const currentPitch = getInteger(selectedEvent, midiNs('pitch'))
          saveE13(
            buildE13(midiNs('pitch'), selectedEvent, currentPitch || 0)
          )
        }
      },
      {
        name: 'Modify Velocity Boundaries',
        handleClick: () => {
          if (!selectedEvent) return

          const currentVelocity = getInteger(selectedEvent, midiNs('velocity')) || 0
          const range = buildRange(
            currentVelocity,
            currentVelocity,
            currentVelocity)
          saveRange(range)

          saveE13([
            buildE13(midiNs('velocity'), selectedEvent, range, session.info.webId)
          ])
        }
      }
    ]

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

  const saveE13 = async (e13_: Thing | Thing[]) => {
    if (!dataset) return
    if (!analysis) return

    setSavingE13(true)

    const e13s = Array.isArray(e13_) ? e13_ : [e13_]
    let updatedDataset = dataset
    const modifiedAnalysis = buildThing(analysis)
    e13s.forEach(e13 => {
      updatedDataset = setThing(updatedDataset, e13)
      modifiedAnalysis.addUrl(crm('P9_consists_of'), asUrl(e13, getSourceUrl(dataset)!))
    })
    updatedDataset = setThing(updatedDataset, modifiedAnalysis.build())

    setAnalysis(modifiedAnalysis.build())

    setDataset(
      await saveSolidDatasetAt(url, updatedDataset, { fetch: session.fetch as any })
    )

    setSavingE13(false)
  }

  const saveRange = async (range: Thing) => {
    if (!dataset) return
    if (!analysis) return

    const updatedDataset = setThing(dataset, range)
    setDataset(
      await saveSolidDatasetAt(url, updatedDataset, { fetch: session.fetch as any })
    )
  }

  const recording = getUrl(analysis, crm('P67_refers_to'))
  const midi = recording && dataset && getThing(dataset, recording)
  const midiUrl = midi && getUrl(midi, RDFS.label)

  return (
    <Grid2 container spacing={1}>
      <Grid2 xs={4}>
        <Box m={1}>
          <Button variant='contained'>Add Argumentation</Button>
        </Box>

        <Box m={1}>
          <Stack spacing={1}>
            <h4 style={{ margin: 0 }}>Attribute Assignments</h4>
            {e13s?.map(e13 => (
              <E13Accordion e13={e13} key={`e13_${asUrl(e13)}`} />
            ))}

            {selectedEvent && <AddE13Button options={addE13Options} />}
          </Stack>
        </Box>
      </Grid2>

      <Grid2 xs={8}>
        <h4 style={{ margin: 0 }}>
          Analysis
          <IconButton onClick={() => setEditDialogOpen(true)}>
            <Edit />
          </IconButton>
          <IconButton onClick={() => window.open(asUrl(analysis))}>
            <LinkOutlined />
          </IconButton>
        </h4>

        {midiUrl && (
          <MidiViewer
            e13s={e13s}
            url={midiUrl || ''}
            onChange={saveE13}
            onSelect={(event) => setSelectedEvent(event)} />
        )}
      </Grid2>

      <AnalysisDialog analysis={analysis} open={editDialogOpen} onClose={() => setEditDialogOpen(false)} />
    </Grid2>
  );
};

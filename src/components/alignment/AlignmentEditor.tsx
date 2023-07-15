import { SolidDataset, Thing, UrlString, asUrl, getFile, getSolidDataset, getThing, getUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import React, { useEffect, useState } from 'react';
import { mer } from '../../helpers/namespaces';
import { IconButton } from '@mui/material';
import { LinkOutlined } from '@mui/icons-material';
import { RDFS } from '@inrupt/vocab-common-rdf';
import MidiViewer from '../midi-ld/MidiViewer';
import { ScoreViewer } from '../score/ScoreViewer';

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
  const [dataset, setDataset] = useState<SolidDataset>()
  const [alignment, setAlignment] = useState<Thing>()
  const [meiUrl, setMeiUrl] = useState<UrlString>()
  const [midiUrl, setMidiUrl] = useState<UrlString>()

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
      <Grid2 container spacing={1} m={1}>
        <Grid2 xs={12}>
          <h4>
            Alignment
            <IconButton onClick={() => window.open(asUrl(alignment))}>
              <LinkOutlined />
            </IconButton>
          </h4>
        </Grid2>
        <Grid2 xs={12}>
          {meiUrl && <ScoreViewer url={meiUrl} />}
        </Grid2>
        <Grid2 xs={12}>
          {midiUrl && <MidiViewer url={midiUrl} />}
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

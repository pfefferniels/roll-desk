import { SolidDataset, Thing, asUrl, getSolidDataset, getThing } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useEffect, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LinkOutlined, PlayArrowOutlined } from '@mui/icons-material';

interface MpmEditorProps {
  url: string
}

export const MpmEditor = ({ url }: MpmEditorProps) => {
  const { session } = useSession()
  const [dataset, setDataset] = useState<SolidDataset>()
  const [mpm, setMpm] = useState<Thing>()

  const performInterpolation = () => {
  }

  const saveMPM = () => {

  }

  useEffect(() => {
    const fetchThings = async () => {
      try {
        const solidDataset = await getSolidDataset(url, { fetch: session.fetch as any });
        setDataset(solidDataset)

        if (solidDataset) {
          setMpm(getThing(solidDataset, url) || undefined)
        }
      } catch (e) {
        console.error('Error fetching Things:', e);
      }
    };

    fetchThings();
  }, [url, session.fetch, session.info.isLoggedIn]);

  if (!mpm) return <div>not yet ready</div>

  return (
    <DatasetContext.Provider value={{ solidDataset: dataset, setDataset }}>
      <Grid2 container spacing={1} m={1}>
        <Grid2 xs={12}>
          <h4>
            MPM
            <IconButton onClick={() => window.open(asUrl(mpm))}>
              <LinkOutlined />
            </IconButton>
            <Tooltip title='Perform MPM Interpolation'>
              <IconButton onClick={performInterpolation}>
                <PlayArrowOutlined />
              </IconButton>
            </Tooltip>
          </h4>
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

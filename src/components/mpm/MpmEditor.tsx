import { SolidDataset, Thing, asUrl, getContainedResourceUrlAll, getFile, getSolidDataset, getSourceUrl, getThing, getUrl, overwriteFile, saveFileInContainer, saveSolidDatasetAt, setThing, setUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useEffect, useState } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { LinkOutlined, PlayArrowOutlined, SaveAltOutlined, SaveOutlined } from '@mui/icons-material';
import { RDFS } from '@inrupt/vocab-common-rdf';
import CodeMirror from '@uiw/react-codemirror';
import { datasetUrl } from '../../helpers/datasetUrl';
import { v4 } from 'uuid';

interface MpmEditorProps {
  url: string
}

export const MpmEditor = ({ url }: MpmEditorProps) => {
  const { session } = useSession()
  const [dataset, setDataset] = useState<SolidDataset>()
  const [mpmExpression, setMpmExpression] = useState<Thing>()
  const [mpm, setMpm] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const performInterpolation = () => {
  }

  const saveMPM = async () => {
    if (!dataset || !mpmExpression) return

    setSaving(true)
    let mpmUrl = getUrl(mpmExpression, RDFS.label)
    console.log('mpmUrl=', mpmUrl)
    if (!mpmUrl) {
      mpmUrl = `${datasetUrl}/${v4()}.mpm`
      const modifiedMpmExpression = setUrl(mpmExpression, RDFS.label, mpmUrl)
      const modifiedDataset = setThing(dataset, modifiedMpmExpression)
      setDataset(
        await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
      )
    }

    await overwriteFile(mpmUrl, new Blob([mpm], {
      type: 'application/xml'
    }), { fetch: session.fetch as any })
    setSaving(false)
  }

  useEffect(() => {
    const fetchThings = async () => {
      try {
        const solidDataset = await getSolidDataset(url, { fetch: session.fetch as any });
        setDataset(solidDataset)

        if (solidDataset) {
          const mpmThing = getThing(solidDataset, url)
          if (!mpmThing) return

          setMpmExpression(mpmThing)

          const fileUrl = getUrl(mpmThing, RDFS.label)
          if (!fileUrl) return

          const fileBlob = await getFile(fileUrl, { fetch: session.fetch as any })
          if (!fileBlob) return

          setMpm(await fileBlob.text())
        }
      } catch (e) {
        console.error('Error fetching Things:', e);
      }
    };

    fetchThings();
  }, [url, session.fetch, session.info.isLoggedIn]);

  if (!mpmExpression) return <div>not yet ready</div>

  return (
    <DatasetContext.Provider value={{ solidDataset: dataset, setDataset }}>
      <Grid2 container spacing={1} m={1}>
        <Grid2 xs={12}>
          <h4>
            MPM
            <IconButton onClick={saveMPM}>
              {saving ? <CircularProgress /> : <SaveOutlined />}
            </IconButton>
            <IconButton onClick={() => window.open(asUrl(mpmExpression))}>
              <LinkOutlined />
            </IconButton>
            <Tooltip title='Perform MPM Interpolation'>
              <IconButton onClick={performInterpolation}>
                <PlayArrowOutlined />
              </IconButton>
            </Tooltip>
          </h4>
        </Grid2>
        <Grid2 xs={4}>
          refers to alignment: ...
        </Grid2>
        <Grid2>
          <CodeMirror value={mpm} onChange={newMpm => setMpm(newMpm)} />
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

import { SolidDataset, Thing, asUrl, getFile, getSolidDataset, getSourceUrl, getThing, getUrl, overwriteFile, saveSolidDatasetAt, setThing, setUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useEffect, useState } from 'react';
import { CircularProgress, IconButton } from '@mui/material';
import { ArrowBack, Link, Save } from '@mui/icons-material';
import { RDFS } from '@inrupt/vocab-common-rdf';
import CodeMirror from '@uiw/react-codemirror';
import { datasetUrl } from '../../helpers/datasetUrl';
import { v4 } from 'uuid';
import { frbroo } from '../../helpers/namespaces';
import { CreationList } from './CreationList';
import { useNavigate } from 'react-router-dom';

const minimalMpm = `
<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="https://github.com/axelberndt/MPM/releases/latest/download/mpm.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="https://github.com/axelberndt/MPM/releases/latest/download/mpm.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
<mpm xmlns="http://www.cemfi.de/mpm/ns/1.0">
    <performance name="a performance" pulsesPerQuarter="720">
        <global>
            <header></header>
            <dated></dated>
        </global>
    </performance>
</mpm>`

interface MpmEditorProps {
  url: string
}

export const MpmEditor = ({ url }: MpmEditorProps) => {
  const { session } = useSession()
  const navigate = useNavigate()

  const [dataset, setDataset] = useState<SolidDataset>()
  const [mpmExpression, setMpmExpression] = useState<Thing>()
  const [creation, setCreation] = useState<Thing>()
  const [mpm, setMpm] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const saveMPM = async () => {
    if (!dataset || !mpmExpression) return

    setSaving(true)
    let mpmUrl = getUrl(mpmExpression, RDFS.label)
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

          const creationUrl = getUrl(mpmThing, frbroo('R17i_was_created_by'))
          if (creationUrl) {
            setCreation(getThing(solidDataset, creationUrl) || undefined)
          }

          const fileUrl = getUrl(mpmThing, RDFS.label)
          if (!fileUrl) {
            setMpm(minimalMpm)
            return
          }

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
            <IconButton onClick={() => navigate('/works')}>
              <ArrowBack />
            </IconButton>
            MPM
            <IconButton onClick={saveMPM}>
              {saving ? <CircularProgress /> : <Save />}
            </IconButton>
            <IconButton onClick={() => window.open(asUrl(mpmExpression))}>
              <Link />
            </IconButton>
          </h4>
        </Grid2>
        <Grid2 xs={4}>
          {creation && (
            <CreationList
              expressionCreation={creation}
              onChange={setMpm} />
          )}
        </Grid2>
        <Grid2 xs={8}>
          <CodeMirror value={mpm} onChange={newMpm => setMpm(newMpm)} />
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

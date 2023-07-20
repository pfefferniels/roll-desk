import { SolidDataset, Thing, asUrl, getFile, getInteger, getSolidDataset, getSourceUrl, getThing, getUrl, getUrlAll, overwriteFile, saveSolidDatasetAt, setThing, setUrl } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import Grid2 from '@mui/material/Unstable_Grid2';
import { useEffect, useState } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { LinkOutlined, PlayArrowOutlined, SaveOutlined } from '@mui/icons-material';
import { RDFS } from '@inrupt/vocab-common-rdf';
import CodeMirror from '@uiw/react-codemirror';
import { datasetUrl } from '../../helpers/datasetUrl';
import { v4 } from 'uuid';
import { crm, frbroo, mer, oa, midi as mid } from '../../helpers/namespaces';
import { MPM } from '../../lib/mpm';
import { MidiFile } from 'midifile-ts';
import { Mei } from '../../lib/mei';
import { loadDomParser, loadVerovio } from '../../lib/globals';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { asPianoRoll } from '../../lib/midi/asPianoRoll';
import { MSM, MsmNote } from '../../lib/msm';
import { defaultPipelines } from '../../lib/transformers';

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
  const [dataset, setDataset] = useState<SolidDataset>()
  const [mpmExpression, setMpmExpression] = useState<Thing>()
  const [creation, setCreation] = useState<Thing>()
  const [mpm, setMpm] = useState<string>('')
  // const [midi, setMidi] = useState<MidiFile>()
  const [saving, setSaving] = useState(false)
  const [interpolationState, setInterpolationState] = useState<'fetching-mei' | 'fetching-midi' | 'transforming' | 'interpolating' | 'done'>()
  const [pipeline, setPipeline] = useState(defaultPipelines['chordal-texture'])

  const performInterpolation = async () => {
    if (!dataset || !creation) return

    const alignmentUrl = getUrl(creation, crm('P16_used_specific_object'))
    if (!alignmentUrl) return

    const alignment = getThing(dataset, alignmentUrl)
    if (!alignment) return

    const meiUrl = getUrl(alignment, mer('has_score'))
    const midiUrl = getUrl(alignment, mer('has_recording'))
    if (!meiUrl || !midiUrl) return

    const meiExpression = getThing(dataset, meiUrl)
    const midiExpression = getThing(dataset, midiUrl)
    if (!meiExpression || !midiExpression) return

    setInterpolationState('fetching-mei')
    const mei = await getFile(
      getUrl(meiExpression, RDFS.label) || '', { fetch: session.fetch as any })
    if (!mei) return

    setInterpolationState('fetching-midi')
    const pieceUrl = getUrl(midiExpression, RDFS.label)
    const midiDataset = await getSolidDataset(
      getUrl(midiExpression, RDFS.label) || '', { fetch: session.fetch as any }
    )
    if (!pieceUrl || !midiDataset) return

    const piece = getThing(midiDataset, pieceUrl)
    if (!piece) return

    const mei_ = new Mei(await mei.text(), await loadVerovio(), await loadDomParser())
    const pr_ = asPianoRoll(piece, midiDataset)
    if (!pr_) return

    setInterpolationState('transforming')
    // convert alignment to MSM which then can be fed into the pipeline
    const msmNotes: MsmNote[] =
      getUrlAll(alignment, crm('P9_consists_of'))
        .map(pairUrl => getThing(dataset, pairUrl))
        .filter(pair => pair !== null)
        .reduce((acc, pair) => {
          const scoreNoteId = urlAsLabel(getUrl(pair!, oa('hasTarget')))
          const midiNoteUrl = getUrl(pair!, oa('hasBody'))

          if (!scoreNoteId || !midiNoteUrl) return acc

          const scoreNote = mei_.getById(scoreNoteId)
          const midiNote = pr_.events.find(event => event.id === midiNoteUrl)

          if (!scoreNote || !midiNote) return acc

          acc.push({
            'part': scoreNote.part,
            'xml:id': scoreNote.id,
            'date': Mei.qstampToTstamp(scoreNote.qstamp),
            'duration': Mei.qstampToTstamp(scoreNote.duration),
            'pitchname': scoreNote.pname!,
            'octave': scoreNote.octave!,
            'accidentals': scoreNote.accid!,
            'midi.pitch': midiNote.pitch,
            'midi.onset': midiNote.ontime,
            'midi.duration': midiNote.offtime - midiNote.ontime,
            'midi.velocity': midiNote.onvel
          })
          return acc
        }, [] as MsmNote[])

    setInterpolationState('interpolating')
    const msm = new MSM(msmNotes, mei_.timeSignature())
    const newMPM = new MPM(2)

    // kick-off pipeline
    pipeline.head?.transform(msm, newMPM)

    setMpm(newMPM.serialize())
    setInterpolationState('done')
  }

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
          {interpolationState}
        </Grid2>
        <Grid2>
          <CodeMirror value={mpm} onChange={newMpm => setMpm(newMpm)} />
        </Grid2>
      </Grid2>
    </DatasetContext.Provider>
  );
};

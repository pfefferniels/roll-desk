import { Button, Dialog, DialogContent, DialogTitle, Box, Stepper, Step, StepLabel, StepContent, Typography } from "@mui/material"
import { read, MidiFile } from "midifile-ts"
import { useState } from "react"
import { useDataset, useSession } from "@inrupt/solid-ui-react"
import { buildThing, createThing, getSourceUrl, overwriteFile, saveSolidDatasetAt, setThing, Thing } from "@inrupt/solid-client"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { RawPerformance } from "../../lib/midi"
import { JsonLdVisitor } from "../../lib/visitors/JsonLdVisitor"
import { uuid } from "../../lib/globals"

const parseMidiInput = (
  input: HTMLInputElement,
  callback: (midi: MidiFile | null) => void
) => {
  if (input.files === null || input.files.length === 0) {
    return
  }

  const file = input.files[0]
  const reader = new FileReader()

  reader.onload = e => {
    if (e.target == null) {
      callback(null)
      return
    }
    const buf = e.target.result as ArrayBuffer
    const midi = read(buf)
    callback(midi)
  }

  reader.readAsArrayBuffer(file)
}

type UploadProps = {
  open: boolean
  setOpen: (open: boolean) => void
}

export function AddDigitalObjects({ open, setOpen }: UploadProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [inProgress, setInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>()
  const [mei, setMEI] = useState<Thing>()
  const [midi, setMIDI] = useState<Thing>()

  const { dataset } = useDataset();
  const { session } = useSession();

  const saveToPod = () => {
    if (!dataset || !mei || !midi) {
      console.warn('No dataset found to save the new work to.');
      return;
    }

    const withMEI = setThing(dataset, mei)
    const withMIDI = setThing(withMEI, midi)

    return saveSolidDatasetAt(
      'https://pfefferniels.inrupt.net/notes/test.ttl',
      withMIDI,
      { fetch: session.fetch as any })
  }

  const buildMEI = async (meiSource: HTMLInputElement) => {
    if (!meiSource || !meiSource.files || meiSource.files.length === 0) {
      return
    }
    const file = meiSource.files[0]

    try {
      // upload the file
      const savedMEI = await overwriteFile(
        `https://pfefferniels.inrupt.net/notes/${uuid()}.mei`,
        file,
        { contentType: 'text/xml', fetch: session.fetch as any }
      )
      const location = getSourceUrl(savedMEI)

      // build a D1 Digital Object that refers to that file
      const thing = buildThing(createThing())
        .addUrl(RDF.type, `http://www.ics.forth.gr/isl/CRMdig/D1_Digital_Object`)
        .addUrl(RDF.type, `http://www.cidoc-crm.org/cidoc-crm/E31_Document`)
        .addUrl(RDFS.label, location)
        .build()

      setMEI(thing)
    }
    catch(e) {
      console.warn(e)
    }
  }

  const buildMIDI = (midiSource: HTMLInputElement) => {
    parseMidiInput(midiSource, (midi: MidiFile | null) => {
      if (!midi) return
      const performance = new RawPerformance(midi)
      const visitor = new JsonLdVisitor()
      performance.accept(visitor)

      const thing = buildThing(createThing())
        .addUrl(RDF.type, `http://www.ics.forth.gr/isl/CRMdig/D1_Digital_Object`)
        .addUrl(RDF.type, `http://www.cidoc-crm.org/cidoc-crm/E31_Document`)
        .addStringNoLocale(RDFS.label, "MIDI file")
        .build();
      setMIDI(thing)
    })
  }

  const handleNext = () => setActiveStep((prevActiveStep) => prevActiveStep + 1);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Upload files</DialogTitle>
      <DialogContent>
        <Box sx={{ maxWidth: 400 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step key={0}>
              <StepLabel>Upload MEI encoding</StepLabel>
              <StepContent>
                <Typography>
                  The MEI encoding will be stored as
                  a <code>crmdig:D1 Digital Object</code>
                </Typography>
                <input style={{ display: 'none' }}
                  type='file'
                  id='mei-input'
                  className='mei-file'
                  accept='.mei,.xml'
                  onChange={(e) => {
                    buildMEI(e.target as HTMLInputElement)
                    handleNext()
                  }}
                />
                <label htmlFor="mei-input">
                  <Button variant="contained" color="primary" component="span">
                    Upload
                  </Button>
                </label>
              </StepContent>
            </Step>

            <Step key={1}>
              <StepLabel>Upload MIDI file</StepLabel>
              <StepContent>
                <Typography>
                  The MIDI file will be converted into a Linked MIDI
                  representation and stored as a <code>crmdig:D1 Digital Object</code>
                </Typography>
                <input
                  style={{ display: 'none' }}
                  type='file'
                  id='midi-input'
                  className='midi-file'
                  accept='.mid,.midi'
                  onChange={(e) => {
                    buildMIDI(e.target as HTMLInputElement)
                    handleNext()
                  }}
                />
                <label htmlFor="midi-input">
                  <Button variant="contained" color="primary" component="span">
                    Upload
                  </Button>
                </label>
              </StepContent>
            </Step>

            <Step key={2}>
              <StepLabel>Save to POD</StepLabel>
              <StepContent>
                <Typography>This saves everything in your POD.</Typography>

                {errorMessage && errorMessage}

                <Button
                  onClick={() => {
                    setInProgress(true)
                    saveToPod()?.then(() => {
                      setInProgress(false)
                      setOpen(false)
                      setActiveStep(0)
                    }).catch((e) => {
                      setErrorMessage(e)
                    })
                  }}
                  variant='contained'
                  disabled={inProgress}>
                  Save and Close
                </Button>
              </StepContent>
            </Step>
          </Stepper>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

import { Button, Dialog, DialogContent, DialogTitle, Box, Stepper, Step, StepLabel, StepContent, Typography } from "@mui/material"
import { read, MidiFile } from "midifile-ts"
import { useState } from "react"
import { useDataset, useSession } from "@inrupt/solid-ui-react"
import { buildThing, createThing, deleteContainer, getSourceUrl, overwriteFile, saveSolidDatasetAt, setThing, SolidDataset, Thing } from "@inrupt/solid-client"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { RawPerformance } from "../../lib/midi"
import { JsonLdVisitor } from "../../lib/visitors/JsonLdVisitor"
import { uuid } from "../../lib/globals"
import { RdfVisitor } from "../../lib/visitors/RDFVisitor"

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

  const [mei, setMEI] = useState<File>()
  const [midi, setMIDI] = useState<SolidDataset>()

  const { dataset } = useDataset();
  const { session } = useSession();

  const saveToPod = async () => {
    if (!dataset || !mei || !midi) {
      console.warn('No dataset found to save the new work to.');
      return;
    }

    try {
      // (1) Upload the MEI file
      const savedMEI = await overwriteFile(
        `https://pfefferniels.inrupt.net/notes/${uuid()}.mei`,
        mei,
        { contentType: 'text/xml', fetch: session.fetch as any }
      )
      const location = getSourceUrl(savedMEI)

      // (2) Save the MIDI-LD dataset
      saveSolidDatasetAt(
        `https://pfefferniels.inrupt.net/notes/${uuid()}.ttl`,
        midi,
        { fetch: session.fetch as any })

      // (3) create the corresponding D1 Digital Object entities
      const meiThing = buildThing(createThing())
        .addUrl(RDF.type, `http://www.ics.forth.gr/isl/CRMdig/D1_Digital_Object`)
        .addUrl(RDF.type, `http://www.cidoc-crm.org/cidoc-crm/E31_Document`)
        .addUrl(RDFS.label, location)
        .build()

      const midiThing = buildThing(createThing())
        .addUrl(RDF.type, `http://www.ics.forth.gr/isl/CRMdig/D1_Digital_Object`)
        .addUrl(RDF.type, `http://www.cidoc-crm.org/cidoc-crm/E31_Document`)
        .addStringNoLocale(RDFS.label, "MIDI file")
        .build();

      const withMEI = setThing(dataset, meiThing)
      const withMIDI = setThing(withMEI, midiThing)

      return saveSolidDatasetAt(
        'https://pfefferniels.inrupt.net/notes/test.ttl',
        withMIDI,
        { fetch: session.fetch as any })
    }
    catch (e) {
      console.warn(e)
    }
  }

  const buildMEI = async (meiSource: HTMLInputElement) => {
    if (!meiSource || !meiSource.files || meiSource.files.length === 0) {
      return
    }
    setMEI(meiSource.files[0])
  }

  const buildMIDI = (midiSource: HTMLInputElement) => {
    parseMidiInput(midiSource, (midi: MidiFile | null) => {
      if (!midi) return
      const performance = new RawPerformance(midi)
      const visitor = new RdfVisitor()
      performance.accept(visitor)
      setMIDI(visitor.datasets[0])
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

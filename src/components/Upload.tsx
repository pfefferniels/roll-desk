import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Stepper, Step, StepLabel, StepContent, Paper, Typography } from "@mui/material"
import { read, MidiFile } from "midifile-ts"
import { useRef, useState } from "react"
import { Score } from "../lib/Score"
import { RawPerformance } from "../lib/Performance"

const parseMidiInput = (
  input: HTMLInputElement,
  callback: (midi: MidiFile|null) => void
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

const steps = [
  {
    label: 'Upload score file',
    description: `This can be any encoding that Verovio is capable of rendering, e.g. MEI, Humdrum or MusicXML.`,
  },
  {
    label: 'Upload MIDI performance',
    description: 'Add the performance as a MIDI file (e.g. an emulated piano roll).',
  }
];

type UploadProps = {
  open: boolean
  onClose: () => void
  setScore: (score: Score) => void
  setPerformance: (performance: RawPerformance) => void
}

export default function Upload({open, onClose, setScore, setPerformance}: UploadProps) {
  const meiInputRef = useRef(null)
  const midiInputRef = useRef(null)

  const [activeStep, setActiveStep] = useState(0);

  const uploadMEI = (meiSource: HTMLInputElement) => {
    if (!meiSource || !meiSource.files || meiSource.files.length === 0) {
      return
    }
    const file = meiSource.files[0]
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const content = fileReader.result as string
      setScore(new Score(content))
    };
    fileReader.readAsText(file)
  }

  const uploadMIDI = (midiSource: HTMLInputElement) => {
    parseMidiInput(midiSource, (midi: MidiFile | null) => {
      if (!midi) return
      setPerformance(new RawPerformance(midi))
    })
  }

  const handleNext = () => setActiveStep((prevActiveStep) => prevActiveStep + 1);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload files</DialogTitle>
      <DialogContent>
        <Box sx={{ maxWidth: 400 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    index === 2 ? (
                      <Typography variant="caption">Last step</Typography>
                    ) : null
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <input
                      style={{
                        display: 'none'
                      }}
                      type='file'
                      id='mei-input'
                      className='mei-file'
                      accept='.mei,.xml'
                      onChange={(e) => {
                        uploadMEI(e.target as HTMLInputElement)
                        handleNext()
                      }}
                  />
                  <label
                      style={{
                        display: activeStep === 0 ? 'block' : 'none'
                      }}
                      htmlFor="mei-input">
                    <Button variant="contained" color="primary" component="span">
                      Upload
                    </Button>
                  </label>

                  <input
                      style={{
                        display: 'none'
                      }}
                      type='file'
                      id='midi-input'
                      className='midi-file'
                      accept='.mid,.midi'
                      onChange={(e) => {
                        uploadMIDI(e.target as HTMLInputElement)
                        onClose()
                      }}
                  />
                  <label
                      style={{
                        display: activeStep === 1 ? 'block' : 'none'
                      }}
                      htmlFor="midi-input">
                    <Button variant="contained" color="primary" component="span">
                      Upload
                    </Button>
                  </label>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

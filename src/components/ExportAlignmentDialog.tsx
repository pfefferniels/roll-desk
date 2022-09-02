import { Dialog, DialogTitle, DialogContent, Box, TextField, Button, DialogActions } from "@mui/material"
import { FC, useState } from "react"
import { AlignedPerformance } from "../lib/AlignedPerformance"

interface ExportDialogProps {
    alignedPerformance: AlignedPerformance,
    dialogOpen: boolean,
    setDialogOpen: (open: boolean) => void
  }
  
export const ExportAlignmentDialog: FC<ExportDialogProps> = ({ alignedPerformance, dialogOpen, setDialogOpen }): JSX.Element => {
    const [actor, setActor] = useState('')
  
    return (
      <Dialog open={dialogOpen}>
        <DialogTitle>Export</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              flexDirection: 'column',
            }}
          >
            <TextField
              sx={{ m: 1 }}
              variant='standard'
              label='alignment carried out by'
              value={actor}
              onChange={(e) => {
                setActor(e.target.value)
              }} />
            <Button
              sx={{ m: 1 }}
              variant='outlined'
              onClick={() => {
                const element = document.createElement('a')
                const file = new Blob([alignedPerformance.rawPerformance?.serializeToRDF() || ''], { type: 'application/ld+json' });
                element.href = URL.createObjectURL(file)
                element.download = `midi.jsonld`
                element.click()
              }}>Export MIDI as RDF</Button>
            <br />
  
            <Button
              sx={{ m: 1 }}
              variant='outlined'
              onClick={() => {
                const element = document.createElement('a')
                const file = new Blob([alignedPerformance.score?.serializeToRDF() || ''], { type: 'application/ld+json' });
                element.href = URL.createObjectURL(file)
                element.download = `score.jsonld`
                element.click()
              }}>Export Score as RDF</Button>
            <br />
  
            <Button
              sx={{ m: 1 }}
              variant='outlined'
              onClick={() => {
                const element = document.createElement('a')
                const file = new Blob([alignedPerformance.serializeToRDF(actor) || ''], { type: 'application/ld+json' });
                element.href = URL.createObjectURL(file)
                element.download = `alignment.jsonld`
                element.click()
              }}>Export Alignments as RDF</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDialogOpen(false)
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  
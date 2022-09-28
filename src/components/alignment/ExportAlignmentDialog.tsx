import { Dialog, DialogTitle, DialogContent, Box, TextField, Button, DialogActions } from "@mui/material"
import { FC, useState } from "react"
import { AlignedPerformance } from "../../lib/AlignedPerformance"
import { MSM } from "../../lib/Msm"
import { JsonLdVisitor } from "../../lib/visitors/JsonLdVisitor"
import { Visitable } from "../../lib/visitors/Visitable"

interface ExportDialogProps {
  alignedPerformance: AlignedPerformance,
  dialogOpen: boolean,
  setDialogOpen: (open: boolean) => void
}

const downloadFile = (filename: string, contents: string, type: string) => {
  const element = document.createElement('a')
  const file = new Blob([contents || ''], { type: type });
  element.href = URL.createObjectURL(file)
  element.download = filename
  element.click()
}

export const ExportAlignmentDialog: FC<ExportDialogProps> = ({ alignedPerformance, dialogOpen, setDialogOpen }): JSX.Element => {
  const [actor, setActor] = useState('')

  const jsonLdVisitor = new JsonLdVisitor()
  // const [jsonLdVisitor, setJsonLdVisitor] = useState<JsonLdVisitor>(new JsonLdVisitor())

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
              const visitor = new JsonLdVisitor()
              alignedPerformance.rawPerformance?.accept(visitor)
              downloadFile('midi.jsonld', visitor.serialize(), 'application/ld+json')
            }}>Export MIDI as RDF</Button>
          <br />

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              downloadFile(
                'score.jsonld',
                alignedPerformance.score?.serializeToRDF() || '',
                'application/ld+json'
              )
            }}>Export Score as RDF</Button>
          <br />

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const msm = new MSM(alignedPerformance).serialize()
              downloadFile(
                'score.msm',
                msm || '',
                'application/xml'
              )
            }}>
            Export Score as MSM
          </Button>

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const visitor = new JsonLdVisitor()
              visitor.setCarriedOutBy(actor)
              alignedPerformance.accept(visitor)
              downloadFile('alignment.jsonld', visitor.serialize(), 'application/ld+json')
            }}>Export Alignments as RDF</Button>

          <Button
            sx={{ m: 1 }}
            variant='outlined'
            onClick={() => {
              const visitor = new JsonLdVisitor()
              visitor.setCarriedOutBy(actor)

              const visitables: Visitable[] = [
                alignedPerformance,
                alignedPerformance.rawPerformance!]
              visitables.forEach(visitable => visitable.accept(visitor));

              downloadFile('all.jsonld', visitor.serialize(), 'application/ld+json')
            }}>Export All as RDF</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setDialogOpen(false)
        }}>
          Close
        </Button>
      </DialogActions>
    </Dialog >
  )
}

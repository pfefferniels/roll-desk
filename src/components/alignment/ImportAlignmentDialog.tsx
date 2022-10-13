import { Dialog, DialogTitle, DialogContent, Box, Button, DialogActions } from "@mui/material"
import { parse, Query } from "rdflib"
import { FC, useContext, useState } from "react"
import { AlignedPerformance, Motivation } from "../../lib/AlignedPerformance"
import { RdfStoreContext } from "../../providers/RDFStoreContext"

interface ImportDialogProps {
  alignedPerformance: AlignedPerformance
  triggerUpdate: () => void

  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
}

export const ImportAlignmentDialog: FC<ImportDialogProps> = ({ alignedPerformance, triggerUpdate, dialogOpen, setDialogOpen }): JSX.Element => {
  const storeCtx = useContext(RdfStoreContext)

  const [alignmentFile, setAlignmentFile] = useState<string>()

  const uploadAlignment = (source: HTMLInputElement) => {
    if (!source || !source.files || source.files.length === 0) {
      return
    }
    const file = source.files[0]
    const fileReader = new FileReader();
    fileReader.onloadend = async () => {
      const content = fileReader.result as string
      setAlignmentFile(content)
    };
    fileReader.readAsText(file)
  }

  const applyAlignment = async () => {
    if (!storeCtx) {
      console.log('RDF store required for parsing the RDF file is not present.')
      return
    }

    if (!alignmentFile) {
      console.log('No alignment file uploaded.')
      return
    }

    const store = storeCtx.rdfStore
    parse(alignmentFile, store, 'http://example.org', 'application/ld+json')
    const sparql = `
        PREFIX la: <http://example.org/linked_alignment#> .
        SELECT ?scoreNote ?midiNote ?motivation
        WHERE {
            ?alignment la:hasScoreNote ?scoreNote .
            ?alignment la:hasMIDINote ?midiNote .
            ?alignment la:hasMotivation ?motivation .
        }`

    // TODO: a weird bug shows up when importing SPARQLToQuery 
    // directly (invalid super call). Needs further investigation.
    const { SPARQLToQuery } = await import('rdflib')
    const query = SPARQLToQuery(sparql, false, store)

    if (!query) {
      console.log('something went wrong')
    }

    alignedPerformance.semanticPairs = []
    store.query(query as Query, function (result) {
      const scoreNote = result['?scoreNote'].value
      const midiNote = result['?midiNote'].value
      const motivation = result['?motivation'].value

      const meiId = scoreNote.slice(scoreNote.lastIndexOf('#') + 1)
      const midiId = midiNote.slice(midiNote.lastIndexOf('_') + 1)
      const motivationId = motivation.slice(motivation.lastIndexOf('#' + 1))
      const scoreNoteObj = alignedPerformance.score?.getById(meiId)
      const midiNoteObj = alignedPerformance.rawPerformance?.getById(+midiId)

      if (!scoreNoteObj || !midiNoteObj) {
        console.log('could not find the objects in the alignments in the given score and MIDI file.')
        return
      }

      alignedPerformance.align(midiNoteObj, scoreNoteObj, motivationId as Motivation)
      triggerUpdate()
    })
  }

  return (
    <Dialog open={dialogOpen}>
      <DialogTitle>Import</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: 'column',
          }}
        >
          <input
            style={{
              display: 'none'
            }}
            type='file'
            id='alignment-input'
            className='alignment-file'
            accept='.jsonld'
            onChange={(e) => {
              uploadAlignment(e.target as HTMLInputElement)
            }}
          />
          <label
            htmlFor="alignment-input">
            <Button variant="outlined" color="primary" component="span">
              Upload JSON-LD
            </Button>
          </label>

          {alignmentFile && <span>ready</span>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          applyAlignment()
          setDialogOpen(false)
        }}>
          Apply
        </Button>
      </DialogActions>
    </Dialog >
  )
}

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

    await alignedPerformance.loadAlignment(alignmentFile)
    triggerUpdate()
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

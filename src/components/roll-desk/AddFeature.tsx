import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { WritingMethod } from "linked-rolls"
import { useContext, useState } from "react"
import { v4 } from "uuid"
import { EventDimension } from "./RollDesk"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"

const isEventDimension = (selection: any): selection is EventDimension => {
    return selection && selection.horizontal && selection.vertical
}

const Preview = ({ iiifUrl }: { iiifUrl: string }) => {
    return (
        <img
            src={iiifUrl}
            alt="IIIF"
            width='300px'
        />
    )
}

interface AddWritingFeatureProps {
    copyID: string
    open: boolean
    iiifUrl?: string
    onClose: () => void
}

export const AddWritingFeature = ({ copyID, open, onClose, iiifUrl }: AddWritingFeatureProps) => {
    const { edition, apply } = useContext(EditionContext)
    const { selection } = useSelection(s => isEventDimension(s))

    const [text, setText] = useState<string>('')
    const [rotation, setRotation] = useState<number>(0)
    const [method, setMethod] = useState<WritingMethod>('Handwriting')

    if (!edition) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                {iiifUrl && <Preview iiifUrl={iiifUrl} />}

                <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                    <FormControl>
                        <FormLabel>Method</FormLabel>
                        <Select
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            size='small'
                        >
                            <MenuItem value='Handwriting'>Handwriting</MenuItem>
                            <MenuItem value='Stamp'>Stamp</MenuItem>
                            <MenuItem value='Printed'>Printed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl>
                        <FormLabel>Rotation</FormLabel>
                        <TextField
                            size='small'
                            variant='outlined'
                            placeholder='Rotation (in degrees)'
                            value={rotation}
                            onChange={e => setRotation(+e.target.value)}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Transcription</FormLabel>
                        <TextField
                            multiline
                            rows={3}
                            size='small'
                            variant='outlined'
                            placeholder='Type text here ...'
                            value={text}
                            onChange={e => setText(e.target.value)}
                        />
                    </FormControl>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => {
                        const rollSelection = structuredClone(selection)

                        const feature = {
                            type: 'Writing' as const,
                            id: v4(),
                            ...rollSelection[0],
                            depiction: iiifUrl,
                            // rotation,
                            method,
                            transcription: {
                                type: 'text' as const,
                                id: v4(),
                                text
                            }
                        }

                        apply(draft => {
                            const copy = draft.copies.find(c => c.id === copyID)
                            if (!copy) return
                            
                            copy.features.push(feature)
                        })

                        onClose()
                    }}
                    variant='contained'
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog >
    )
}


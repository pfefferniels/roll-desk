import { Button, Dialog, DialogActions, DialogContent, FormControl, FormLabel, MenuItem, Select, Stack, TextField } from "@mui/material"
import { addFeature, degrees, Technique, techniques, Writing } from "linked-rolls"
import { useContext, useState } from "react"
import { v4 } from "uuid"
import { EventDimension, UserSelection } from "./RollDesk"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"

/** Most of what is written on these rolls is written by hand, so the dialog opens there. */
const byHand = techniques.find(name => name.toLowerCase() === 'handwriting') ?? techniques[0]

const isEventDimension = (selection: UserSelection): selection is EventDimension => {
    return 'horizontal' in selection && 'vertical' in selection
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
    const [technique, setTechnique] = useState<Technique>(byHand)

    if (!edition) {
        return null
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                {iiifUrl && <Preview iiifUrl={iiifUrl} />}

                <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                    <FormControl>
                        <FormLabel>Technique</FormLabel>
                        <Select
                            value={technique}
                            onChange={e => setTechnique(e.target.value)}
                            size='small'
                        >
                            {techniques.map(name => (
                                <MenuItem key={name} value={name} sx={{ textTransform: 'capitalize' }}>
                                    {name}
                                </MenuItem>
                            ))}
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
                        const dimension = structuredClone(selection).at(0)
                        if (!dimension || !isEventDimension(dimension)) return

                        const feature: Writing = {
                            type: 'Writing',
                            id: v4(),
                            horizontal: dimension.horizontal,
                            vertical: dimension.vertical,
                            depiction: iiifUrl,
                            // A writing straight across the roll states no rotation.
                            ...(rotation !== 0 && { rotation: { value: degrees(rotation), unit: 'deg' as const } }),
                            technique,
                            transcription: {
                                type: 'text' as const,
                                id: v4(),
                                text
                            }
                        }

                        // Writing on a roll was written after it was punched, and the
                        // dialog knows no more of that act than the one feature it made.
                        apply(addFeature(copyID, feature))

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


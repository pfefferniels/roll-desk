import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material"
import { StageCreation } from "linked-rolls/lib/Stage";
import { Edition } from "linked-rolls";
import { useState } from "react";
import { v4 } from "uuid";
import { ObjectUsage, Stage } from "linked-rolls/lib/EditorialActions";

interface StageCreationDialogProps {
    open: boolean
    edition: Edition
    onClose: () => void
    onDone: (stage: StageCreation) => void
    clearSelection: () => void
}

export const StageCreationDialog = ({ open, edition, onClose, onDone, clearSelection }: StageCreationDialogProps) => {
    const [siglum, setSiglum] = useState<string>('')
    const [witnesses, setWitnesses] = useState<string[]>([])
    const [resp, setResp] = useState<string>('')
    const [prev, setPrev] = useState<Stage>()

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Edit Group Label</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <FormControl>
                        <FormLabel>Siglum</FormLabel>
                        <TextField value={siglum} onChange={e => setSiglum(e.target.value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Witnesses</FormLabel>
                        <Select
                            multiple
                            label='Witnesses'
                            value={witnesses}
                            onChange={(event: SelectChangeEvent<typeof witnesses>) => {
                                const value = event.target.value
                                setWitnesses(typeof value === 'string' ? value.split(',') : value,)
                            }}
                        >
                            {edition.copies.map(copy => (
                                <MenuItem value={copy.id} key={copy.id}>
                                    {copy.siglum}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <FormLabel>Based on stage</FormLabel>
                        <Select
                            label='Previous Stage'
                            value={prev?.siglum || 'preliminary'}
                            onChange={(event) => {
                                const value = event.target.value
                                setPrev(edition.stages.find(stage => stage.created.siglum === value)?.created)
                            }}
                        >
                            {edition.stages.map(stage => {
                                const siglum = stage.created.siglum
                                return (
                                    <MenuItem value={siglum} key={siglum}>
                                        {siglum}
                                    </MenuItem>
                                )
                            })}
                            <MenuItem value='preliminary' key={'preliminary'}>
                                <i>Preliminary Roll</i>
                            </MenuItem>

                        </Select>
                    </FormControl>

                    <FormControl>
                        <FormLabel>Responsible</FormLabel>
                        <TextField value={resp} onChange={e => setResp(e.target.value)} />
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        const stage = {
                            siglum,
                            witnesses: edition.copies.filter(copy => witnesses.includes(copy.id))
                        }
                        const basedOn: ObjectUsage = {
                            id: v4(),
                            type: 'objectUsage',
                            original: prev || { 'id': 'preliminary' },
                            carriedOutBy: 'unknown'
                        }

                        onDone(new StageCreation(stage, basedOn))
                        onClose()
                        clearSelection()
                    }}
                    variant='contained'
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog >
    )
}

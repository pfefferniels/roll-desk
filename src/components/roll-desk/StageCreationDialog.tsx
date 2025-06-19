import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material"
import { AnySymbol, assign, Edition, fillEdits, Stage } from "linked-rolls";
import { useState } from "react";
import { v4 } from "uuid";

interface StageCreationDialogProps {
    open: boolean
    edition: Edition
    symbols: AnySymbol[]
    onClose: () => void
    onDone: (stage: Stage) => void
    clearSelection: () => void
}

export const StageCreationDialog = ({ open, edition, symbols, onClose, onDone, clearSelection }: StageCreationDialogProps) => {
    const [siglum, setSiglum] = useState<string>('')
    const [prev, setPrev] = useState<Stage>()

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Create New Stage</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <FormControl>
                        <FormLabel>Siglum</FormLabel>
                        <TextField value={siglum} onChange={e => setSiglum(e.target.value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Based on Stage</FormLabel>
                        <Select
                            label='Previous Stage'
                            value={prev?.siglum || ''}
                            onChange={(event) => {
                                const value = event.target.value
                                setPrev(edition.stages.find(stage => stage.siglum === value))
                            }}
                        >
                            {edition.stages.map(stage => {
                                const siglum = stage.siglum
                                return (
                                    <MenuItem value={siglum} key={siglum}>
                                        {siglum}
                                    </MenuItem>
                                )
                            })}
                            <MenuItem value='' key={'unknown'}>
                                <i>No known preceding roll (first documented version)</i>
                            </MenuItem>

                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => {
                        const stage: Stage = {
                            id: v4(),
                            siglum,
                            edits: [],
                            motivations: [],
                            basedOn: prev && assign('derivation', prev)
                        }

                        fillEdits(stage, symbols)

                        onDone(stage)
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

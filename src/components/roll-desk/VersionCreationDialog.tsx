import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormLabel, MenuItem, Select, SelectChangeEvent, Stack, TextField } from "@mui/material"
import { AnySymbol, assign, Edition, fillEdits, Version } from "linked-rolls";
import { useState } from "react";
import { v4 } from "uuid";

interface VersionCreationDialogProps {
    open: boolean
    edition: Edition
    symbols: AnySymbol[]
    onClose: () => void
    onDone: (version: Version) => void
    clearSelection: () => void
}

export const VersionCreationDialog = ({ open, edition, symbols, onClose, onDone, clearSelection }: VersionCreationDialogProps) => {
    const [siglum, setSiglum] = useState<string>('')
    const [prev, setPrev] = useState<Version>()

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogContent>
                <Stack spacing={1} direction='column'>
                    <FormControl>
                        <FormLabel>Siglum</FormLabel>
                        <TextField value={siglum} onChange={e => setSiglum(e.target.value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Based on Version</FormLabel>
                        <Select
                            label='Previous Version'
                            value={prev?.siglum || ''}
                            onChange={(event) => {
                                const value = event.target.value
                                setPrev(edition.versions.find(version => version.siglum === value))
                            }}
                        >
                            {edition.versions.map(version => {
                                const siglum = version.siglum
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
                        const version: Version = {
                            id: v4(),
                            siglum,
                            edits: [],
                            motivations: [],
                            basedOn: prev && assign('derivation', prev),
                            type: 'edition'
                        }

                        fillEdits(version, symbols, { toleranceStart: 3, toleranceEnd: 3 })

                        onDone(version)
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

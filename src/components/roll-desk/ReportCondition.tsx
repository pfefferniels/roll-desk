import { Button, Dialog, DialogActions, DialogContent, MenuItem, Select, Stack, TextField } from "@mui/material"
import { RollFeature } from "linked-rolls"
import { useState } from "react"
import { v4 } from "uuid"

interface ReportDamageProps {
    feature: RollFeature
    open: boolean
    onDone: (feature: RollFeature) => void
    onClose: () => void
}

export const ReportDamage = ({ feature, open, onDone, onClose }: ReportDamageProps) => {
    const [damageType, setDamageType] = useState<string>('')
    const [description, setDescription] = useState<string>('')

    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <DialogContent>
                <Stack direction='column' sx={{ m: 1 }} spacing={1}>
                    <Select
                        value={damageType ?? ''}
                        onChange={(e) => setDamageType(e.target.value)}
                        displayEmpty
                        fullWidth
                    >
                        <MenuItem value='' disabled>
                            Select Motivation
                        </MenuItem>
                        <MenuItem value='teared'>Teared</MenuItem>
                        <MenuItem value='failed-single-perforation'>
                            Failed Single Perforation
                        </MenuItem>
                        <MenuItem value='damaged-perforation'>
                            Damaged Perforation
                        </MenuItem>
                    </Select>
                    <TextField
                        label='Description'
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button
                    variant='contained'
                    onClick={() => {
                        feature.condition = {
                            type: damageType as any,
                            id: v4(),
                            description,
                            assessment: {
                                actor: 'np',
                                date: new Date().toISOString(),
                                id: v4()
                            }
                        }
                        onDone(feature)
                        onClose()
                    }}
                >
                    Done
                </Button>
                <Button
                    variant="outlined"
                    onClick={onClose}
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    )
}

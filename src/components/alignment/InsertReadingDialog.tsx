import { MEI } from "../../lib/mei"
import { Dialog, DialogContent, MenuItem, MenuList, Typography } from "@mui/material"
import { useState } from "react"
import { Midi, Note } from "tonal"

interface InsertReadingDialogProps {
    open: boolean
    onClose: () => void
    mei: MEI
    updateMEI: (newMEI: MEI) => void
    meiId: string
    midiEvents: any[] // PianoRollEvent
}

// when one note is replaced by multiple, it could be:
const oneToNOptions = {
    'graceGrp': 'Turn into Grace Group',
    'chord': 'Turn into Chord',
    'trill': 'Add Trill',
    'turn': 'Add Turn'
}

const oneToOneOptions = {
    'alternative': 'Modify Note'
}

const oneToZeroOptions = {
    'remove': 'Remove Note'
}

export const InsertReadingDialog = ({ open: dialogOpen, onClose, mei, updateMEI, meiId, midiEvents }: InsertReadingDialogProps) => {
    const [selectedKey, setSelectedKey] = useState<string>();

    const scoreNote = mei.getById(meiId)

    const handleMenuItemClick = (key: string) => {
        setSelectedKey(key);

        mei.insertReading(meiId, midiEvents.map(event => {
            const note = Note.get(Midi.midiToNoteName(event.pitch))

            return {
                index: -1,
                id: '',
                qstamp: 0,
                pnum: event.pitch,
                duration: 0,
                part: 0,
                pname: note.name,
                oct: note.oct
            }
        }), selectedKey === 'alternative' ? undefined : selectedKey!)
        // mei.update()
        updateMEI(mei)
    };

    let options
    if (midiEvents.length === 0) {
        options = oneToZeroOptions
    }
    else if (midiEvents.length === 1) {
        options = oneToOneOptions
    }
    else {
        options = oneToNOptions
    }

    return (
        <Dialog open={dialogOpen} onClose={onClose}>
            <DialogContent>
                <Typography>
                    {scoreNote?.pname?.toUpperCase()} → {midiEvents.map(event => event.sitch).join(' ')}
                </Typography>
                <MenuList dense>
                    {Object.entries(options).map(([key, option]) => (
                        <MenuItem
                            key={key}
                            selected={key === selectedKey}
                            onClick={_ => handleMenuItemClick(key)}
                        >
                            {option}
                        </MenuItem>
                    ))}
                </MenuList>
            </DialogContent>
        </Dialog>
    )
}
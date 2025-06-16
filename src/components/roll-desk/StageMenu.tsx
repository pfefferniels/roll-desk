import { Edit as EditIcon } from "@mui/icons-material"
import { Button, Stack } from "@mui/material"
import { AnySymbol, assign, Edit, Edition, Intention, isEdit, isIntention, isSymbol, Stage } from "linked-rolls"
import { useState } from "react"
import { EditSiglum } from "./EditSiglum"
import { Ribbon } from "./Ribbon"

export type StageSelection = AnySymbol | Edit | Intention

interface MenuProps {
    stage: Stage
    edition: Edition
    selection: StageSelection[]
    onChange: (edition: Edition) => void
}

export const StageMenu = ({ stage, selection, edition, onChange }: MenuProps) => {
    const [editSiglum, setEditSiglum] = useState(false)

    const handleNewStage = () => {
        const edits = selection.filter(isEdit)
        console.log('edits', edits)
        for (const edit of edits) {
            const index = stage.edits.indexOf(edit)
            if (index !== -1) {
                stage.edits.splice(index, 1)
            }
        }
        const newStage: Stage = {
            siglum: stage.siglum + '_derived',
            id: stage.id + 1,
            basedOn: assign('derivation', stage),
            edits,
            intentions: [],
        }
        edition.stages.push(newStage)
        onChange({ ...edition })
    }

    return (
        <>
            <Stack direction='row' spacing={1}>
                <Ribbon title='Siglum'>
                    <Button
                        onClick={() => setEditSiglum(true)}
                        startIcon={<EditIcon />}
                        size='small'
                    >
                        Edit
                    </Button>
                </Ribbon>
                {selection.length > 0 && (
                    <>
                        {selection.every(isSymbol) && (
                            <>
                                <Button>
                                    Edit Symbol
                                </Button>
                                <Button>
                                    Shift Vertically
                                </Button>
                            </>
                        )}
                        {selection.every(isIntention) && (
                            <Button>
                                Remove Intention
                            </Button>
                        )}
                        <Button>
                            Add Intention
                        </Button>
                        {selection.every(isEdit) && (
                            <Button onClick={handleNewStage}>
                                Derive New Stage
                            </Button>
                        )}
                        {selection.length > 2 && selection.every(isEdit) && (
                            <>
                                <Button>
                                    Merge
                                </Button>
                                <Button>
                                    Split
                                </Button>
                            </>
                        )}
                    </>
                )}
            </Stack>

            <EditSiglum
                open={editSiglum}
                siglum={stage.siglum}
                onDone={(newSiglum) => {
                    stage.siglum = newSiglum
                    setEditSiglum(false)
                    onChange({ ...edition })
                }}
                onClose={() => setEditSiglum(false)}
            />
        </>

    )
}

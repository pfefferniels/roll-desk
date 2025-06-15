import { Button, Stack } from "@mui/material"
import { AnySymbol, Edit, Edition, Intention, isEdit, isIntention, isSymbol } from "linked-rolls"

export type StageSelection = AnySymbol | Edit | Intention

interface MenuProps {
    edition: Edition
    selection: StageSelection[]
    onChange: (edition: Edition) => void
}

export const StageMenu = ({ selection, edition, onChange }: MenuProps) => {
    const handleNewStage = () => {
        // resolve the selected symbols from
        // their current stage, attach new stage
        // to edition with the selected symbols
    }

    return (
        <Stack direction='row' spacing={1}>
            {selection.every(isSymbol) && (
                <Button>
                    Derive Stage
                </Button>
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
                <>
                    <Button>
                        Merge
                    </Button>
                    <Button>
                        Split
                    </Button>
                </>
            )}
        </Stack>
    )
}

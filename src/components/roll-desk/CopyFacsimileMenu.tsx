import { Button, Stack } from "@mui/material"
import { AnySymbol, Edit, Edition, Intention, isEdit, isIntention, isSymbol } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddSymbolDialog } from "./AddSymbol"
import { useState } from "react"

export type FacsimileSelection = EventDimension

interface MenuProps {
    edition: Edition
    selection: FacsimileSelection[]
    onChange: (edition: Edition) => void
}

export const StageMenu = ({ selection, edition, onChange }: MenuProps) => {
    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    return (
        <>
            <Stack direction='row' spacing={1}>
                {selection.length > 0 && (
                    <Button>
                        Add Symbol
                    </Button>
                )}
            </Stack>
            <AddSymbolDialog
                open={addSymbolDialogOpen}
                selection={selection[0]}
                onClose={() => setAddSymbolDialogOpen(false)}
            />
        </>
    )
}

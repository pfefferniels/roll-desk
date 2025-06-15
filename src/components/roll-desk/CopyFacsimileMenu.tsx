import { Button, Stack } from "@mui/material"
import { AnySymbol, Edit, Edition, Intention, isEdit, isIntention, isRollFeature, isSymbol, RollCopy, RollFeature } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddSymbolDialog } from "./AddSymbol"
import { useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"

export type FacsimileSelection = EventDimension | RollFeature

interface MenuProps {
    copy: RollCopy
    edition: Edition
    selection: FacsimileSelection[]
    onChange: (edition: Edition) => void
}

export const CopyFacsimileMenu = ({ copy, selection, edition, onChange }: MenuProps) => {
    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)

    const handleRemove = () => {
        for (const feature of selection.filter(isRollFeature)) {
            copy.features.splice(copy.features.indexOf(feature), 1);
        }
        onChange({...edition})
    }

    return (
        <>
            <Stack direction='row' spacing={1}>
                {selection.length > 0 && (
                    <>
                        <Button>
                            Add Symbol
                        </Button>
                        <Button
                            onClick={handleRemove}
                        >
                            Remove Feature
                        </Button>
                    </>

                )}
            </Stack>
            <AddSymbolDialog
                open={addSymbolDialogOpen}
                selection={selection[0]}
                onClose={() => setAddSymbolDialogOpen(false)}
                iiifUrl={selectionAsIIIFLink(selection[0], copy)}
            />
        </>
    )
}

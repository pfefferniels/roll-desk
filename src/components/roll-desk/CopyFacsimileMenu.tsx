import { Button, Stack } from "@mui/material"
import { Edition, isRollFeature, RollCopy, RollFeature } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddSymbolDialog } from "./AddSymbol"
import { useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"
import { ConditionStateDialog } from "./ConditionStateDialog"
import { ProductionEventDialog } from "./ProductionEventDialog"
import { Ribbon } from "./Ribbon"
import { Add, BrokenImage, Delete, Deselect, Edit as EditIcon, SelectAll } from "@mui/icons-material"

export type FacsimileSelection = EventDimension | RollFeature

interface MenuProps {
    copy: RollCopy
    edition: Edition
    selection: FacsimileSelection[]
    onChangeSelection: (selection: FacsimileSelection[]) => void
    onChange: (edition: Edition) => void
}

export const CopyFacsimileMenu = ({ copy, selection, edition, onChange, onChangeSelection }: MenuProps) => {
    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    const [conditionStateDialogOpen, setConditionstateDialogOpen] = useState(false)
    const [editProduction, setEditProduction] = useState(false)

    const handleRemove = () => {
        for (const feature of selection.filter(isRollFeature)) {
            copy.features.splice(copy.features.indexOf(feature), 1);
        }
        onChange({ ...edition })
    }

    return (
        <>
            <Stack direction='row' spacing={1}>
                <Ribbon title='Roll Metadata'>
                    <Button
                        onClick={() => setEditProduction(true)}
                        size='small'
                        startIcon={<EditIcon />}
                    >
                        Production
                    </Button>
                    <Button
                        startIcon={<BrokenImage />}
                    >
                        Condition
                    </Button>
                </Ribbon>
                <Ribbon title='Symbols'>
                    <Button
                        onClick={() => {
                            if (selection.length === copy.features.length) {
                                onChangeSelection([])
                            }
                            else {
                                onChangeSelection(copy.features)
                            }
                        }}
                        startIcon={selection.length === copy.features.length
                            ? <Deselect /> : <SelectAll />}
                        size='small'
                    >
                        {selection.length === copy.features.length ? 'Deselect' : 'Select'} All
                    </Button>
                    {selection.length > 0 && (
                        <Button
                            onClick={() => setAddSymbolDialogOpen(true)}
                            size='small'
                            startIcon={<Add />}
                        >
                            Add
                        </Button>
                    )}
                </Ribbon>
                {selection.length > 0 && (
                    <>
                        <Ribbon title='Feature'>
                            <Button
                                onClick={handleRemove}
                                size='small'
                                startIcon={<Delete />}
                            >
                                Remove
                            </Button>
                            <Button
                                onClick={() => setConditionstateDialogOpen(true)}
                                size='small'
                                startIcon={<BrokenImage />}
                            >
                                Report Condition
                            </Button>
                        </Ribbon>
                    </>
                )}
            </Stack>

            {selection.length > 0 && (
                <>
                    <AddSymbolDialog
                        open={addSymbolDialogOpen}
                        selection={selection[0]}
                        onClose={() => setAddSymbolDialogOpen(false)}
                        iiifUrl={selectionAsIIIFLink(selection[0], copy)}
                        edition={edition}
                    />
                    <ConditionStateDialog
                        open={conditionStateDialogOpen}
                        onClose={() => setConditionstateDialogOpen(false)}
                        subject='feature'
                        onDone={condition => {
                            if (!isRollFeature(selection[0])) return
                            selection[0].condition = condition
                        }}
                    />
                </>
            )}

            <ProductionEventDialog
                open={editProduction}
                event={copy.productionEvent}
                onClose={() => setEditProduction(false)}
                onDone={(event) => {
                    copy.productionEvent = event
                    onChange({ ...edition })
                    setEditProduction(false)
                }}
            />
        </>
    )
}

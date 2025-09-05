import { Button, Stack } from "@mui/material"
import { applyShift, applyStretch, assign, EditionView, EditorialAssumption, FeatureConditionAssignment, isRollFeature, PaperStretch, RemoveFeature, RollConditionAssignment, RollCopy, RollFeature, Shift, Version } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddSymbolDialog } from "./AddSymbol"
import { useContext, useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"
import { ConditionStateDialog } from "./ConditionStateDialog"
import { ProductionEventDialog } from "./ProductionEventDialog"
import { Ribbon } from "./Ribbon"
import { Add, BrokenImage, Delete, Deselect, Edit as EditIcon, SelectAll } from "@mui/icons-material"
import { AlignCopies } from "./AlignCopies"
import { EditString } from "./EditString"
import { EditionContext, EditionOp } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"

export type FacsimileSelection = EventDimension | RollFeature

const addFeature = (copyId: string, feature: RollFeature): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        copy.features.push(feature)
    }
}

const addGeneralCondition = (copyId: string, condition: RollConditionAssignment): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        copy.conditions.push(condition)
    }
}

const addFeatureCondition = (copyId: string, featureIDs: string[], condition: FeatureConditionAssignment): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        for (const featureID of featureIDs) {
            const feature = copy.features.find(f => f.id === featureID)
            if (!feature) return

            feature.condition = condition
        }
    }
}

const shiftAndStretch = (copyId: string, shift: Shift, stretch: EditorialAssumption<'conditionAssignment', PaperStretch>): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        applyShift(shift, copy)
        applyStretch(stretch, copy)
    }
}

interface MenuProps {
    copyId: string
}

export const CopyFacsimileMenu = ({ copyId }: MenuProps) => {
    const { selection, setSelection } = useSelection((item): item is FacsimileSelection => isRollFeature(item))
    const { edition, apply } = useContext(EditionContext)

    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    const [reportFeatureCondition, setReportFeatureCondition] = useState(false)
    const [reportRollCondition, setReportRollCondition] = useState(false)
    const [editProduction, setEditProduction] = useState(false)
    const [alignCopies, setAlignCopies] = useState(false)

    if (!edition) return null

    const copy = edition.copies.find(c => c.id === copyId)
    if (!copy) return null

    return (
        <>
            <Stack direction='row' spacing={1}>
                <Ribbon title='Roll Metadata'>
                    <Button
                        onClick={() => setEditProduction(true)}
                        startIcon={<EditIcon />}
                    >
                        Production
                    </Button>
                    <Button
                        startIcon={<BrokenImage />}
                        onClick={() => setReportRollCondition(true)}
                    >
                        Condition
                    </Button>
                </Ribbon>
                <Ribbon title='Alignment'>
                    <Button
                        onClick={() => setAlignCopies(true)}
                    >
                        Align Copies
                    </Button>
                </Ribbon>
                <Ribbon title='Symbols'>
                    <Button
                        onClick={() => {
                            if (selection.length === copy.features.length) {
                                setSelection([])
                            }
                            else {
                                setSelection(copy.features)
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
                                onClick={() => {
                                    apply(
                                        new RemoveFeature(
                                            copy.id,
                                            selection.filter(isRollFeature).map(f => f.id)
                                        )
                                    )
                                    setSelection([])
                                }}
                                size='small'
                                startIcon={<Delete />}
                            >
                                Remove
                            </Button>
                            <Button
                                onClick={() => setReportFeatureCondition(true)}
                                size='small'
                                startIcon={<BrokenImage />}
                            >
                                Condition
                            </Button>
                        </Ribbon>
                    </>
                )}
            </Stack>

            {selection.length > 0 && (
                <>
                    <AddSymbolDialog
                        copyID={copy.id}
                        open={addSymbolDialogOpen}
                        selection={selection[0]}
                        onClose={() => setAddSymbolDialogOpen(false)}
                        iiifUrl={selectionAsIIIFLink(selection[0], copy)}
                    />

                    <ConditionStateDialog
                        open={reportFeatureCondition}
                        onClose={() => setReportFeatureCondition(false)}
                        subject='feature'
                        onDone={condition => {
                            apply(addFeatureCondition(copyId, selection.filter(isRollFeature).map(f => f.id), condition))
                        }}
                    />
                </>
            )}

            <EditString
                open={reportRollCondition}
                value={"Generel condition ..."}
                onClose={() => setReportRollCondition(false)}
                onDone={(value) => {
                    apply(addGeneralCondition(copyId, assign('conditionAssignment', {
                        type: 'general',
                        description: value
                    })))
                    setReportRollCondition(false)
                }}
            />

            <ProductionEventDialog
                open={editProduction}
                event={copy.productionEvent}
                onClose={() => setEditProduction(false)}
                onDone={(event) => {
                    apply(draft => {
                        const copy = draft.copies.find(c => c.id === copyId)
                        if (!copy) return

                        copy.productionEvent = event
                    })
                    setEditProduction(false)
                }}
            />

            <AlignCopies
                copy={copy}
                open={alignCopies}
                onClose={() => setAlignCopies(false)}
                onDone={(shiftValue, stretchValue) => {
                    const shift: Shift = {
                        horizontal: shiftValue,
                        vertical: 0
                    }

                    const stretch = assign('conditionAssignment', {
                        factor: stretchValue,
                        description: 'calculated by alignment',
                        type: 'paper-stretch' as 'paper-stretch'
                    })

                    apply(
                        shiftAndStretch(copyId, shift, stretch)
                    )
                    setAlignCopies(false)
                }}
            />
        </>
    )
}

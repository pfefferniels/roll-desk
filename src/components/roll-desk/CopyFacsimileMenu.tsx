import { Button, Stack } from "@mui/material"
import { AnyFeature, applyShift, applyStretch, ConditionState, isRollFeature, PaperStretch, RemoveFeature, RollConditionAssignment, RollFeature, Shift } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddWritingFeature } from "./AddFeature"
import { useContext, useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"
import { ProductionEventDialog } from "./ProductionEventDialog"
import { Ribbon } from "./Ribbon"
import { Add, BrokenImage, Delete, Deselect, Edit as EditIcon, SelectAll } from "@mui/icons-material"
import { AlignToDialog } from "./AlignToDialog"
import { EditString } from "./EditString"
import { EditionContext, EditionOp } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"
import { assignObject, ObjectAssumption } from "linked-rolls/lib/Assumption"
import { FeatureConditionDialog } from "./FeatureConditionDialog"

export type FacsimileSelection = EventDimension | AnyFeature

const addGeneralCondition = (copyId: string, condition: RollConditionAssignment): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        copy.conditions.push(condition)
    }
}

const addFeatureCondition = (copyId: string, featureId: string, condition: ConditionState<any>): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        const feature = copy.features.find(f => f.id === featureId)
        if (!feature) return

        feature.condition = condition
    }
}

const shiftAndStretch = (copyId: string, shift: Shift, stretch: ObjectAssumption<PaperStretch>): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        applyShift(shift, copy)
        applyStretch(stretch, copy)
    }
}

const removeAlignment = (copyId: string): EditionOp => {
    return (draft) => {
        const copy = draft.copies.find(c => c.id === copyId)
        if (!copy) return

        const shift = copy.measurements.shift
        const stretchCondition = copy.conditions.find(c => c.type === 'paper-stretch') as PaperStretch | undefined
        const factor = stretchCondition?.factor ?? 1

        for (const feature of copy.features) {
            feature.horizontal.from = feature.horizontal.from / factor - (shift?.horizontal ?? 0)
            if (feature.horizontal.to) {
                feature.horizontal.to = feature.horizontal.to / factor - (shift?.horizontal ?? 0)
            }
            feature.vertical.from = feature.vertical.from - (shift?.vertical ?? 0)
            if (feature.vertical.to) {
                feature.vertical.to = feature.vertical.to - (shift?.vertical ?? 0)
            }
        }

        copy.ops = copy.ops.filter(op => op !== 'shifted' && op !== 'stretched')
        delete copy.measurements.shift
        copy.conditions = copy.conditions.filter(c => c.type !== 'paper-stretch')
    }
}

interface MenuProps {
    copyId: string
}

export const CopyFacsimileMenu = ({ copyId }: MenuProps) => {
    const { selection, setSelection } = useSelection((item): item is FacsimileSelection => isRollFeature(item) || ('horizontal' in item && 'vertical' in item))
    const { edition, apply } = useContext(EditionContext)

    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    const [reportFeatureCondition, setReportFeatureCondition] = useState(false)
    const [reportRollCondition, setReportRollCondition] = useState(false)
    const [editProduction, setEditProduction] = useState(false)
    const [alignCopies, setAlignCopies] = useState(false)

    if (!edition) return null

    const copy = edition.copies.find(c => c.id === copyId)
    if (!copy) return null

    console.log('selection', selection)

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
                    {copy.ops.includes('shifted') || copy.ops.includes('stretched') ? (
                        <Button
                            onClick={() => {
                                apply(removeAlignment(copyId))
                            }}
                        >
                            Remove Alignment
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setAlignCopies(true)}
                        >
                            Align to...
                        </Button>
                    )}
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
                </Ribbon>
                {selection.length > 0 && (
                    <>
                        <Ribbon title='Feature'>
                            {selection.length > 0 && (
                                <Button
                                    onClick={() => setAddSymbolDialogOpen(true)}
                                    size='small'
                                    startIcon={<Add />}
                                >
                                    Add
                                </Button>
                            )}

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
                    <AddWritingFeature
                        copyID={copy.id}
                        open={addSymbolDialogOpen}
                        onClose={() => setAddSymbolDialogOpen(false)}
                        iiifUrl={selectionAsIIIFLink(selection[0], copy)}
                    />
                </>
            )}

            {(selection.length === 1 && isRollFeature(selection[0])) && (
                <FeatureConditionDialog
                    open={reportFeatureCondition}
                    feature={selection[0]}
                    onClose={() => setReportFeatureCondition(false)}
                    onDone={(condition) => {
                        apply(addFeatureCondition(
                            copyId,
                            (selection[0] as AnyFeature).id,
                            condition
                        ))
                        setReportFeatureCondition(false)
                    }}
                />
            )}

            <EditString
                open={reportRollCondition}
                value={"Generel condition ..."}
                onClose={() => setReportRollCondition(false)}
                onDone={(value) => {
                    apply(addGeneralCondition(copyId, assignObject({
                        type: 'general',
                        description: value
                    })))
                    setReportRollCondition(false)
                }}
            />

            <ProductionEventDialog
                open={editProduction}
                event={copy.production}
                onClose={() => setEditProduction(false)}
                onDone={(event) => {
                    apply(draft => {
                        const copy = draft.copies.find(c => c.id === copyId)
                        if (!copy) return

                        copy.production = event
                    })
                    setEditProduction(false)
                }}
            />

            <AlignToDialog
                copy={copy}
                open={alignCopies}
                onClose={() => setAlignCopies(false)}
                onDone={(shiftValue, stretchValue) => {
                    const shift: Shift = {
                        horizontal: shiftValue,
                        vertical: 0
                    }

                    const stretch = assignObject({
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

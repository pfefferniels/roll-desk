import { Button, Stack } from "@mui/material"
import { assign, isRollFeature, RollCopy, RollFeature, Version } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddSymbolDialog } from "./AddSymbol"
import { useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"
import { ConditionStateDialog } from "./ConditionStateDialog"
import { ProductionEventDialog } from "./ProductionEventDialog"
import { Ribbon } from "./Ribbon"
import { Add, BrokenImage, Delete, Deselect, Edit as EditIcon, SelectAll } from "@mui/icons-material"
import { v4 } from "uuid"
import { AlignCopies } from "./AlignCopies"
import { EditString } from "./EditString"
import { produce } from "immer"

export type FacsimileSelection = EventDimension | RollFeature

interface MenuProps {
    versions: Version[]
    copies: RollCopy[]
    copy: RollCopy
    selection: FacsimileSelection[]
    onChangeSelection: (selection: FacsimileSelection[]) => void
    onChange: (copy: RollCopy, versions?: Version[]) => void
}

export const CopyFacsimileMenu = ({ copy, copies, selection, versions, onChange, onChangeSelection }: MenuProps) => {
    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    const [reportFeatureCondition, setReportFeatureCondition] = useState(false)
    const [reportRollCondition, setReportRollCondition] = useState(false)
    const [editProduction, setEditProduction] = useState(false)
    const [alignCopies, setAlignCopies] = useState(false)

    const handleRemove = () => {
        const rolFeatures = selection.filter(isRollFeature)
        const updatedCopy = produce(copy, draft => {
            for (const feature of rolFeatures) {
                const index = draft.features.indexOf(feature)
                if (index !== -1) {
                    draft.features.splice(index, 1)
                }
            }
        })
        onChange(updatedCopy)
    }

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
                                onClick={() => setReportFeatureCondition(true)}
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
                        onDone={(symbol, feature, version) => {
                            const updatedVersion = produce(version, draft => {
                                draft.edits.push({
                                    id: v4(),
                                    insert: [symbol],
                                })
                            })
                            const updatedCopy = produce(copy, draft => {
                                draft.features.push(feature)
                            })
                            // Update the versions array to include the updated version
                            const updatedVersions = versions.map(v => v.id === version.id ? updatedVersion : v)
                            onChange(updatedCopy, updatedVersions)
                            setAddSymbolDialogOpen(false)
                        }}
                        iiifUrl={selectionAsIIIFLink(selection[0], copy)}
                        versions={versions}
                    />

                    <ConditionStateDialog
                        open={reportFeatureCondition}
                        onClose={() => setReportFeatureCondition(false)}
                        subject='feature'
                        onDone={condition => {
                            if (!isRollFeature(selection[0])) return
                            // Note: This appears to be modifying selection directly, which might be intentional
                            // for immediate feedback. If not, this should be handled differently by the parent.
                            selection[0].condition = condition
                        }}
                    />
                </>
            )}

            <EditString
                open={reportRollCondition}
                value={"Generel condition ..."}
                onClose={() => setReportRollCondition(false)}
                onDone={(value) => {
                    const updatedCopy = produce(copy, draft => {
                        draft.conditions.push(assign('conditionAssignment', {
                            type: 'general',
                            description: value
                        }))
                    })
                    onChange(updatedCopy)
                    setReportRollCondition(false)
                }}
            />

            <ProductionEventDialog
                open={editProduction}
                event={copy.productionEvent}
                onClose={() => setEditProduction(false)}
                onDone={(event) => {
                    const updatedCopy = produce(copy, draft => {
                        draft.productionEvent = event
                    })
                    onChange(updatedCopy)
                    setEditProduction(false)
                }}
            />

            <AlignCopies
                copies={copies}
                copy={copy}
                open={alignCopies}
                onClose={() => setAlignCopies(false)}
                onDone={(shift, stretch) => {
                    const updatedCopy = produce(copy, draft => {
                        draft.setShift({
                            horizontal: shift,
                            vertical: 0
                        })
                        draft.setStretch(assign('conditionAssignment', {
                            factor: stretch,
                            description: 'calculated by alignment',
                            type: 'paper-stretch'
                        }))
                    })
                    onChange(updatedCopy)
                    setAlignCopies(false)
                }}
            />
        </>
    )
}

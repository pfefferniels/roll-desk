import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Tooltip } from "@mui/material"
import { AnyFeature, addGeneralCondition, alignCopy, assignObject, isRollFeature, mergeFeatures, mergeObstacle, removeFeatures, Shift, removeCopy, stateFeatureCondition, symbolsCarriedOnlyBy, track, unalignCopy } from "linked-rolls"
import { EventDimension } from "./RollDesk"
import { AddWritingFeature } from "./AddFeature"
import { useContext, useState } from "react"
import { selectionAsIIIFLink } from "./RollGrid"
import { ProductionEventDialog } from "./ProductionEventDialog"
import { Ribbon } from "./Ribbon"
import { Add, BrokenImage, Delete, Deselect, Edit as EditIcon, GroupAdd, SelectAll } from "@mui/icons-material"
import { AlignToDialog } from "./AlignToDialog"
import { EditString } from "./EditString"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"
import { FeatureConditionDialog } from "./FeatureConditionDialog"
import { mergeObstacleNote } from "../../helpers/mergeObstacleNote"

export type FacsimileSelection = EventDimension | AnyFeature

interface MenuProps {
    copyId: string
}

export const CopyFacsimileMenu = ({ copyId }: MenuProps) => {
    const { selection, setSelection } = useSelection((item): item is FacsimileSelection => isRollFeature(item) || ('horizontal' in item && 'vertical' in item))

    /** What is selected where one thing is, which is what the dialogs act on. */
    const sole = selection.length === 1 ? selection[0] : undefined
    const { edition, apply } = useContext(EditionContext)

    const [addSymbolDialogOpen, setAddSymbolDialogOpen] = useState(false)
    const [reportFeatureCondition, setReportFeatureCondition] = useState(false)
    const [reportRollCondition, setReportRollCondition] = useState(false)
    const [editProduction, setEditProduction] = useState(false)
    const [alignCopies, setAlignCopies] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)

    if (!edition) return null

    const copy = edition.copies.find(c => c.id === copyId)
    if (!copy) return null

    const carriedAlone = symbolsCarriedOnlyBy(edition, copyId).length
    const features = selection.filter(isRollFeature)
    const obstacle = mergeObstacle(features)

    return (
        <>
            <Stack direction='row' spacing={1}>
                <Ribbon title='Copy'>
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
                    <Button
                        startIcon={<Delete />}
                        onClick={() => setConfirmRemove(true)}
                    >
                        Remove
                    </Button>
                </Ribbon>
                <Ribbon title='Alignment'>
                    {copy.ops.includes('shifted') || copy.ops.includes('stretched') ? (
                        <Button
                            onClick={() => {
                                apply(unalignCopy(copyId))
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
                                    apply(removeFeatures(copy.id, features.map(f => f.id)))
                                    setSelection([])
                                }}
                                size='small'
                                startIcon={<Delete />}
                            >
                                Remove
                            </Button>
                            <Tooltip title={obstacle ? mergeObstacleNote(obstacle) : ''}>
                                <span>
                                    <Button
                                        onClick={() => {
                                            apply(mergeFeatures(copy.id, features.map(f => f.id)))
                                            setSelection([])
                                        }}
                                        disabled={obstacle !== undefined}
                                        size='small'
                                        startIcon={<GroupAdd />}
                                    >
                                        Merge
                                    </Button>
                                </span>
                            </Tooltip>
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

            {sole && (
                <AddWritingFeature
                    copyID={copy.id}
                    open={addSymbolDialogOpen}
                    onClose={() => setAddSymbolDialogOpen(false)}
                    iiifUrl={selectionAsIIIFLink(sole, copy)}
                />
            )}

            {sole && isRollFeature(sole) && (
                <FeatureConditionDialog
                    open={reportFeatureCondition}
                    feature={sole}
                    onClose={() => setReportFeatureCondition(false)}
                    onDone={(condition) => {
                        apply(stateFeatureCondition(copyId, sole.id, condition))
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
                        type: 'ConditionState',
                        conditionType: 'general',
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

            <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
                <DialogTitle>Remove Copy</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {carriedAlone > 0
                            ? `Removing the copy held by ${copy.keeper.name} also removes the ${carriedAlone} symbol(s) only this copy carries from the versions.`
                            : `No symbol of the versions depends on the copy held by ${copy.keeper.name} alone.`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
                    <Button onClick={() => {
                        apply(removeCopy(copyId))
                        setSelection([])
                        setConfirmRemove(false)
                    }}>
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>

            <AlignToDialog
                copy={copy}
                open={alignCopies}
                onClose={() => setAlignCopies(false)}
                onDone={(shiftValue, scale, reading) => {
                    const shift: Shift = {
                        horizontal: shiftValue,
                        vertical: track(0)
                    }

                    apply(alignCopy(copyId, shift, scale, reading))
                    setAlignCopies(false)
                }}
            />
        </>
    )
}

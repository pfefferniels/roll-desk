import { Delete, Edit as EditIcon, Link, LinkOff, GroupAdd, GroupRemove, CallMerge, CallSplit, Lightbulb, SelectAll, AutoFixHigh } from "@mui/icons-material"
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material"
import { AnySymbol, Edit, Motivation, isEdit, isSymbol, mergeEdits, splitEdit, adoptEdits, connectVersions, detachVersion, collateSymbols, deriveVersion, removeSymbols, removeVersion, idOf, idsIn, editsOf, principalDerivationOf, stateDerivation, clearDerivation, pathIn } from "linked-rolls"
import { useContext, useState } from "react"
import { Ribbon } from "../desk/Ribbon"
import { v4 } from "uuid"
import { AttachToDialog } from "./AttachToDialog"
import { useHotkeys } from "react-hotkeys-hook"
import { ConstraintsRibbon } from "../constraints/ConstraintsRibbon"
import { EditionContext } from "../edition/EditionContext"
import { useSelection } from "../desk/SelectionContext"
import { derivationToleranceOf } from "../edition/collationTolerance"
import { MotivateDialog } from "./MotivateDialog"
import { RecollateDialog } from "./RecollateDialog"
import { goesToAnOverlay } from "../desk/goesToAnOverlay"
import { VersionCreationDialog } from "./VersionCreationDialog"
import { editsAlongRoll, HeldMotivation, isHeldMotivation, motivationIdFor } from "../edition/motivation"
import { RenameMotivationDialog } from "./RenameMotivationDialog"
import { HypothesisDialog } from "./HypothesisDialog"
import { Arguable } from "../accounts/Arguable"
import { nameOf } from "../edition/names"

export type VersionSelection = AnySymbol | Edit | HeldMotivation

interface MenuProps {
    versionId: string
}

export const VersionMenu = ({ versionId }: MenuProps) => {
    const { selection, setSelection } = useSelection(item => isEdit(item) || isSymbol(item) || isHeldMotivation(item))

    /** The one edit selected, where exactly one is, which is what splitting acts on. */
    const soleEdit = selection.length === 1 && selection.every(isEdit) ? selection[0] : undefined
    const { edition, apply } = useContext(EditionContext)

    const [editCreation, setEditCreation] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<string[]>()
    const [symbolsToRecollate, setSymbolsToRecollate] = useState<string[]>()
    const [confirmDetach, setConfirmDetach] = useState(false)
    const [stateHypothesis, setStateHypothesis] = useState(false)
    const [renaming, setRenaming] = useState(false)

    // No focused control claims a letter for itself, so unlike the desk's
    // Space these need no guard beyond the one for overlays.
    useHotkeys(['m', 's'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'm':
                if (!edition || !selection.every(isEdit)) return
                apply(mergeEdits(versionId, selection))
                setSelection([])
                break;
            case 's':
                if (!selection.every(isEdit)) return
                selection.forEach(edit => {
                    apply(splitEdit(versionId, edit))
                })
                setSelection([])
                break;
        }
    }, { ignoreEventWhen: goesToAnOverlay })

    const addMotivation = (about: Edit[]) => {
        if (about.length === 0) return
        setEditsToMotivate(about.map(e => e.id))
    }

    if (!edition || !edition) return null

    const version = edition.versions.find(v => v.id === versionId)
    if (!version) return null

    /**
     * The motivation of this version that is held, as it now reads: the
     * selection keeps it as it was when it was held.
     */
    const held = selection.filter(isHeldMotivation).find(one => one.versionId === versionId)
    const heldMotivation = held && version.motivations.find(m => m.id === held.motivation.id)
    /** The edits selected beside it that it does not hold yet, which it can be given. */
    const toAssign = heldMotivation
        ? selection.filter(isEdit).filter(edit => edit.motivation !== heldMotivation.id)
        : []

    const tolerance = derivationToleranceOf(version)
    const principal = principalDerivationOf(version)
    const sigilOf = (id: string) => nameOf(edition, id) ?? 'unknown'

    /** Each derivation the version states, with where it stands in the list. */
    const derivations = (version.basedOn ?? []).map((derivation, index) => ({ derivation, index }))
    const principalEntry = derivations.find(({ derivation }) => derivation === principal)
    const hypotheses = derivations.filter(({ derivation }) => derivation !== principal)
    const versionPath = pathIn(edition, versionId) ?? []

    return (
        <>
            <Ribbon title='Version'>
                <Button
                    onClick={() => apply(removeVersion(versionId))}
                    size='small'
                    startIcon={<Delete />}
                >
                    Remove
                </Button>
                <Button
                    onClick={() => setEditCreation(true)}
                    startIcon={<EditIcon />}
                    size='small'
                >
                    Made by
                </Button>
                <Button
                    // Groups and types what the collation left one change at a time;
                    // the edits somebody wrote stay, and so does the selection of symbols.
                    onClick={() => {
                        apply(adoptEdits([versionId]))
                        setSelection(selection.filter(item => !isEdit(item)))
                    }}
                    disabled={!principal}
                    size='small'
                    startIcon={<AutoFixHigh />}
                >
                    Propose Edits
                </Button>
            </Ribbon>
            {held && heldMotivation && (
                <Ribbon title='Motivation'>
                    <Button
                        size='small'
                        startIcon={<EditIcon />}
                        onClick={() => setRenaming(true)}
                    >
                        Rename
                    </Button>
                    <Button
                        size='small'
                        startIcon={<SelectAll />}
                        // In place of the motivation, so that what is done to
                        // edits can be done to these.
                        onClick={() => setSelection(editsAlongRoll(edition, held))}
                    >
                        Select Edits
                    </Button>
                    {toAssign.length > 0 && (
                        <Button
                            size='small'
                            startIcon={<Lightbulb />}
                            onClick={() => {
                                const ids = toAssign.map(edit => edit.id)
                                apply(draft => {
                                    const edited = draft.versions.find(v => v.id === versionId)
                                    if (!edited) return
                                    editsOf(edited)
                                        .filter(edit => ids.includes(edit.id))
                                        .forEach(edit => {
                                            edit.motivation = heldMotivation.id
                                        })
                                })
                                setSelection([held])
                            }}
                        >
                            Assign {toAssign.length === 1 ? 'Edit' : `${toAssign.length} Edits`}
                        </Button>
                    )}
                    <Button
                        size='small'
                        startIcon={<Delete />}
                        // The edits stay, giving no reason any more.
                        onClick={() => {
                            apply(draft => {
                                const edited = draft.versions.find(v => v.id === versionId)
                                if (!edited) return
                                edited.motivations = edited.motivations.filter(m => m.id !== heldMotivation.id)
                                editsOf(edited)
                                    .filter(edit => edit.motivation === heldMotivation.id)
                                    .forEach(edit => {
                                        delete edit.motivation
                                    })
                            })
                            setSelection([])
                        }}
                    >
                        Remove
                    </Button>
                </Ribbon>
            )}
            {selection.length > 0 && (
                <>
                    {selection.every(isSymbol) && (
                        <Ribbon title='Symbol'>
                            <Button
                                size='small'
                                startIcon={<Delete />}
                                onClick={() => {
                                    apply(removeSymbols(versionId, selection.map(symbol => symbol.id)))
                                    setSelection([])
                                }}
                            >
                                Remove
                            </Button>
                            <Button
                                size='small'
                                onClick={() => setSymbolsToRecollate(selection.map(symbol => symbol.id))}
                            >
                                Recollate
                            </Button>
                        </Ribbon>
                    )}
                    {selection.every(isEdit) && (
                        <Ribbon title='Edits'>
                            <Button
                                size='small'
                                startIcon={<Lightbulb />}
                                onClick={() => addMotivation(selection)}
                            >
                                Motivate
                            </Button>
                            {selection.length >= 2 && (
                                <Button
                                    onClick={() => {
                                        apply(mergeEdits(versionId, selection))
                                        setSelection([])
                                    }}
                                    startIcon={<GroupAdd />}
                                    size='small'
                                >
                                    Merge
                                </Button>
                            )}
                            {soleEdit && (
                                <Button
                                    onClick={() => {
                                        apply(splitEdit(versionId, soleEdit))
                                        setSelection([])
                                    }}
                                    size='small'
                                    startIcon={<GroupRemove />}
                                >
                                    Split
                                </Button>
                            )}
                        </Ribbon>
                    )}
                </>
            )}
            <ConstraintsRibbon versionId={versionId} />
            <Ribbon title='Derivation'>
                {principalEntry ? (
                    <Arguable path={[...versionPath, 'basedOn', principalEntry.index]}>
                        <Button
                            onClick={() => setConfirmDetach(true)}
                            size='small'
                            startIcon={<LinkOff />}
                        >
                            Detach from {sigilOf(idOf(principalEntry.derivation))}
                        </Button>
                    </Arguable>
                ) : (
                    <Button
                        onClick={() => setAttachTo(true)}
                        size='small'
                        startIcon={<Link />}
                    >
                        Attach To
                    </Button>
                )}
                <Button
                    onClick={() => setStateHypothesis(true)}
                    size='small'
                    startIcon={<CallMerge />}
                >
                    Hypothesis
                </Button>
                {hypotheses.map(({ derivation, index }) => (
                    <Arguable key={idOf(derivation)} path={[...versionPath, 'basedOn', index]}>
                        <Button
                            onClick={() => apply(clearDerivation(versionId, idOf(derivation)))}
                            size='small'
                            startIcon={<LinkOff />}
                        >
                            {sigilOf(idOf(derivation))}
                        </Button>
                    </Arguable>
                ))}
                {selection.length > 0 && selection.every(isEdit) && (
                    <Button
                        onClick={() => {
                            apply(deriveVersion(versionId, selection.map(edit => edit.id)))
                        }}
                        startIcon={<CallSplit />}
                        size='small'
                    >
                        Extract to New Version
                    </Button>
                )}
            </Ribbon>

            <VersionCreationDialog
                open={editCreation}
                value={version.creation}
                onClose={() => setEditCreation(false)}
                onDone={creation => apply(draft => {
                    const edited = draft.versions.find(v => v.id === versionId)
                    if (!edited) return
                    if (creation) edited.creation = creation
                    else delete edited.creation
                })}
            />

            {attachTo && (
                <AttachToDialog
                    currentVersionId={versionId}
                    versions={edition.versions}
                    tolerance={tolerance}
                    onClose={() => setAttachTo(false)}
                    onDone={(previousVersionId, chosenTolerance) => {
                        apply(connectVersions(versionId, previousVersionId, chosenTolerance))
                        setAttachTo(false)
                    }}
                />
            )}

            {stateHypothesis && (
                <HypothesisDialog
                    currentVersionId={versionId}
                    versions={edition.versions.filter(candidate =>
                        !(version.basedOn ?? []).some(derivation => idOf(derivation) === candidate.id))}
                    onClose={() => setStateHypothesis(false)}
                    onDone={(parentVersionId, certainty) => {
                        apply(stateDerivation(versionId, parentVersionId, { type: 'belief', id: v4(), certainty, reasons: [] }))
                        setStateHypothesis(false)
                    }}
                />
            )}

            {symbolsToRecollate && (
                <RecollateDialog
                    tolerance={tolerance}
                    onClose={() => setSymbolsToRecollate(undefined)}
                    onDone={(chosenTolerance) => {
                        apply(collateSymbols(versionId, symbolsToRecollate, chosenTolerance))
                        setSymbolsToRecollate(undefined)
                        setSelection([])
                    }}
                />
            )}

            <Dialog open={confirmDetach} onClose={() => setConfirmDetach(false)}>
                <DialogTitle>Detach Version</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Detaching {sigilOf(versionId)}
                        {principal ? ` from ${sigilOf(idOf(principal))}` : ''} will discard edit classifications,
                        motivation references and every hypothesis of derivation.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDetach(false)}>Cancel</Button>
                    <Button onClick={() => {
                        apply(detachVersion(versionId))
                        setConfirmDetach(false)
                    }}>
                        Detach
                    </Button>
                </DialogActions>
            </Dialog>

            {renaming && heldMotivation && (
                <RenameMotivationDialog
                    version={version}
                    motivation={heldMotivation}
                    onClose={() => setRenaming(false)}
                    onDone={note => {
                        apply(draft => {
                            const renamed = draft.versions
                                .find(v => v.id === versionId)
                                ?.motivations.find(m => m.id === heldMotivation.id)
                            if (renamed) renamed.note = note
                        })
                        setRenaming(false)
                    }}
                />
            )}

            {editsToMotivate && (
                <MotivateDialog
                    version={version}
                    name={sigilOf(versionId)}
                    editIds={editsToMotivate}
                    onClose={() => setEditsToMotivate(undefined)}
                    onDone={(chosen) => {
                        const motivation: Motivation = typeof chosen === 'string'
                            ? { type: 'motivation', id: motivationIdFor(chosen, idsIn(edition)), note: chosen }
                            : chosen

                        apply((d) => {
                            const version = d.versions.find(v => v.id === versionId)
                            if (!version) return
                            if (!version.motivations.some(m => m.id === motivation.id)) {
                                version.motivations.push(motivation)
                            }

                            editsOf(version)
                                .filter(edit => editsToMotivate.includes(edit.id))
                                .forEach(edit => {
                                    edit.motivation = motivation.id
                                })
                        })
                        setEditsToMotivate(undefined)
                    }}
                />
            )}
        </>
    )
}

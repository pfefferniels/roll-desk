import { Delete, Edit as EditIcon, Link, LinkOff, GroupAdd, GroupRemove, CallMerge, CallSplit, Lightbulb, ReportGmailerrorred } from "@mui/icons-material"
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip } from "@mui/material"
import { ReservationNotes } from "./Reservations"
import { AnySymbol, Edit, Motivation, Version, isEdit, isSymbol, mergeEdits, splitEdit, connectVersions, detachVersion, collateSymbols, deriveVersion, removeSymbols, removeVersion, idOf, editsOf, principalDerivationOf, stateDerivation, clearDerivation, witnessesOf, reservationsAboutVersion } from "linked-rolls"
import { useContext, useState } from "react"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
import { AttachToDialog } from "./AttachToDialog"
import { useHotkeys } from "react-hotkeys-hook"
import { ConstraintsRibbon } from "./ConstraintsRibbon"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"
import { derivationToleranceOf } from "../../helpers/collationTolerance"
import { MotivateDialog } from "./MotivateDialog"
import { RecollateDialog } from "./RecollateDialog"
import { goesToAnOverlay } from "../../helpers/goesToAnOverlay"
import { VersionCreationDialog } from "./VersionCreationDialog"
import { isMotivation } from "../../helpers/motivation"
import { HypothesisDialog } from "./HypothesisDialog"
import { Arguable } from "./Arguable"
import { nameOf } from "../../helpers/names"

/** The motivation all of the given edits already reference, if they agree on one. */
const sharedMotivation = (version: Version, editIds: string[]) => {
    const referenced = new Set(
        editsOf(version)
            .filter(edit => editIds.includes(edit.id))
            .map(edit => edit.motivation)
    )
    if (referenced.size !== 1) return undefined
    return version.motivations.find(m => m.id === [...referenced][0])
}

export type VersionSelection = AnySymbol | Edit | Motivation

interface MenuProps {
    versionId: string
}

export const VersionMenu = ({ versionId }: MenuProps) => {
    const { selection, setSelection } = useSelection(item => isEdit(item) || isSymbol(item) || isMotivation(item))

    /** The one edit selected, where exactly one is, which is what splitting acts on. */
    const soleEdit = selection.length === 1 && selection.every(isEdit) ? selection[0] : undefined
    const { edition, apply, view } = useContext(EditionContext)

    const [editCreation, setEditCreation] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<string[]>()
    const [symbolsToRecollate, setSymbolsToRecollate] = useState<string[]>()
    const [confirmDetach, setConfirmDetach] = useState(false)
    const [stateHypothesis, setStateHypothesis] = useState(false)

    // No focused control claims a letter for itself, so unlike the desk's
    // Space these need no guard beyond the one for overlays.
    useHotkeys(['m', 's'], (_, handler) => {
        switch (handler.keys?.join('')) {
            case 'm':
                if (!view || !selection.every(isEdit)) return
                apply(mergeEdits(view, versionId, selection))
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

    if (!edition || !view) return null

    const version = edition.versions.find(v => v.id === versionId)
    if (!version) return null

    const tolerance = derivationToleranceOf(version, edition)
    const principal = principalDerivationOf(version)
    const sigilOf = (id: string) => nameOf(view, id) ?? 'unknown'

    /** Each derivation the version states, with where it stands in the list. */
    const derivations = (version.basedOn ?? []).map((derivation, index) => ({ derivation, index }))
    const principalEntry = derivations.find(({ derivation }) => derivation === principal)
    const hypotheses = derivations.filter(({ derivation }) => derivation !== principal)
    const versionPath = view.getPath(versionId) ?? []

    const witnesses = witnessesOf(view, versionId)
    const reservations = reservationsAboutVersion(view, version)
    const copyLabelOf = (copyId: string) => nameOf(view, copyId) ?? copyId

    return (
        <>
            <Ribbon title='Version'>
                <Button
                    onClick={() => apply(removeVersion(view, versionId))}
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
            </Ribbon>
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
                                        apply(mergeEdits(view, versionId, selection))
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
            <Ribbon title='Witnesses'>
                {witnesses.map(witness => (
                    <Chip
                        key={witness.copy}
                        size='small'
                        variant={witness.by === 'statement' ? 'outlined' : 'filled'}
                        label={witness.by === 'statement'
                            ? `${copyLabelOf(witness.copy)} (${witness.certainty})`
                            : copyLabelOf(witness.copy)}
                        sx={{ m: 0.25 }}
                    />
                ))}
                {reservations.length > 0 && (
                    <Tooltip
                        title={<ReservationNotes reservations={reservations} />}
                    >
                        <ReportGmailerrorred fontSize='small' color='warning' sx={{ alignSelf: 'center' }} />
                    </Tooltip>
                )}
            </Ribbon>
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
                        apply(connectVersions(view, versionId, previousVersionId, chosenTolerance))
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
                        apply(collateSymbols(view, versionId, symbolsToRecollate, chosenTolerance))
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
                        apply(detachVersion(view, versionId))
                        setConfirmDetach(false)
                    }}>
                        Detach
                    </Button>
                </DialogActions>
            </Dialog>

            <MotivateDialog
                open={!!editsToMotivate}
                onClose={() => setEditsToMotivate(undefined)}
                motivations={version.motivations}
                value={sharedMotivation(version, editsToMotivate ?? [])}
                onDone={(chosen) => {
                    if (!editsToMotivate) return

                    const motivation: Motivation = typeof chosen === 'string'
                        ? { type: 'motivation', id: v4(), note: chosen }
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
        </>
    )
}

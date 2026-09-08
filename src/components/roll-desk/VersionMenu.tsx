import { Delete, Edit as EditIcon, Person, Link, LinkOff, GroupAdd, GroupRemove, CallSplit, Lightbulb, TypeSpecimen } from "@mui/icons-material"
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material"
import { AnySymbol, Edit, Motivation, Version, isEdit, isSymbol, versionTypes, mergeEdits, splitEdit, connectVersions, detachVersion, collateSymbols, deriveVersion, removeSymbols, removeVersion, idOf } from "linked-rolls"
import { useContext, useState } from "react"
import { EditString } from "./EditString"
import { Ribbon } from "./Ribbon"
import { v4 } from "uuid"
import { AttachToDialog } from "./AttachToDialog"
import { useHotkeys } from "react-hotkeys-hook"
import { EditType } from "./EditVersionType"
import { ConstraintsRibbon } from "./ConstraintsRibbon"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"
import { keepingTolerance, toleranceOf } from "../../helpers/collationTolerance"
import { MotivateDialog } from "./MotivateDialog"
import { RecollateDialog } from "./RecollateDialog"

export const isMotivation = (obj: any): obj is Motivation => obj?.type === 'motivation'

/** The motivation all of the given edits already reference, if they agree on one. */
const sharedMotivation = (version: Version, editIds: string[]) => {
    const referenced = new Set(
        version.edits
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
    const { edition, apply, view } = useContext(EditionContext)

    const [assignActor, setAssignActor] = useState(false)
    const [editSiglum, setEditSiglum] = useState(false)
    const [attachTo, setAttachTo] = useState(false)
    const [versionType, setVersionType] = useState(false)
    const [editsToMotivate, setEditsToMotivate] = useState<string[]>()
    const [symbolsToRecollate, setSymbolsToRecollate] = useState<string[]>()
    const [confirmDetach, setConfirmDetach] = useState(false)

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
    })

    const addMotivation = (about: Edit[]) => {
        if (about.length === 0) return
        setEditsToMotivate(about.map(e => e.id))
    }

    if (!edition || !view) return null

    const version = edition.versions.find(v => v.id === versionId)
    if (!version) return null

    const tolerance = toleranceOf(edition)

    return (
        <>
            <Ribbon title='Version'>
                <Button
                    onClick={() => setVersionType(true)}
                    size='small'
                    startIcon={<TypeSpecimen />}
                >
                    Type
                </Button>
                <Button
                    onClick={() => setAssignActor(true)}
                    size='small'
                    startIcon={<Person />}
                >
                    Actor
                </Button>
                <Button
                    onClick={() => apply(removeVersion(view, versionId))}
                    size='small'
                    startIcon={<Delete />}
                >
                    Remove
                </Button>
                <Button
                    onClick={() => setEditSiglum(true)}
                    startIcon={<EditIcon />}
                    size='small'
                >
                    Siglum
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
                            {selection.length === 1 && (
                                <Button
                                    onClick={() => {
                                        apply(splitEdit(versionId, selection[0]))
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
                {version.basedOn ? (
                    <Button
                        onClick={() => setConfirmDetach(true)}
                        size='small'
                        startIcon={<LinkOff />}
                    >
                        Detach
                    </Button>
                ) : (
                    <Button
                        onClick={() => setAttachTo(true)}
                        size='small'
                        startIcon={<Link />}
                    >
                        Attach To
                    </Button>
                )}
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

            <EditString
                open={editSiglum}
                value={version.siglum}
                onDone={(newSiglum) => {
                    apply(draft => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return
                        version.siglum = newSiglum
                    })
                    setEditSiglum(false)
                }}
                onClose={() => setEditSiglum(false)}
            />

            {attachTo && (
                <AttachToDialog
                    currentVersionId={versionId}
                    versions={edition.versions}
                    tolerance={tolerance}
                    onClose={() => setAttachTo(false)}
                    onDone={(previousVersionId, chosenTolerance) => {
                        apply(keepingTolerance(
                            chosenTolerance,
                            connectVersions(view, versionId, previousVersionId, chosenTolerance)
                        ))
                        setAttachTo(false)
                    }}
                />
            )}

            {symbolsToRecollate && (
                <RecollateDialog
                    tolerance={tolerance}
                    onClose={() => setSymbolsToRecollate(undefined)}
                    onDone={(chosenTolerance) => {
                        apply(keepingTolerance(
                            chosenTolerance,
                            collateSymbols(view, versionId, symbolsToRecollate, chosenTolerance)
                        ))
                        setSymbolsToRecollate(undefined)
                        setSelection([])
                    }}
                />
            )}

            <EditType
                open={versionType}
                onClose={() => setVersionType(false)}
                onSave={(type) => {
                    apply((draft) => {
                        const version = draft.versions.find(v => v.id === versionId)
                        if (!version) return
                        version.versionType = type
                    })
                }}
                value={version.versionType}
                types={versionTypes}
            />

            <Dialog open={confirmDetach} onClose={() => setConfirmDetach(false)}>
                <DialogTitle>Detach Version</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Detaching {version.siglum}
                        {version.basedOn
                            ? ` from ${edition.versions.find(v => v.id === idOf(version.basedOn!))?.siglum ?? 'parent'}`
                            : ''
                        } will discard edit classifications and motivation references.
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

                        version.edits
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

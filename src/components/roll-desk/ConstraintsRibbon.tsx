import { AlignHorizontalLeft, East, JoinInner, LinkOff, RemoveCircleOutline, West } from "@mui/icons-material"
import { Button } from "@mui/material"
import {
    AnyPerforation, EditionView, PlacementRelation, isPerforation, pairPerforations, placePerforation, unpairPerforation, unplacePerforation
} from "linked-rolls"
import { useContext, useState } from "react"
import type { UserSelection } from "./RollDesk"
import { Ribbon } from "./Ribbon"
import { PlacementDialog } from "./PlacementDialog"
import { EditionContext } from "../../providers/EditionContext"
import { useSelection } from "../../providers/SelectionContext"
import { useSnackbar } from "../../providers/SnackbarContext"
import { useSnapshot } from "../../hooks/useSnapshot"
import {
    Placement, isPlaced, pairStatementOf, placementBetween, refusalToPair, refusalToPlace
} from "../../helpers/constraints"

/**
 * The selection holds copies made when the version was drawn, which do
 * not learn of statements made since, so each item is looked up afresh.
 */
const current = (view: EditionView) => (item: UserSelection): UserSelection =>
    'id' in item ? view.get<UserSelection>(item.id) ?? item : item

type Candidates = { pair: [AnyPerforation, AnyPerforation]; relation: PlacementRelation }

interface ConstraintsRibbonProps {
    versionId: string
}

/**
 * Stating and taking back placements and pairs: with two perforations
 * selected, between them, and with one, whatever binds it.
 */
export const ConstraintsRibbon = ({ versionId }: ConstraintsRibbonProps) => {
    const { selection, setSelection } = useSelection()
    const { apply, view } = useContext(EditionContext)
    const { setMessage } = useSnackbar()
    const snapshot = useSnapshot(versionId)
    const [candidates, setCandidates] = useState<Candidates>()

    if (!view) return null

    const perforations = selection.map(current(view)).filter(isPerforation)
    if (perforations.length !== selection.length) return null

    const done = () => setSelection([])

    const pairSelected = (one: AnyPerforation, other: AnyPerforation) => {
        const refusal = refusalToPair(one, other, snapshot)
        if (refusal) {
            setMessage(refusal)
            return
        }
        apply(pairPerforations(view, one.id, other.id))
        done()
    }

    const placeChosen = (placement: Placement) => {
        setCandidates(undefined)
        const refusal = refusalToPlace(placement, snapshot)
        if (refusal) {
            setMessage(refusal)
            return
        }
        apply(placePerforation(view, placement.follower.id, placement.reference.id, placement.relation))
        done()
    }

    /** The kinds decide the direction where they can; otherwise the editor is asked. */
    const placeSelected = (one: AnyPerforation, other: AnyPerforation, relation: PlacementRelation) => {
        const decided = placementBetween(one, other, relation)
        if (decided) placeChosen(decided)
        else setCandidates({ pair: [one, other], relation })
    }

    const [one, other] = perforations

    if (one && other) {
        return (
            <>
                <Ribbon title='Constraints'>
                    <Button
                        size='small'
                        startIcon={<AlignHorizontalLeft />}
                        onClick={() => placeSelected(one, other, 'alignedWith')}
                    >
                        Align
                    </Button>
                    <Button
                        size='small'
                        startIcon={<West />}
                        onClick={() => placeSelected(one, other, 'before')}
                    >
                        Before
                    </Button>
                    <Button
                        size='small'
                        startIcon={<East />}
                        onClick={() => placeSelected(one, other, 'after')}
                    >
                        After
                    </Button>
                    <Button
                        size='small'
                        startIcon={<JoinInner />}
                        onClick={() => pairSelected(one, other)}
                    >
                        Pair
                    </Button>
                </Ribbon>

                {candidates && (
                    <PlacementDialog
                        candidates={candidates.pair}
                        relation={candidates.relation}
                        onClose={() => setCandidates(undefined)}
                        onDone={placeChosen}
                    />
                )}
            </>
        )
    }

    if (one && !other) {
        const only = one
        const statement = pairStatementOf(only, snapshot)
        if (!isPlaced(only) && !statement) return null

        return (
            <Ribbon title='Constraints'>
                {isPlaced(only) && (
                    <Button
                        size='small'
                        startIcon={<RemoveCircleOutline />}
                        onClick={() => {
                            apply(unplacePerforation(view, only.id))
                            done()
                        }}
                    >
                        Free
                    </Button>
                )}
                {statement && (
                    <Button
                        size='small'
                        startIcon={<LinkOff />}
                        onClick={() => {
                            apply(unpairPerforation(view, statement.id))
                            done()
                        }}
                    >
                        Unpair
                    </Button>
                )}
            </Ribbon>
        )
    }

    return null
}

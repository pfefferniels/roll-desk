import { Draft } from "immer"
import { AnySymbol, EditionOp, EditionView, PlacementRelation, assignReference, getAt, placementRelations } from "linked-rolls"
import { Perforation, isPerforation } from "./constraints"

/**
 * Runs `op` on the perforation the view locates by id, in whichever
 * version of the tradition it was inserted. A statement made there
 * holds in every version that carries the perforation.
 */
const onPerforation = (
    view: EditionView,
    id: string,
    op: (perforation: Draft<Perforation>) => void
): EditionOp =>
    draft => {
        const path = view.getPath(id)
        const symbol = path && getAt<Draft<AnySymbol>>(path, draft)
        if (symbol && isPerforation(symbol)) op(symbol)
    }

const clearPlacement = (perforation: Draft<Perforation>) =>
    placementRelations.forEach(relation => { delete perforation[relation] })

/** States how the follower is placed relative to the reference, in place of any earlier statement. */
export const place = (view: EditionView, followerId: string, referenceId: string, relation: PlacementRelation): EditionOp =>
    onPerforation(view, followerId, perforation => {
        clearPlacement(perforation)
        perforation[relation] = assignReference(referenceId)
    })

export const unplace = (view: EditionView, followerId: string): EditionOp =>
    onPerforation(view, followerId, clearPlacement)

/** The pair is stated on `statingId` only, as the format asks. */
export const pair = (view: EditionView, statingId: string, partnerId: string): EditionOp =>
    onPerforation(view, statingId, perforation => {
        perforation.pairedWith = assignReference(partnerId)
    })

export const unpair = (view: EditionView, statingId: string): EditionOp =>
    onPerforation(view, statingId, perforation => {
        delete perforation.pairedWith
    })

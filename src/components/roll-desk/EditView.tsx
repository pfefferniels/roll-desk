import {
    CollationTolerance,
    defaultCollationTolerance,
    distance,
    Edit,
    EditType,
    HorizontalSpan,
    isCommand,
    max,
    min,
    positionOfSameFunction,
    Track,
    TrackerBar
} from "linked-rolls";
import { getHull, Hull } from "./Hull";
import { getBoundingBox } from "../../helpers/getBoundingBox";
import { MouseEventHandler, useContext, useMemo } from "react";
import { AnySymbol } from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { Arrow } from "./Arrow";
import { EditionView } from "linked-rolls";
import { EditionContext } from "../../providers/EditionContext";
import { Box, boxOf, rollGeometry, Translation } from "../../helpers/rollGeometry";
import { cornersOf, point, Point } from "../../helpers/drawing";
import { add, subtract } from "linked-rolls";
import { inOneLane } from "../../helpers/arrow";
import { svg } from "../../helpers/units";


export type { Translation }

const insertionFill = '#aceebb'
const deletionFill = '#fb7f78ff'

/**
 * The lane a symbol is drawn in: the one the bar reads it on, and where
 * it has no word for it, the one it gives the same function.
 *
 * The track is the bar's answer rather than the carriers', since copies
 * of two systems number their tracks differently and a symbol may be
 * carried by both. The fallback is for what a version does away with: a
 * green version deletes the red `SlowCrescendoOn` it inherits, and the
 * green bar has no position for that, so the edit would have nowhere to
 * be drawn and would vanish instead of being shown.
 */
const laneOf = (symbol: AnySymbol, bar: TrackerBar): Track | undefined => {
    if (!isCommand(symbol)) return undefined

    const read = bar.positionOf(symbol)
    if (read !== undefined) return read

    return symbol.type === 'expression' ? positionOfSameFunction(bar, symbol) : undefined
}

export const getSymbolBBox = (symbol: AnySymbol, editionView: EditionView, translation: Translation) => {
    const horizontal = editionView.placeOf(symbol)
    const position = laneOf(symbol, translation.bar)
    if (!horizontal || position === undefined) return undefined

    return boxOf({ horizontal, vertical: { from: position } }, translation)
}

/** The symbols an edit does away with, those of them the edition still holds. */
const deletedSymbolsOf = (edit: Edit, editionView: EditionView): AnySymbol[] =>
    (edit.delete ?? [])
        .map(symbolId => editionView.get<AnySymbol>(symbolId))
        .filter(symbol => !!symbol)

interface EditBoxes {
    insertions: Box[]
    deletions: Box[]
}

/**
 * Where an edit is drawn, the boxes it inserts apart from the ones it
 * deletes.
 *
 * What a version does away with is drawn where it stood, which for a
 * version coded for another system means the bar its parent was coded
 * for: a green version's deletions are red commands, and the arrow
 * saying what became of them ought to start from the lane the red scale
 * put them in.
 */
export const editBoxes = (
    edit: Edit,
    editionView: EditionView,
    translation: Translation,
    deletedIn: Translation = translation
): EditBoxes => ({
    insertions: (edit.insert ?? [])
        .map(symbol => getSymbolBBox(symbol, editionView, translation))
        .filter(bbox => !!bbox),
    deletions: deletedSymbolsOf(edit, editionView)
        .map(symbol => getSymbolBBox(symbol, editionView, deletedIn))
        .filter(bbox => !!bbox)
})

export const getEditBBoxes = (
    edit: Edit,
    editionView: EditionView,
    translation: Translation,
    deletedIn: Translation = translation
) => {
    const { insertions, deletions } = editBoxes(edit, editionView, translation, deletedIn)
    return [...insertions, ...deletions]
}

/** One end of what an edit touches: where it begins on the roll, and where it ends. */
export type End = 'onset' | 'offset'

const ends: readonly End[] = ['onset', 'offset']

/** The stretch of roll a set of symbols covers, from the first onset to the last offset. */
export type Stretch = Pick<HorizontalSpan, 'from' | 'to'>

export const stretchOf = (
    symbols: readonly AnySymbol[],
    editionView: Pick<EditionView, 'placeOf'>
): Stretch | undefined => {
    const places = symbols.map(symbol => editionView.placeOf(symbol)).filter(place => !!place)
    if (!places.length) return undefined

    return {
        from: places.map(place => place.from).reduce(min),
        to: places.map(place => place.to).reduce(max)
    }
}

/**
 * The ends an edit moved further than the collation it came out of would
 * have overlooked, which are the ends there is anything to say about.
 *
 * Where both ends moved and the command kept its length, it was moved as
 * a whole, and the arrow at its onset says that; a shortening or a
 * prolonging moves the offset alone. The length is measured against the
 * tolerance at the end, since it is the end that has to have moved for
 * the command to have grown or shrunk.
 */
export const endsThatMoved = (
    was: Stretch | undefined,
    now: Stretch | undefined,
    tolerance: CollationTolerance
): readonly End[] => {
    if (!was || !now) return []

    const moved = {
        onset: distance(was.from, now.from) > tolerance.toleranceStart,
        offset: distance(was.to, now.to) > tolerance.toleranceEnd
    }
    const keptItsLength =
        distance(subtract(was.to, was.from), subtract(now.to, now.from)) <= tolerance.toleranceEnd

    if (moved.onset && moved.offset && keptItsLength) return ['onset']

    return ends.filter(end => moved[end])
}

/** The box taken at one of its ends, which is what an arrow about that end joins. */
export const endOf = (box: Box, end: End): Box =>
    ({ ...box, x: end === 'onset' ? box.x : add(box.x, box.width), width: svg(0) })

/** An edit whose two ends both moved draws an arrow at each, so each needs its own id. */
export const arrowId = (edit: Edit, end: End, drawn: readonly End[]): string =>
    drawn.length > 1 ? `${edit.id}-${end}` : edit.id

/** How far the mark of an edit's belief is raised above what the edit touches. */
const beliefMarkRise = svg(20)

/** Where the mark of the belief an edit is held under sits: just above the right edge of what it touches. */
export const beliefMarkAt = (boxes: readonly Box[]): Point => {
    const { x, y, width } = getBoundingBox(boxes.flatMap(cornersOf))
    return point(add(x, width), subtract(y, beliefMarkRise))
}

/** The word written under an edit's insertions, where its type calls for one. */
export const editTypeLabel = (editType: EditType | undefined): string | undefined => {
    if (!editType) return undefined
    if (editType === 'additional-accent') return '>'
    if (editType === 'correct-error') return 'fix'
    // a shift is already told by the arrow from the old place to the new one
    if (editType === 'shift') return undefined
    return editType.replaceAll('-', ' ')
}

/** An edit that inserts as well as deletes draws two hulls, so each needs its own id. */
export const hullId = (edit: Edit, part: 'insert' | 'delete'): string =>
    (edit.insert?.length && edit.delete?.length)
        ? `${edit.id}-${part}`
        : edit.id

interface EditHullProps {
    id: string
    boxes: Box[]
    fill: string
    label?: string
    onClick?: MouseEventHandler
}

/** The hull around one side of an edit, the inserted symbols or the deleted ones. */
const EditHull = ({ id, boxes, fill, label, onClick }: EditHullProps) => {
    const { points, hull } = getHull(boxes)
    const bbox = getBoundingBox(points)

    return (
        <Hull
            id={id}
            hull={hull}
            fillOpacity={0.8}
            fill={fill}
            onClick={e => onClick?.(e)}
            label={label && (
                <text
                    x={bbox.x + 8}
                    y={bbox.y + bbox.height + 8}
                    fontSize={12}
                    fill='black'
                    style={{ pointerEvents: 'none' }}
                    fontWeight='bold'
                >
                    {label}
                </text>
            )}
        />
    )
}

interface EditViewProps {
    edit: Edit;
    /**
     * The bar the version this is based on was coded for, where that is
     * another system's. What the edit deletes is drawn by it.
     */
    deletedOn?: TrackerBar;
    /**
     * The tolerance this version was collated at, which decides which of
     * an edit's ends counts as moved. The edition's own is the fallback.
     */
    tolerance?: CollationTolerance;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, deletedOn, tolerance, onClick }: EditViewProps) => {
    const { view } = useContext(EditionContext)
    const translation = usePinchZoom()
    const { trackHeight, spacing, bar } = translation

    // Laying the other bar out the same way puts a deleted command where
    // its own scale had it, which is what the arrow should start from.
    const deletedIn = useMemo(
        () => deletedOn && deletedOn.id !== bar.id
            ? { ...translation, ...rollGeometry(trackHeight, spacing, deletedOn) }
            : translation,
        [deletedOn, bar, translation, trackHeight, spacing]
    )

    if (!view) return null

    const { insertions, deletions } = editBoxes(edit, view, translation, deletedIn)
    // What is drawn, not what the edit names: a symbol no bar can place
    // has no box, and an arrow to or from nothing draws nothing.
    const inserted = insertions.length
    const deleted = deletions.length

    /**
     * An edit that both inserts and deletes puts one thing in the place
     * of another, and the arrow from the old to the new says that on its
     * own. Hulls and a word as well would say it three times over, which
     * on a transfer between systems is every expression on the roll.
     *
     * Which ends the arrows are drawn at is read off the places
     * themselves rather than off the edit's type: a command that kept its
     * lane gets one at each end that the collation would have called a
     * difference, and one that changed lane gets the arrow between the
     * two boxes, since there it is the lane that moved.
     */
    if (inserted > 0 && deleted > 0) {
        const was = getBoundingBox(getHull(deletions).points)
        const now = getBoundingBox(getHull(insertions).points)

        const moved = inOneLane(was, now)
            ? endsThatMoved(
                stretchOf(deletedSymbolsOf(edit, view), view),
                stretchOf(edit.insert ?? [], view),
                tolerance ?? defaultCollationTolerance
            )
            : []

        if (!moved.length) {
            return <Arrow from={was} to={now} onClick={onClick} svgProps={{ id: edit.id }} />
        }

        return (
            <g>
                {moved.map(end => (
                    <Arrow
                        key={end}
                        from={endOf(was, end)}
                        to={endOf(now, end)}
                        onClick={onClick}
                        svgProps={{ id: arrowId(edit, end, moved) }}
                    />
                ))}
            </g>
        )
    }

    return (
        <g>

            {inserted > 0 && (
                <EditHull
                    id={hullId(edit, 'insert')}
                    boxes={insertions}
                    fill={insertionFill}
                    label={editTypeLabel(edit.editType)}
                    onClick={onClick}
                />
            )}

            {deleted > 0 && (
                <EditHull
                    id={hullId(edit, 'delete')}
                    boxes={deletions}
                    fill={deletionFill}
                    onClick={onClick}
                />
            )}
        </g>
    );
}

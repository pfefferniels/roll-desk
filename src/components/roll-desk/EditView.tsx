import {
    admittedAtEnds,
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
import { Svg, svg } from "../../helpers/units";
import { glowReach, outlineStrength } from "../../helpers/glow";
import { Arguable } from "./Arguable";


export type { Translation }

/** How one side of an edit is drawn: the colour it is filled with, and the deeper one its glow carries. */
interface EditColours {
    fill: string
    glow: string
}

const insertion: EditColours = { fill: '#aceebb', glow: '#2f9e44' }
const deletion: EditColours = { fill: '#fb7f78', glow: '#d64545' }

/** A shift puts one thing in the place of another and is drawn as an arrow, which has no fill of its own. */
const shiftGlow = '#4b5563'

/** How an edit stands while a motivation is in focus: as one of its own, or as the ground around it. */
export type Focus = 'lit' | 'dimmed'

/** How far an edit's glow reaches, and how plainly the shape itself is drawn. */
interface EditLook {
    reach: Svg
    fillOpacity: number
    outline: number
}

/**
 * The look an edit drawn this wide takes.
 *
 * With a motivation in focus its own edits come forward and the rest fall
 * back to their bare geometry, so that what belongs together is seen at a
 * glance without an area drawn around it.
 */
const lookOf = (width: Svg, focus?: Focus): EditLook => {
    const reach = glowReach(width)

    if (focus === 'dimmed') return { reach: svg(0), fillOpacity: 0.15, outline: 0.15 }
    if (focus === 'lit') return { reach: svg(reach * 1.6), fillOpacity: 1, outline: 1 }

    return { reach, fillOpacity: 0.8, outline: outlineStrength(width) }
}

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

    const admitted = admittedAtEnds(tolerance, {
        from: subtract(now.from, was.from),
        to: subtract(now.to, was.to)
    })
    const moved = { onset: !admitted.from, offset: !admitted.to }
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
    colours: EditColours
    focus?: Focus
    label?: string
    onClick?: MouseEventHandler
}

/** The hull around one side of an edit, the inserted symbols or the deleted ones. */
const EditHull = ({ id, boxes, colours, focus, label, onClick }: EditHullProps) => {
    const { points, hull } = getHull(boxes)
    const bbox = getBoundingBox(points)
    const { reach, fillOpacity, outline } = lookOf(bbox.width, focus)

    return (
        <Hull
            id={id}
            hull={hull}
            fillOpacity={fillOpacity}
            fill={colours.fill}
            glow={{ colour: colours.glow, reach }}
            outline={outline}
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
    /** Where the edit stands while a motivation is in focus, nowhere in particular when none is. */
    focus?: Focus;
    onClick?: MouseEventHandler;
}

export const EditView = ({ edit, deletedOn, tolerance, focus, onClick }: EditViewProps) => {
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

    const annotated = edit['@annotation'] && view.getPath(edit.id)

    // The belief an edit is held under is read while its motivation is in
    // focus; a mark over every edit at once would bury the roll.
    const belief = focus === 'lit' && annotated && (inserted + deleted) > 0 && (
        <Arguable asSVG={{ buttonPlacement: beliefMarkAt([...insertions, ...deletions]) }} path={annotated}>
            {null}
        </Arguable>
    )

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

        const span = getBoundingBox([...cornersOf(was), ...cornersOf(now)])
        const { reach, outline } = lookOf(span.width, focus)
        const glow = { colour: shiftGlow, reach }

        return (
            <g data-motivation={edit.motivation}>
                {moved.length === 0 && (
                    <Arrow
                        from={was}
                        to={now}
                        glow={glow}
                        outline={outline}
                        onClick={onClick}
                        svgProps={{ id: edit.id }}
                    />
                )}

                {moved.map(end => (
                    <Arrow
                        key={end}
                        from={endOf(was, end)}
                        to={endOf(now, end)}
                        glow={glow}
                        outline={outline}
                        onClick={onClick}
                        svgProps={{ id: arrowId(edit, end, moved) }}
                    />
                ))}

                {belief}
            </g>
        )
    }

    return (
        <g data-motivation={edit.motivation}>

            {inserted > 0 && (
                <EditHull
                    id={hullId(edit, 'insert')}
                    boxes={insertions}
                    colours={insertion}
                    focus={focus}
                    label={editTypeLabel(edit.editType)}
                    onClick={onClick}
                />
            )}

            {deleted > 0 && (
                <EditHull
                    id={hullId(edit, 'delete')}
                    boxes={deletions}
                    colours={deletion}
                    focus={focus}
                    onClick={onClick}
                />
            )}

            {belief}
        </g>
    );
}

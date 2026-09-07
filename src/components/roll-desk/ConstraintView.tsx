import { ReactNode, useContext, useMemo } from "react"
import { AnyPerforation, AnySymbol, ConstraintProblem, Path, PlacementRelation, isPerforation } from "linked-rolls"
import { EditionContext } from "../../providers/EditionContext"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Box } from "../../helpers/rollGeometry"
import { pairsIn, placementsIn, troubledSymbols } from "../../helpers/constraints"
import { getSymbolBBox } from "./EditView"
import { Arguable } from "./Arguable"
import { alignmentLook, pairLook, problemLook } from "./constraintLooks"

/** The shapes let clicks through to the symbols beneath them. */
const quiet = { pointerEvents: 'none' } as const

const buttonSize = 40

const onsetOf = (box: Box): Box => ({ ...box, width: 2 })
const middleOf = (box: Box) => box.y + box.height / 2
const shifted = (box: Box, dx: number): Box => ({ ...box, x: box.x + dx })
const padded = (box: Box, margin: number): Box => ({
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + 2 * margin,
    height: box.height + 2 * margin
})
type Point = { x: number; y: number }

interface StatementProps {
    shape: ReactNode
    /** Where the statement sits in the edition, for its belief. */
    path: Path
    /** Where the belief button goes when the zoom leaves room for it. */
    button?: Point
}

/** A drawn statement with its belief button, where the zoom leaves room for one. */
const Statement = ({ shape, path, button }: StatementProps) =>
    button
        ? <Arguable asSVG={{ buttonPlacement: button }} path={path}>{shape}</Arguable>
        : <>{shape}</>

interface ConnectorProps {
    from: Box
    to: Box
    path: Path
    /** Whether the zoom leaves room for the belief button. */
    detailed: boolean
}

/** A straight line from the onset of the follower to the onset of the perforation it is placed by. */
const PlacementConnector = ({ from, to, path, detailed }: ConnectorProps) => (
    <Statement
        path={path}
        button={detailed ? { x: (from.x + to.x) / 2 + 3, y: (middleOf(from) + middleOf(to)) / 2 - 14 } : undefined}
        shape={
            <line
                x1={from.x} y1={middleOf(from)}
                x2={to.x} y2={middleOf(to)}
                {...alignmentLook}
                style={quiet}
            />
        }
    />
)

/** A bracket under both members of a pair. */
const PairLink = ({ from: one, to: other, path, detailed }: ConnectorProps) => {
    const bottom = Math.max(one.y + one.height, other.y + other.height) + 6
    return (
        <Statement
            path={path}
            button={detailed ? { x: (one.x + other.x) / 2 - buttonSize / 2, y: bottom } : undefined}
            shape={
                <path
                    d={`M ${one.x} ${middleOf(one)} L ${one.x} ${bottom} L ${other.x} ${bottom} L ${other.x} ${middleOf(other)}`}
                    {...pairLook}
                    style={quiet}
                />
            }
        />
    )
}

interface ConstraintViewProps {
    snapshot: readonly AnySymbol[]
    /** How far the performance moves each perforation it moves, in mm, by id. */
    shifts: ReadonlyMap<string, number>
    /** The problems of this version. */
    problems: readonly ConstraintProblem[]
}

/**
 * The placements and pairs among the symbols of a version, attached to
 * the perforations where they play, and the statements that cannot
 * hold. Drawn over the symbols, which stay clickable.
 */
export const ConstraintView = ({ snapshot, shifts, problems }: ConstraintViewProps) => {
    const { view } = useContext(EditionContext)
    const translation = usePinchZoom()

    const placements = useMemo(() => placementsIn(snapshot), [snapshot])
    const pairs = useMemo(() => pairsIn(snapshot), [snapshot])
    const troubled = useMemo(() => Array.from(troubledSymbols(problems)), [problems])

    if (!view) return null

    const detailed = translation.zoom >= 0.7

    /** Where the perforation is drawn: its measurement, moved as far as the performance moves it. */
    const boxed = (symbol: AnyPerforation) => {
        const box = getSymbolBBox(symbol, view, translation)
        return box && shifted(box, translation.translateX(shifts.get(symbol.id) ?? 0))
    }

    const connector = (one: AnyPerforation, other: AnyPerforation, key: PlacementRelation | 'pairedWith'): ConnectorProps | undefined => {
        const from = boxed(one)
        const to = boxed(other)
        const path = view.getPath(one.id)
        if (!from || !to || !path) return undefined
        return { from: onsetOf(from), to: onsetOf(to), path: [...path, key], detailed }
    }

    const mark = (id: string) => {
        const symbol = view.get<AnySymbol>(id)
        const box = isPerforation(symbol) ? boxed(symbol) : undefined
        return box && <rect key={id} {...padded(box, 2)} {...problemLook} style={quiet} />
    }

    return (
        <g className='constraints'>
            {placements.map(({ relation, follower, reference }) => {
                const props = connector(follower, reference, relation)
                return props && <PlacementConnector key={follower.id} {...props} />
            })}
            {pairs.map(({ stating, partner }) => {
                const props = connector(stating, partner, 'pairedWith')
                return props && <PairLink key={stating.id} {...props} />
            })}
            {troubled.map(mark)}
        </g>
    )
}

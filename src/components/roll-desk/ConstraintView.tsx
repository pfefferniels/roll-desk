import { ReactNode, useContext, useMemo } from "react"
import { add, AnyPerforation, AnySymbol, ConstraintProblem, max, Millimeters, mm, Path, PlacementRelation, isPerforation, scale, subtract } from "linked-rolls"
import { EditionContext } from "../../providers/EditionContext"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Box } from "../../helpers/rollGeometry"
import { Point } from "../../helpers/drawing"
import { Svg, svg, svgPerMm } from "../../helpers/units"
import { pairsIn, placementsIn, troubledSymbols } from "../../helpers/constraints"
import { getSymbolBBox } from "./EditView"
import { Arguable } from "./Arguable"
import { alignmentLook, pairLook, problemLook } from "./constraintLooks"

/** The shapes let clicks through to the symbols beneath them. */
const quiet = { pointerEvents: 'none' } as const

const buttonSize = svg(40)

const onsetOf = (box: Box): Box => ({ ...box, width: svg(2) })
const middleOf = (box: Box) => add(box.y, scale(box.height, 0.5))
const shifted = (box: Box, dx: Svg): Box => ({ ...box, x: add(box.x, dx) })
const padded = (box: Box, margin: Svg): Box => ({
    x: subtract(box.x, margin),
    y: subtract(box.y, margin),
    width: add(box.width, scale(margin, 2)),
    height: add(box.height, scale(margin, 2))
})

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
/** The belief button for a connector, set just above the line's middle. */
const buttonAbove = (from: Box, to: Box): Point => ({
    x: add(scale(add(from.x, to.x), 0.5), svg(3)),
    y: subtract(scale(add(middleOf(from), middleOf(to)), 0.5), svg(14))
})

const PlacementConnector = ({ from, to, path, detailed }: ConnectorProps) => (
    <Statement
        path={path}
        button={detailed ? buttonAbove(from, to) : undefined}
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
    const bottom = add(max(add(one.y, one.height), add(other.y, other.height)), svg(6))
    return (
        <Statement
            path={path}
            button={detailed ? { x: subtract(scale(add(one.x, other.x), 0.5), scale(buttonSize, 0.5)), y: bottom } : undefined}
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
    /** How far the performance moves each perforation it moves, by id. */
    shifts: ReadonlyMap<string, Millimeters>
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

    const detailed = translation.zoom >= svgPerMm(0.7)

    /** Where the perforation is drawn: its measurement, moved as far as the performance moves it. */
    const boxed = (symbol: AnyPerforation) => {
        const box = getSymbolBBox(symbol, view, translation)
        return box && shifted(box, translation.translateX(shifts.get(symbol.id) ?? mm(0)))
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
        return box && <rect key={id} {...padded(box, svg(2))} {...problemLook} style={quiet} />
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

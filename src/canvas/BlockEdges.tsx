import { PointerEvent, useLayoutEffect, useRef, useState } from "react"
import { TrackArea, TrackRole } from "linked-rolls"
import { usePinchZoom } from "./usePinchZoom"
import { Svg, svg } from "./units"

export type Edge = 'top' | 'bottom'

/** What a block's lanes may be dragged to, so that a lane stays something to see and the drawing something to read. */
const laneLimits: Record<TrackRole, readonly [Svg, Svg]> = {
    'bass-expression': [svg(2), svg(40)],
    note: [svg(0.5), svg(12)],
    'treble-expression': [svg(2), svg(40)]
}

const lanesIn = (area: TrackArea) => area.to - area.from + 1

/**
 * The lane height a block takes when one of its edges is dragged `dy`
 * down the screen from where it stood at `lane`. Dragged outwards, up for
 * the top edge and down for the bottom one, the block grows; the change is
 * shared out among its lanes and held within what keeps a lane legible.
 */
export const draggedLane = (area: TrackArea, edge: Edge, lane: Svg, dy: number): Svg => {
    const grown = edge === 'bottom' ? dy : -dy
    const [least, most] = laneLimits[area.role]
    return svg(Math.min(most, Math.max(least, lane + grown / lanesIn(area))))
}

/** How far a handle reaches out from the edge it moves, in drawing units. */
const reach = svg(6)

const scrolls = (node: Element) => {
    const { overflowY } = window.getComputedStyle(node)
    return node === document.scrollingElement || overflowY === 'auto' || overflowY === 'scroll'
}

/**
 * Scrolls the drawing down by `distance`, as far as each scrolling element
 * around it can take it and the rest by the next one out, so that a
 * viewport with a few pixels of play passes the scroll on to the page.
 */
const scrollAround = (element: Element, distance: number) => {
    let left = distance
    for (let node = element.parentElement; node && Math.abs(left) >= 0.5; node = node.parentElement) {
        if (!scrolls(node)) continue
        const before = node.scrollTop
        node.scrollTop = before + left
        left -= node.scrollTop - before
    }
}

interface Dragging {
    area: TrackArea
    edge: Edge
    /** Where the pointer went down, in client pixels, which are drawing units. */
    startY: number
    /** The lane height the block had when the drag began. */
    lane: Svg
}

interface BlockEdgesProps {
    /** Gives the lanes of a block of the bar another height. */
    onResize: (role: TrackRole, lane: Svg) => void
}

/**
 * Handles along the top and bottom edge of each block of the bar, by which
 * the block is dragged taller or shorter. They lie just outside the block,
 * in the gap beside it, so that the outermost lanes stay free to point at.
 *
 * The drawing is laid out from the top, so a block grown at its top edge
 * would push itself and everything under it down. The page is scrolled by
 * as much, so that it is the edge being dragged that moves and the rest of
 * the roll stays where it was.
 */
export const BlockEdges = ({ onResize }: BlockEdgesProps) => {
    const { areas, areaBand, translateX, rollLength, trackHeight } = usePinchZoom()
    const [hovered, setHovered] = useState<string>()
    const [dragging, setDragging] = useState<Dragging>()

    const group = useRef<SVGGElement>(null)
    /** How far the next layout pushes the roll down under a block grown at its top, to be scrolled away. */
    const pushedDown = useRef(0)

    useLayoutEffect(() => {
        const growth = pushedDown.current
        pushedDown.current = 0
        if (!growth || !group.current) return
        scrollAround(group.current, growth)
    }, [trackHeight])

    const width = translateX(rollLength)

    const move = (e: PointerEvent) => {
        if (!dragging) return

        const { area, edge, startY, lane } = dragging
        const next = draggedLane(area, edge, lane, e.clientY - startY)
        const current = trackHeight[area.role]
        if (next === current) return

        if (edge === 'top') pushedDown.current += (next - current) * lanesIn(area)
        onResize(area.role, next)
    }

    const end = (e: PointerEvent) => {
        if (!dragging) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        setDragging(undefined)
    }

    return (
        <g className='blockEdges' ref={group}>
            {areas.flatMap(area => {
                const { y, height } = areaBand(area)
                return (['top', 'bottom'] as const).map(edge => {
                    const key = `${area.role}-${edge}`
                    const at = edge === 'top' ? y : y + height
                    const lit = hovered === key || (dragging?.area.role === area.role && dragging.edge === edge)

                    return (
                        <g key={key}>
                            {lit && (
                                <line
                                    x1={0}
                                    x2={width}
                                    y1={at}
                                    y2={at}
                                    stroke='#1976d2'
                                    strokeWidth={2}
                                    pointerEvents='none'
                                />
                            )}
                            <rect
                                x={0}
                                width={width}
                                y={edge === 'top' ? at - reach : at}
                                height={reach}
                                fill='transparent'
                                style={{ cursor: 'ns-resize' }}
                                onPointerEnter={() => setHovered(key)}
                                onPointerLeave={() => setHovered(current => current === key ? undefined : current)}
                                onPointerDown={e => {
                                    if (e.button !== 0) return
                                    e.currentTarget.setPointerCapture(e.pointerId)
                                    setDragging({ area, edge, startY: e.clientY, lane: trackHeight[area.role] })
                                }}
                                onPointerMove={move}
                                onPointerUp={end}
                                onPointerCancel={end}
                            />
                        </g>
                    )
                })
            })}
        </g>
    )
}

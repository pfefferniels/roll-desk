import { RefObject } from "react"
import { Millimeters } from "linked-rolls"
import { rollPointAt } from "../helpers/pointer"
import { usePinchZoom } from "./usePinchZoom"
import { Drag, useDrag } from "./useDrag"
import type { RollRange } from "../providers/SelectionContext"

/** A drag running along the roll, both ends measured from its start. */
export type RollDrag = Drag<Millimeters>

/** How far the pointer may travel and still read as a click, in screen pixels. */
const clickSlop = 4

/** The stretch a drag covers, whichever way round it was drawn. */
const spanOf = ({ from, to }: RollDrag): RollRange =>
    from < to ? [from, to] : [to, from]

/**
 * The stretch a gesture marks, and nothing where it stayed a click.
 * The slop is measured on screen, so what counts as holding still
 * does not change with the zoom.
 */
export const spanDragged = (drag: RollDrag, zoom: number): RollRange | undefined =>
    Math.abs(drag.to - drag.from) * zoom < clickSlop ? undefined : spanOf(drag)

/**
 * The drag currently running over `element`, and nothing between drags.
 * The pointer is followed on the window, so a gesture that wanders off
 * the element still ends where the button is released.
 */
export const useRollDrag = (
    element: RefObject<SVGGraphicsElement | null>,
    onDone?: (drag: RollDrag) => void
): RollDrag | undefined => {
    const { zoom } = usePinchZoom()

    return useDrag(element, event => {
        const target = element.current
        return target ? rollPointAt(target, event, zoom)?.x : undefined
    }, onDone)
}

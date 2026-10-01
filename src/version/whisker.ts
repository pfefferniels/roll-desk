import { Expression, Note, scale, Track } from "linked-rolls"
import { Band } from "../canvas/rollGeometry"
import { Svg, svg } from "../canvas/units"
import { Room } from "../canvas/usePinchZoom"

/** A half of the keyboard, as the expression divides it. */
export type Half = 'bass' | 'treble'

/**
 * The half a command answers to: an expression the one its scope names,
 * a note the one the division puts it in, the treble from the division
 * upwards. Nothing for a note where no division is known, which is where
 * no emulator performs the version.
 */
export const halfOf = (command: Note | Expression, position: Track, division?: Track): Half | undefined => {
    if (command.type === 'expression') return command.scope
    if (division === undefined) return undefined
    return position >= division ? 'treble' : 'bass'
}

/**
 * Where a command's whiskers begin and end, top to bottom. At rest they
 * keep among its own lanes, a lane above and two below. While the command
 * is looked at they run on through its own half's expression to the far
 * edge of that half's dynamics, up for the treble and down for the bass,
 * so that it is read against what shapes it and not the other half's.
 * A note of no known half reaches over the whole bar.
 */
export const whiskerReach = (
    lane: Band,
    lookedAt: boolean,
    half: Half | undefined,
    { height, room }: { height: Svg, room: Room }
): readonly [Svg, Svg] => {
    const above = svg(lane.y - lane.height)
    const below = svg(lane.y + 2 * lane.height)

    if (!lookedAt) return [above, below]
    if (half === 'treble') return [scale(room.above, -1), below]
    if (half === 'bass') return [above, svg(height + room.below)]
    return [svg(0), height]
}

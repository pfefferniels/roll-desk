import { add, FeatureOrPatch, Modification, NestedFeature, subtract, withBorneFeatures } from 'linked-rolls'
import { Box, cornersOf, Point } from '../geometry/drawing'
import { getBoundingBox } from '../geometry/getBoundingBox'
import { Svg, svg } from '../canvas/units'

/** Whether two boxes come within the gap of each other, on both axes at once. */
export const near = (a: Box, b: Box, gap: Svg): boolean =>
    a.x - gap <= b.x + b.width &&
    b.x - gap <= a.x + a.width &&
    a.y - gap <= b.y + b.height &&
    b.y - gap <= a.y + a.height

/** Boxes that lie close enough together to be drawn round as one. */
export interface Cluster {
    /** Where the boxes stand in the list they were given. */
    members: number[]
    /** The boxes themselves, in the same order. */
    boxes: Box[]
    /** The least box holding all of them. */
    box: Box
}

/**
 * The boxes in the clusters they form: two lie in one where a chain of
 * boxes, each within the gap of the next, joins them. The gap is taken
 * on the drawing, so that what reads as one place at the zoom on screen
 * is outlined as one, and what lies in another block of the bar, or far
 * along the roll, gets an outline of its own instead of one stretched
 * over everything between. The clusters run from the start of the roll.
 */
export const clustersOf = (boxes: readonly Box[], gap: Svg): Cluster[] =>
    boxes
        .reduce<Pick<Cluster, 'members' | 'boxes'>[]>((clusters, box, index) => {
            // A box near several clusters joins them into one.
            const joined = clusters.filter(cluster => cluster.boxes.some(other => near(box, other, gap)))
            return [
                ...clusters.filter(cluster => !joined.includes(cluster)),
                {
                    members: [...joined.flatMap(cluster => cluster.members), index],
                    boxes: [...joined.flatMap(cluster => cluster.boxes), box]
                }
            ]
        }, [])
        .map(({ members, boxes }) => {
            const order = members.map((member, at) => ({ member, box: boxes[at] as Box })).sort((a, b) => a.member - b.member)
            return {
                members: order.map(({ member }) => member),
                boxes: order.map(({ box }) => box),
                box: getBoundingBox(boxes.flatMap(cornersOf))
            }
        })
        .sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y)

/** Where a tag would like to sit, and how wide it is. */
export interface TagRequest {
    /** The top left corner of what it names. */
    anchor: Point
    width: Svg
}

const overlap = (a: Box, b: Box): boolean =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** The heights a tag may take, nearest the one it prefers first: rising row by row to the top of the drawing, then sinking. */
function* heightsFrom(preferred: number, step: number) {
    const start = Math.max(0, preferred)
    for (let y = start; y >= 0; y -= step) yield y
    for (let y = start + step; ; y += step) yield y
}

/**
 * Where each tag goes: just above the top left corner of what it names,
 * or, where an earlier tag stands there already, as many rows higher as
 * it takes to stand free of it. A tag never rises above the top of the
 * drawing; where there is no room up there it goes down instead.
 * Tags are placed from the start of the roll, so that the first keeps
 * its place, and come back in the order they were asked for, each with
 * the box it was given.
 */
export const placeTags = <T extends TagRequest>(requests: readonly T[], height: Svg, gap: Svg): (T & { tag: Box })[] => {
    const step = add(height, gap)
    const placed = new Map<number, Box>()

    requests
        .map((request, index) => ({ request, index }))
        .sort((a, b) => a.request.anchor.x - b.request.anchor.x)
        .forEach(({ request: { anchor, width }, index }) => {
            const at = (y: number): Box => ({ x: anchor.x, y: svg(y), width, height })
            const taken = [...placed.values()]

            for (const y of heightsFrom(subtract(subtract(anchor.y, height), gap), step)) {
                const box = at(y)
                if (taken.some(other => overlap(box, other))) continue
                placed.set(index, box)
                break
            }
        })

    return requests.map((request, index) => ({
        ...request,
        tag: placed.get(index) ?? { ...request.anchor, width: request.width, height }
    }))
}

/** What the act was for, in words, or what kind of act it was where that is not stated. */
export const purposeOf = (modification: Modification): string =>
    (modification.purpose ?? modification.type.toLowerCase()).replaceAll('-', ' ')

const nouns: Record<FeatureOrPatch['type'], readonly [string, string]> = {
    HoleChain: ['hole chain', 'hole chains'],
    Writing: ['writing', 'writings'],
    Mark: ['mark', 'marks'],
    Patch: ['patch', 'patches']
}

/** What the features are, counted by kind in the order they first come: "2 patches", "1 writing, 3 marks". */
export const contentsOf = (features: readonly Pick<FeatureOrPatch, 'type'>[]): string => {
    const counts = new Map<FeatureOrPatch['type'], number>()
    features.forEach(({ type }) => counts.set(type, (counts.get(type) ?? 0) + 1))

    return [...counts]
        .map(([type, count]) => `${count} ${nouns[type][count === 1 ? 0 : 1]}`)
        .join(', ')
}

/** The texts the features carry, a patch's among them, each on one line. */
export const textsOf = (features: readonly NestedFeature[]): string[] =>
    features
        .flatMap(withBorneFeatures)
        .flatMap(feature => feature.type === 'Writing' ? [feature.transcription.text] : [])
        .map(text => text.split('\n').map(line => line.trim()).filter(Boolean).join(' / '))
        .filter(Boolean)

/** A text cut short where it runs longer than the room, with an ellipsis to say so. */
export const shortened = (text: string, room: number): string =>
    text.length <= room ? text : `${text.slice(0, room - 1).trimEnd()}…`

/** Whether a point lies within a convex polygon, whichever way round its corners run. */
export const within = (point: Point, polygon: readonly Point[]): boolean => {
    if (polygon.length < 3) return false

    const sides = polygon.map((corner, i) => {
        const next = polygon[(i + 1) % polygon.length] ?? corner
        return (next.x - corner.x) * (point.y - corner.y) - (next.y - corner.y) * (point.x - corner.x)
    })
    return sides.every(side => side >= 0) || sides.every(side => side <= 0)
}

/** How much room a polygon takes, by the shoelace formula. */
export const areaOf = (polygon: readonly Point[]): number =>
    Math.abs(polygon.reduce((sum, corner, i) => {
        const next = polygon[(i + 1) % polygon.length] ?? corner
        return sum + corner.x * next.y - next.x * corner.y
    }, 0)) / 2

/**
 * Of the things drawn round the point, the one that draws round the
 * least: where outlines lie one in another, the pointer means the one it
 * is most narrowly within.
 */
export const narrowestAround = <T extends { areas: readonly (readonly Point[])[] }>(
    things: readonly T[],
    point: Point
): T | undefined =>
    things
        .flatMap(thing => thing.areas
            .filter(area => within(point, area))
            .map(area => ({ thing, size: areaOf(area) })))
        .sort((a, b) => a.size - b.size)[0]?.thing

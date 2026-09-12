// The following code was taken from the MuseReduce
// project (https://github.com/DCMLab/reductive_analysis_app/blob/master/src/js/utils.js),
// ported to Typescript and slightly adapted.

import { polygonHull } from 'd3-polygon'
import { Point } from './drawing'
import { Svg } from './units'

/** The vendored maths below works in pairs, so the drawing's points are laid out as such. */
type Pair = [number, number]

// Vector operations, taken from
// http://bl.ocks.org/hollasch/f70f1fe7700f092b5a505e3efd1d9232
const vecScale = function (scale: number, v: Pair): Pair {
  // Returns the vector 'v' scaled by 'scale'.
  return [scale * v[0], scale * v[1]]
}

// Returns the sum of two vectors, or a combination of a point and a
// vector.
const vecSum = function (pv1: Pair, pv2: Pair): Pair {
  return [pv1[0] + pv2[0], pv1[1] + pv2[1]]
}

// Returns the unit normal to the line segment from p0 to p1.
const unitNormal = function (p0: Pair, p1: Pair): Pair {
  const n: Pair = [p0[1] - p1[1], p1[0] - p0[0]]
  const nLength = Math.sqrt(n[0] * n[0] + n[1] * n[1])
  return [n[0] / nLength, n[1] / nLength]
}

/** A pair as a path takes it, which is what its own toString gave. */
const at = (p: Pair) => `${p[0]},${p[1]}`

// Returns the path for a rounded hull around a single point (a circle).
const roundedHull1 = function (only: Pair, hullPadding: number) {
  const p1: Pair = [only[0], only[1] - hullPadding]
  const p2: Pair = [only[0], only[1] + hullPadding]

  return `M ${at(p1)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p2)].join(',')
    + ' A '
    + [hullPadding, hullPadding, '0,0,0', at(p1)].join(',')
}

// Returns the path for a rounded hull around two points (a "capsule" shape).
const roundedHull2 = function (one: Pair, other: Pair, hullPadding: number) {
  const offsetVector = vecScale(hullPadding, unitNormal(one, other))
  const invOffsetVector = vecScale(-1, offsetVector)
  // around that note coordinates are not at the centroids

  const p0 = vecSum(one, offsetVector)
  const p1 = vecSum(other, offsetVector)
  const p2 = vecSum(other, invOffsetVector)
  const p3 = vecSum(one, invOffsetVector)

  return `M ${at(p0)} L ${at(p1)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p2)].join(',')
    + ` L ${at(p3)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p0)].join(',')
}

/** Every edge of a closed polygon, each point paired with the one before it. */
const edgesOf = (polyPoints: Pair[]): [Pair, Pair][] => {
  const last = polyPoints.at(-1)
  if (!last) return []

  return polyPoints.reduce<{ previous: Pair, edges: [Pair, Pair][] }>(
    ({ previous, edges }, point) => ({
      previous: point,
      edges: [...edges, [previous, point]]
    }),
    { previous: last, edges: [] }
  ).edges
}

// Returns the SVG path data string representing the polygon, expanded and rounded.
const roundedHullN = function (polyPoints: Pair[], hullPadding: number) {
  const [first, second] = polyPoints

  // Handle special cases
  if (!first) return ''
  if (!second) return roundedHull1(first, hullPadding)
  if (polyPoints.length === 2) return roundedHull2(first, second, hullPadding)

  // Each edge of the hull, moved outwards by the padding.
  const offsets = edgesOf(polyPoints).map(([p0, p1]): [Pair, Pair] => {
    const offset = vecScale(hullPadding, unitNormal(p0, p1))
    return [vecSum(p0, offset), vecSum(p1, offset)]
  })

  const lastOffset = offsets.at(-1)
  if (!lastOffset) return ''

  const arcData = 'A ' + [hullPadding, hullPadding, '0,0,0,'].join(',')

  const segments = offsets.map(function (segment, index) {
    const opening = index === 0 ? 'M ' + at(lastOffset[1]) + ' ' : ''
    return opening + arcData + at(segment[0]) + ' L ' + at(segment[1])
  })

  return segments.join(' ')
}

/**
 * The two ends of a set of points that lie on one line. Ordering them by
 * x and then by y puts the ends first and last, whichever way the line runs.
 */
const extremes = (first: Pair, rest: Pair[]): [Pair, Pair] => {
  const sorted = [first, ...rest].sort(([ax, ay], [bx, by]) => ax - bx || ay - by)
  return [sorted.at(0) ?? first, sorted.at(-1) ?? first]
}

/*
 * Calculates rounded hull around given points.
 * @returns path as a string which can be used for the `@d` element
 * of SVG objects.
 */
export function roundedHull(points: Point[], hullPadding: Svg) {
  const pairs: Pair[] = points.map(({ x, y }) => [x, y])
  const [first, second] = pairs

  if (!first) return ''
  if (!second) return roundedHull1(first, hullPadding)
  if (pairs.length === 2) return roundedHull2(first, second, hullPadding)

  // Points that lie on one line enclose no area, so d3 finds no polygon
  // in them and the hull is the capsule around the two furthest apart.
  const polygon = polygonHull(pairs)
  if (polygon) return roundedHullN(polygon, hullPadding)

  const [from, to] = extremes(first, pairs.slice(1))
  return roundedHull2(from, to, hullPadding)
}

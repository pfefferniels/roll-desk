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
const roundedHull1 = function (polyPoints: Pair[], hullPadding: number) {
  const p1: Pair = [polyPoints[0][0], polyPoints[0][1] - hullPadding]
  const p2: Pair = [polyPoints[0][0], polyPoints[0][1] + hullPadding]

  return `M ${at(p1)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p2)].join(',')
    + ' A '
    + [hullPadding, hullPadding, '0,0,0', at(p1)].join(',')
}

// Returns the path for a rounded hull around two points (a "capsule" shape).
const roundedHull2 = function (polyPoints: Pair[], hullPadding: number) {
  const offsetVector = vecScale(hullPadding, unitNormal(polyPoints[0], polyPoints[1]))
  const invOffsetVector = vecScale(-1, offsetVector)
  // around that note coordinates are not at the centroids

  const p0 = vecSum(polyPoints[0], offsetVector)
  const p1 = vecSum(polyPoints[1], offsetVector)
  const p2 = vecSum(polyPoints[1], invOffsetVector)
  const p3 = vecSum(polyPoints[0], invOffsetVector)

  return `M ${at(p0)} L ${at(p1)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p2)].join(',')
    + ` L ${at(p3)} A `
    + [hullPadding, hullPadding, '0,0,0', at(p0)].join(',')
}

// Returns the SVG path data string representing the polygon, expanded and rounded.
const roundedHullN = function (polyPoints: Pair[], hullPadding: number) {

  // Handle special cases
  if (!polyPoints || polyPoints.length < 1) return ''
  if (polyPoints.length === 1) return roundedHull1(polyPoints, hullPadding)
  if (polyPoints.length === 2) return roundedHull2(polyPoints, hullPadding)

  const offsets: [Pair, Pair][] = new Array<[Pair, Pair]>(polyPoints.length)

  // Calculate each offset (outwards) segment of the convex hull.
  for (let segmentIndex = 0; segmentIndex < offsets.length; ++segmentIndex) {
    const p0 = (segmentIndex === 0) ? polyPoints[polyPoints.length - 1] : polyPoints[segmentIndex - 1]
    const p1 = polyPoints[segmentIndex]

    // Compute the offset vector for the line segment, with length = hullPadding.
    const offset = vecScale(hullPadding, unitNormal(p0, p1))

    offsets[segmentIndex] = [vecSum(p0, offset), vecSum(p1, offset)]
  }

  const arcData = 'A ' + [hullPadding, hullPadding, '0,0,0,'].join(',')

  const segments = offsets.map(function (segment, index) {
    let pathFragment = ''
    if (index === 0) {
      pathFragment = 'M ' + at(offsets[offsets.length - 1][1]) + ' '
    }
    pathFragment += arcData + at(segment[0]) + ' L ' + at(segment[1])

    return pathFragment
  })

  return segments.join(' ')
}

/**
 * The two ends of a set of points that lie on one line. Ordering them by
 * x and then by y puts the ends first and last, whichever way the line runs.
 */
const extremes = (pairs: Pair[]): Pair[] => {
  const sorted = [...pairs].sort(([ax, ay], [bx, by]) => ax - bx || ay - by)
  return [sorted[0], sorted[sorted.length - 1]]
}

/*
 * Calculates rounded hull around given points.
 * @returns path as a string which can be used for the `@d` element
 * of SVG objects.
 */
export function roundedHull(points: Point[], hullPadding: Svg) {
  const pairs: Pair[] = points.map(({ x, y }) => [x, y])

  if (pairs.length === 1) {
    return roundedHull1(pairs, hullPadding)
  }
  if (pairs.length === 2) {
    return roundedHull2(pairs, hullPadding)
  }

  // Points that lie on one line enclose no area, so d3 finds no polygon
  // in them and the hull is the capsule around the two furthest apart.
  const polygon = polygonHull(pairs)
  return polygon
    ? roundedHullN(polygon, hullPadding)
    : roundedHull2(extremes(pairs), hullPadding)
}

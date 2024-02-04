// The following code was taken from the MuseReduce
// project (https://github.com/DCMLab/reductive_analysis_app/blob/master/src/js/utils.js),
// ported to Typescript and slightly adapted.

import { polygonHull } from 'd3-polygon'

type Point = [number, number]

// Vector operations, taken from
// http://bl.ocks.org/hollasch/f70f1fe7700f092b5a505e3efd1d9232
const vecScale = function (scale: number, v: number[]) {
  // Returns the vector 'v' scaled by 'scale'.
  return [scale * v[0], scale * v[1]]
}

// Returns the sum of two vectors, or a combination of a point and a
// vector.
const vecSum = function (pv1: number[], pv2: number[]) {
  return [pv1[0] + pv2[0], pv1[1] + pv2[1]]
}

// Returns the unit normal to the line segment from p0 to p1.
const unitNormal = function (p0: Point, p1: Point) {
  var n = [p0[1] - p1[1], p1[0] - p0[0]]
  var nLength = Math.sqrt(n[0] * n[0] + n[1] * n[1])
  return [n[0] / nLength, n[1] / nLength]
}

// Returns the path for a rounded hull around a single point (a circle).
var roundedHull1 = function (polyPoints: Point[], hullPadding: number) {
  const p1 = [polyPoints[0][0], polyPoints[0][1] - hullPadding]
  const p2 = [polyPoints[0][0], polyPoints[0][1] + hullPadding]

  return `M ${p1} A `
    + [hullPadding, hullPadding, '0,0,0', p2].join(',')
    + ' A '
    + [hullPadding, hullPadding, '0,0,0', p1].join(',')
}

// Returns the path for a rounded hull around two points (a "capsule" shape).
var roundedHull2 = function (polyPoints: Point[], hullPadding: number) {
  var offsetVector = vecScale(hullPadding, unitNormal(polyPoints[0], polyPoints[1]))
  var invOffsetVector = vecScale(-1, offsetVector)
  // around that note coordinates are not at the centroids

  var p0 = vecSum(polyPoints[0], offsetVector)
  var p1 = vecSum(polyPoints[1], offsetVector)
  var p2 = vecSum(polyPoints[1], invOffsetVector)
  var p3 = vecSum(polyPoints[0], invOffsetVector)

  return `M ${p0} L ${p1} A `
    + [hullPadding, hullPadding, '0,0,0', p2].join(',')
    + ` L ${p3} A `
    + [hullPadding, hullPadding, '0,0,0', p0].join(',')
}

// Returns the SVG path data string representing the polygon, expanded and rounded.
var roundedHullN = function (polyPoints: Point[], hullPadding: number) {

  // Handle special cases
  if (!polyPoints || polyPoints.length < 1) return ''
  if (polyPoints.length === 1) return roundedHull1(polyPoints, hullPadding)
  if (polyPoints.length === 2) return roundedHull2(polyPoints, hullPadding)

  var segments = new Array(polyPoints.length)

  // Calculate each offset (outwards) segment of the convex hull.
  for (var segmentIndex = 0; segmentIndex < segments.length; ++segmentIndex) {
    var p0 = (segmentIndex === 0) ? polyPoints[polyPoints.length - 1] : polyPoints[segmentIndex - 1]
    var p1 = polyPoints[segmentIndex]

    // Compute the offset vector for the line segment, with length = hullPadding.
    var offset = vecScale(hullPadding, unitNormal(p0, p1))

    segments[segmentIndex] = [vecSum(p0, offset), vecSum(p1, offset)]
  }

  var arcData = 'A ' + [hullPadding, hullPadding, '0,0,0,'].join(',')

  segments = segments.map(function (segment, index) {
    var pathFragment = ''
    if (index === 0) {
      var pathFragment = 'M ' + segments[segments.length - 1][1] + ' '
    }
    pathFragment += arcData + segment[0] + ' L ' + segment[1]

    return pathFragment
  })

  return segments.join(' ')
}

/*
 * Calculates rounded hull around given points.
 * @returns path as a string which can be used for the `@d` element 
 * of SVG objects.
 */
export function roundedHull(points: Point[], hullPadding = 200) {
  if (points.length == 1) {
    return roundedHull1(points, hullPadding)
  } else if (points.length == 2) {
    return roundedHull2(points, hullPadding)
  } else {
    return roundedHullN(polygonHull(points)!, hullPadding)
  }
}

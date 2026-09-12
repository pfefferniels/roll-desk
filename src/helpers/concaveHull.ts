import { along, minus, Point } from "./drawing";

/**
 * One pass of Chaikin's corner cutting: every corner is replaced by the
 * two points a quarter and three quarters of the way along its edges, so
 * the outline rounds off a little more with each pass.
 */
const cutCorners = (points: Point[]): Point[] =>
    points.flatMap((corner, i) => {
        const edge = minus(points[(i + 1) % points.length], corner);
        return [along(corner, edge, 0.25), along(corner, edge, 0.75)];
    });

export const chaikin = (points: Point[], iterations = 2): Point[] =>
    Array.from({ length: iterations }).reduce<Point[]>(cutCorners, points);

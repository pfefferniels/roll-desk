import concaveman from "concaveman";
import { Point } from "./kmeans";

export function chaikin(points: Point[], iterations = 2) {
    let pts = points;
    for (let k = 0; k < iterations; k++) {
        const next = [];
        for (let i = 0; i < pts.length; i++) {
            const { x: x0, y: y0 } = pts[i];
            const { x: x1, y: y1 } = pts[(i + 1) % pts.length];
            next.push({ x: 0.75 * x0 + 0.25 * x1, y: 0.75 * y0 + 0.25 * y1 });
            next.push({ x: 0.25 * x0 + 0.75 * x1, y: 0.25 * y0 + 0.75 * y1 });
        }
        pts = next;
    }
    return pts;
}

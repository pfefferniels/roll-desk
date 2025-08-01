export type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * Given a set of points, return the bounding box that contains all the points.
 * @param points
 * @returns
 */
export declare const getBoundingBox: (points: [number, number][]) => BBox;

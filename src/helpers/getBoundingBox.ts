export type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Given a set of points, return the bounding box that contains all the points.
 * @param points 
 * @returns 
 */
export const getBoundingBox = (points: [number, number][]): BBox => {
    const minX = Math.min(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxX = Math.max(...points.map(p => p[0]));
    const maxY = Math.max(...points.map(p => p[1]));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

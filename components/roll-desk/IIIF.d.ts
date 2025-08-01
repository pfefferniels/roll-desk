interface IIIFTile {
    width: number;
    height: number;
    scaleFactors: number[];
}
export interface IIIFInfo {
    '@id': string;
    height: number;
    width: number;
    tiles: IIIFTile[];
}
interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Returns an array of SVG <image> elements for the visible IIIF tiles.
 *
 * This function dynamically calculates the proper resolution for each tile
 * based on the current zoom level, constructs the IIIF URL including the
 * rotation parameter, and only creates tiles for the given viewport.
 *
 * @param baseUrl - Base IIIF URL (e.g. the scan endpoint up to the identifier)
 * @param iiifInfo - IIIF info object with image dimensions and tile info.
 * @param viewport - The visible area in screen coordinates.
 * @param zoom - Zoom factor (1 = full resolution; lower values request a scaled tile).
 * @param rotation - Rotation in degrees to be applied (passed to IIIF URL).
 * @returns An array of JSX <image> elements to be rendered within an SVG.
 */
export declare function tilesAsSVGImage(baseUrl: string, iiifInfo: IIIFInfo, viewport: Viewport, zoom: number, rotation?: number): Promise<JSX.Element[]>;
export {};

import React from 'react';

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

// Global cache for tile elements keyed by their tile URL
const tileCache = new Map<string, JSX.Element>();

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
export async function tilesAsSVGImage(
    baseUrl: string,
    iiifInfo: IIIFInfo,
    viewport: Viewport,
    zoom: number,
    rotation: number = 0
): Promise<JSX.Element[]> {
    // Determine the tile size from IIIF info (assume uniform square tiles)
    const tileSize = iiifInfo.tiles[0].width;

    // Calculate the visible region in the original image coordinates.
    // If the viewport is in screen pixels, adjust for the zoom factor.
    const originalViewportWidth = viewport.width / zoom;
    const originalViewportHeight = viewport.height / zoom;
    const x0 = Math.max(0, viewport.x);
    const y0 = Math.max(0, viewport.y);
    const x1 = Math.min(iiifInfo.width, viewport.x + originalViewportWidth);
    const y1 = Math.min(iiifInfo.height, viewport.y + originalViewportHeight);

    // Determine the range of tile indices that cover the visible region.
    const startTileX = Math.floor(x0 / tileSize);
    const endTileX = Math.floor((x1 - 1) / tileSize);
    const startTileY = Math.floor(y0 / tileSize);
    const endTileY = Math.floor((y1 - 1) / tileSize);

    const tiles: JSX.Element[] = [];

    for (let ty = startTileY; ty <= endTileY; ty++) {
        for (let tx = startTileX; tx <= endTileX; tx++) {
            const regionX = tx * tileSize;
            const regionY = ty * tileSize;
            const regionW = Math.min(tileSize, iiifInfo.width - regionX);
            const regionH = Math.min(tileSize, iiifInfo.height - regionY);

            // Build the IIIF region parameter: "x,y,width,height"
            const regionParam = `${regionX},${regionY},${regionW},${regionH}`;

            // Calculate the output width (and height) for this tile based on the zoom.
            const outputW = Math.ceil(regionW * zoom);
            const outputH = Math.ceil(regionH * zoom);
            // Use IIIF's width-only size parameter (the server will preserve aspect ratio)
            const sizeParam = `${outputW},`;

            // Construct the tile URL, including the rotation parameter.
            const tileUrl = `${baseUrl}/${regionParam}/${sizeParam}/${rotation}/default.jpg`;

            // Check the cache to reuse an already created tile element.
            let imageElement = tileCache.get(tileUrl);
            if (!imageElement) {
                // Create an SVG <image> element.
                imageElement = (
                    <image
                        key={`tile_${ty}_${tx}`
                        }
                        xlinkHref={tileUrl}
                        x={regionX * zoom}
                        y={regionY * zoom}
                        width={outputW}
                        height={outputH}
                    // Optionally, if you want to also apply a client-side rotation:
                    // transform={`rotate(${rotation}, ${regionX * zoom + outputW/2}, ${regionY * zoom + outputH/2})`}
                    />
                );
                tileCache.set(tileUrl, imageElement);
            }
            tiles.push(imageElement);
        }
    }

    // (Optional) Preload adjacent tiles outside the viewport for smoother panning.
    // You can add a similar loop here without appending to the DOM.

    return tiles;
}

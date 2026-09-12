import { add, Pixels, Quantity, scale, subtract } from 'linked-rolls'
import type { Tile } from '../components/roll-desk/IIIF'
import type { Band, Box } from './rollGeometry'
import { reachOf, Svg, SvgPerScanPixel, svgPerScanPixel, svgPerTilePixel } from './units'

/**
 * Where a scan lies on the drawing. The scan is stored on its side: its
 * rows run along the roll and its columns across it, counted from the
 * bass edge, which is drawn at the bottom.
 *
 *     x = x0 + perRow * row
 *     y = y0 - perColumn * column
 */
export interface ScanPlacement {
    /** Drawing x of scan row 0. */
    x0: Svg

    perRow: SvgPerScanPixel

    /** Drawing y of scan column 0. */
    y0: Svg

    /** Counted upwards from `y0`. */
    perColumn: SvgPerScanPixel
}

/** An extent of the scan. */
export interface ScanExtent {
    rows: Pixels
    columns: Pixels
}

/** A run of scan columns, as the calibration reads it off the tracker bar. */
export interface ScanColumns {
    from: Pixels
    to: Pixels
}

/** Where a tile of the scan is drawn. */
export interface TilePlacement {
    transform: string
    box: Box
}

type ScanTile = Pick<Tile, 'x' | 'y' | 'tileWidth' | 'tileHeight'>

const between = <U extends string>(
    from: Quantity<U>,
    to: Quantity<NoInfer<U>>,
    progress: number
): Quantity<U> => add(from, scale(subtract(to, from), progress))

/**
 * The scan whole and undistorted: across the roll it is drawn at the
 * same scale as along it, and it sits centred on the drawing.
 */
export const wholeScan = (
    { x0, perRow }: Pick<ScanPlacement, 'x0' | 'perRow'>,
    scan: ScanExtent,
    drawingHeight: Svg
): ScanPlacement => ({
    x0,
    perRow,
    perColumn: perRow,
    y0: scale(add(drawingHeight, reachOf(perRow, scan.columns)), 0.5)
})

/**
 * One block of the tracker bar spread over the band its lanes occupy,
 * which stretches the block by however much its lanes are worth.
 */
export const scanInBand = (
    { x0, perRow }: Pick<ScanPlacement, 'x0' | 'perRow'>,
    columns: ScanColumns,
    band: Band
): ScanPlacement => {
    const perColumn = svgPerScanPixel(band.height / subtract(columns.to, columns.from))

    return { x0, perRow, perColumn, y0: add(band.y, reachOf(perColumn, columns.to)) }
}

/** The placement `progress` of the way from one to the other. */
export const betweenPlacements = (
    from: ScanPlacement,
    to: ScanPlacement,
    progress: number
): ScanPlacement => ({
    x0: between(from.x0, to.x0, progress),
    perRow: between(from.perRow, to.perRow, progress),
    y0: between(from.y0, to.y0, progress),
    perColumn: between(from.perColumn, to.perColumn, progress)
})

/** The box `progress` of the way from one to the other. */
export const betweenBoxes = (from: Box, to: Box, progress: number): Box => ({
    x: between(from.x, to.x, progress),
    y: between(from.y, to.y, progress),
    width: between(from.width, to.width, progress),
    height: between(from.height, to.height, progress)
})

/** The whole of a scan, as a placement draws it. */
export const scanBox = (placement: ScanPlacement, scan: ScanExtent): Box => {
    const height = reachOf(placement.perColumn, scan.columns)

    return {
        x: placement.x0,
        y: subtract(placement.y0, height),
        width: reachOf(placement.perRow, scan.rows),
        height
    }
}

/**
 * Where a tile goes: turned on its side, so that its rows run to the
 * right and its columns upwards. `scaleFactor` is how many scan pixels
 * one pixel of the fetched tile stands for, so the rates it gives are
 * per pixel of the tile rather than of the scan.
 */
export const tilePlacement = (
    placement: ScanPlacement,
    tile: ScanTile,
    scaleFactor: number
): TilePlacement => {
    const perRow = svgPerTilePixel(placement.perRow * scaleFactor)
    const perColumn = svgPerTilePixel(placement.perColumn * scaleFactor)
    const left = add(placement.x0, reachOf(placement.perRow, tile.y))
    const bottom = subtract(placement.y0, reachOf(placement.perColumn, tile.x))
    const width = reachOf(perRow, tile.tileHeight)
    const height = reachOf(perColumn, tile.tileWidth)

    return {
        transform: `matrix(0 ${-perColumn} ${perRow} 0 ${left} ${bottom})`,
        box: { x: left, y: subtract(bottom, height), width, height }
    }
}

import type { Tile } from '../components/roll-desk/IIIF'
import type { Box } from './rollGeometry'

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
    x0: number

    /** Drawing units per scan row. */
    perRow: number

    /** Drawing y of scan column 0. */
    y0: number

    /** Drawing units per scan column, counted upwards from `y0`. */
    perColumn: number
}

/** An extent of the scan, in pixels. */
export interface ScanExtent {
    rows: number
    columns: number
}

/** A run of scan columns, as the calibration reads it off the tracker bar. */
export interface ScanColumns {
    from: number
    to: number
}

/** Where a tile of the scan is drawn. */
export interface TilePlacement {
    transform: string
    box: Box
}

type ScanTile = Pick<Tile, 'x' | 'y' | 'tileWidth' | 'tileHeight'>

const between = (from: number, to: number, progress: number) =>
    from + (to - from) * progress

/**
 * The scan whole and undistorted: across the roll it is drawn at the
 * same scale as along it, and it sits centred on the drawing.
 */
export const wholeScan = (
    { x0, perRow }: Pick<ScanPlacement, 'x0' | 'perRow'>,
    scan: ScanExtent,
    drawingHeight: number
): ScanPlacement => ({
    x0,
    perRow,
    perColumn: perRow,
    y0: (drawingHeight + perRow * scan.columns) / 2
})

/**
 * One block of the tracker bar spread over the band its lanes occupy,
 * which stretches the block by however much its lanes are worth.
 */
export const scanInBand = (
    { x0, perRow }: Pick<ScanPlacement, 'x0' | 'perRow'>,
    columns: ScanColumns,
    band: Pick<Box, 'y' | 'height'>
): ScanPlacement => {
    const perColumn = band.height / (columns.to - columns.from)

    return { x0, perRow, perColumn, y0: band.y + perColumn * columns.to }
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
    const height = placement.perColumn * scan.columns

    return {
        x: placement.x0,
        y: placement.y0 - height,
        width: placement.perRow * scan.rows,
        height
    }
}

/**
 * Where a tile goes: turned on its side, so that its rows run to the
 * right and its columns upwards. `scaleFactor` is how many scan pixels
 * one pixel of the fetched tile stands for.
 */
export const tilePlacement = (
    placement: ScanPlacement,
    tile: ScanTile,
    scaleFactor: number
): TilePlacement => {
    const perRow = placement.perRow * scaleFactor
    const perColumn = placement.perColumn * scaleFactor
    const left = placement.x0 + placement.perRow * tile.y
    const bottom = placement.y0 - placement.perColumn * tile.x
    const width = perRow * tile.tileHeight
    const height = perColumn * tile.tileWidth

    return {
        transform: `matrix(0 ${-perColumn} ${perRow} 0 ${left} ${bottom})`,
        box: { x: left, y: bottom - height, width, height }
    }
}

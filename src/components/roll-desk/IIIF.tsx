import { min, Pixels, px, scale, subtract } from 'linked-rolls'
import type { ScanColumns } from '../../helpers/scanPlacement'
import { SvgPerScanPixel, TilePixels, tilePixels } from '../../helpers/units'

/**
 * Tiles of a scan behind an IIIF image service, asked for in the only
 * way the Image API's level 0 allows: regions aligned to the tile grid
 * at one of the declared scale factors, unrotated, at the width the
 * region has once divided by the factor. A server that can do more,
 * such as Stanford's, answers the same requests; a directory of tiles
 * cut in advance (see scripts/facsimile_tiles.py) answers nothing else.
 */
export interface ImageService {
    baseUrl: string
    width: Pixels
    height: Pixels
    tileWidth: Pixels
    scaleFactors: number[]
}

export interface Tile {
    /** The region of the scan the tile shows, in pixels of the scan. */
    x: Pixels
    y: Pixels
    width: Pixels
    height: Pixels

    /** The size of the tile itself, which is coarser by the scale factor. */
    tileWidth: TilePixels
    tileHeight: TilePixels

    url: string
}

/** A count of pixels as an `info.json` states it, or nothing where it states no such thing. */
const pixelCount = (value: unknown): Pixels | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? px(value) : undefined

/** The scale factors a tiling offers, dropping any the document spells unusably. */
const scaleFactorsIn = (value: unknown): number[] | undefined => {
    if (!Array.isArray(value)) return undefined
    const usable = value.filter(factor => typeof factor === 'number' && Number.isFinite(factor) && factor > 0)
    return usable.length ? usable : undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

/**
 * What the service says about itself. The document is read rather than
 * believed: a width the server spells as text, or leaves out, would
 * otherwise reach the drawing arithmetic and quietly turn it to NaN.
 */
export const fetchImageService = async (scan: string): Promise<ImageService> => {
    const baseUrl = scan.replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/info.json`)
    if (!response.ok) {
        throw new Error(`${baseUrl}/info.json answered ${response.status}`)
    }

    const info: unknown = await response.json()
    if (!isRecord(info)) {
        throw new Error(`${baseUrl}/info.json is not an image service description`)
    }

    const width = pixelCount(info.width)
    const height = pixelCount(info.height)
    if (!width || !height) {
        throw new Error(`${baseUrl}/info.json states no usable width and height`)
    }

    const tiling = Array.isArray(info.tiles) && isRecord(info.tiles[0]) ? info.tiles[0] : undefined

    return {
        baseUrl,
        width,
        height,
        tileWidth: pixelCount(tiling?.width) ?? px(1024),
        scaleFactors: scaleFactorsIn(tiling?.scaleFactors) ?? [1]
    }
}

/**
 * The coarsest scale factor that still gives at least one scan pixel
 * per screen pixel, or the finest one on offer when none does.
 */
export const scaleFactorFor = (service: ImageService, drawnPerScanPixel: SvgPerScanPixel) => {
    const coarseEnough = service.scaleFactors.filter(factor => factor <= 1 / drawnPerScanPixel)
    return coarseEnough.length
        ? Math.max(...coarseEnough)
        : Math.min(...service.scaleFactors)
}

const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

/**
 * The tiles at one scale factor that cover a span of scan columns
 * along the whole length of the scan.
 */
export const tilesOf = (
    service: ImageService,
    scaleFactor: number,
    columns: ScanColumns
): Tile[] => {
    const span = scale(service.tileWidth, scaleFactor)
    const firstColumn = Math.max(0, Math.floor(columns.from / span))
    const lastColumn = Math.min(Math.ceil(service.width / span) - 1, Math.floor((columns.to - 1) / span))
    const rows = range(0, Math.ceil(service.height / span) - 1)

    return rows.flatMap(row => range(firstColumn, lastColumn).map((column): Tile => {
        const x = scale(span, column)
        const y = scale(span, row)
        const width = min(span, subtract(service.width, x))
        const height = min(span, subtract(service.height, y))
        const tileWidth = tilePixels(Math.ceil(width / scaleFactor))
        const tileHeight = tilePixels(Math.ceil(height / scaleFactor))

        return {
            x, y, width, height, tileWidth, tileHeight,
            url: `${service.baseUrl}/${x},${y},${width},${height}/${tileWidth},/0/default.jpg`
        }
    }))
}

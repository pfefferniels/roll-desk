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
    width: number
    height: number
    tileWidth: number
    scaleFactors: number[]
}

export interface Tile {
    /** The region of the scan the tile shows, in pixels of the scan. */
    x: number
    y: number
    width: number
    height: number

    /** The size of the tile itself. */
    tileWidth: number
    tileHeight: number

    url: string
}

export const fetchImageService = async (scan: string): Promise<ImageService> => {
    const baseUrl = scan.replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/info.json`)
    if (!response.ok) {
        throw new Error(`${baseUrl}/info.json answered ${response.status}`)
    }

    const info = await response.json()
    const tiling = info.tiles?.[0]

    return {
        baseUrl,
        width: info.width,
        height: info.height,
        tileWidth: tiling?.width ?? 1024,
        scaleFactors: tiling?.scaleFactors ?? [1]
    }
}

/**
 * The coarsest scale factor that still gives at least one scan pixel
 * per screen pixel, or the finest one on offer when none does.
 */
export const scaleFactorFor = (service: ImageService, screenPixelsPerScanPixel: number) => {
    const coarseEnough = service.scaleFactors.filter(factor => factor <= 1 / screenPixelsPerScanPixel)
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
    columns: { from: number, to: number }
): Tile[] => {
    const span = service.tileWidth * scaleFactor
    const firstColumn = Math.max(0, Math.floor(columns.from / span))
    const lastColumn = Math.min(Math.ceil(service.width / span) - 1, Math.floor((columns.to - 1) / span))
    const rows = range(0, Math.ceil(service.height / span) - 1)

    return rows.flatMap(row => range(firstColumn, lastColumn).map((column): Tile => {
        const x = column * span
        const y = row * span
        const width = Math.min(span, service.width - x)
        const height = Math.min(span, service.height - y)
        const tileWidth = Math.ceil(width / scaleFactor)
        const tileHeight = Math.ceil(height / scaleFactor)

        return {
            x, y, width, height, tileWidth, tileHeight,
            url: `${service.baseUrl}/${x},${y},${width},${height}/${tileWidth},/0/default.jpg`
        }
    }))
}

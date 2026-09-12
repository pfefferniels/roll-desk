import { describe, expect, it } from 'vitest'
import { px } from 'linked-rolls'
import { ImageService, scaleFactorFor, tilesOf } from './IIIF'
import { svgPerScanPixel } from '../../helpers/units'

const service: ImageService = {
    baseUrl: 'https://example.org/iiif/scan',
    width: px(4096),
    height: px(5000),
    tileWidth: px(1024),
    scaleFactors: [2, 4, 8]
}

describe('naming the tiles of an image service', () => {
    it('picks the coarsest scale that keeps a scan pixel per screen pixel', () => {
        expect(scaleFactorFor(service, svgPerScanPixel(1 / 8))).toEqual(8)
        expect(scaleFactorFor(service, svgPerScanPixel(1 / 5))).toEqual(4)
        expect(scaleFactorFor(service, svgPerScanPixel(1))).toEqual(2)
        expect(scaleFactorFor(service, svgPerScanPixel(1 / 100))).toEqual(8)
    })

    it('aligns the regions to the tile grid at the scale', () => {
        const tiles = tilesOf(service, 4, { from: px(0), to: px(4096) })
        expect(tiles.map(tile => [tile.x, tile.y])).toEqual([[0, 0], [0, 4096]])
        expect(tiles[0]).toMatchObject({ width: 4096, height: 4096, tileWidth: 1024, tileHeight: 1024 })
    })

    it('rounds a ragged edge up to a whole pixel', () => {
        const [, last] = tilesOf(service, 4, { from: px(0), to: px(4096) })
        expect(last).toMatchObject({ height: 904, tileHeight: 226 })
        expect(last.url).toEqual('https://example.org/iiif/scan/0,4096,4096,904/1024,/0/default.jpg')
    })

    it('fetches only the tile columns a span of scan columns touches', () => {
        const columns = tilesOf(service, 2, { from: px(2100), to: px(2500) }).map(tile => tile.x)
        expect(new Set(columns)).toEqual(new Set([2048]))
    })

    it('names no tile for a span outside the scan', () => {
        expect(tilesOf(service, 2, { from: px(5000), to: px(6000) })).toEqual([])
    })
})

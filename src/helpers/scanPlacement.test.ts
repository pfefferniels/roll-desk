import { describe, expect, it } from 'vitest'
import { add, Pixels, px, scale, subtract } from 'linked-rolls'
import { reachOf, svg, svgPerScanPixel, tilePixels } from './units'
import {
    betweenBoxes,
    betweenPlacements,
    scanBox,
    scanInBand,
    ScanPlacement,
    tilePlacement,
    wholeScan
} from './scanPlacement'

const alongRoll = { x0: svg(0), perRow: svgPerScanPixel(0.125) }
const scan = { rows: px(8000), columns: px(3200) }
const drawingHeight = svg(600)

const columns = { from: px(800), to: px(2400) }
const band = { y: svg(120), height: svg(400) }

const whole = wholeScan(alongRoll, scan, drawingHeight)
const laidOut = scanInBand(alongRoll, columns, band)

/** Where a scan column is drawn across the roll. */
const columnY = (placement: ScanPlacement, column: Pixels) =>
    subtract(placement.y0, reachOf(placement.perColumn, column))

describe('placing a scan on the drawing', () => {
    it('draws the whole scan undistorted', () => {
        expect(whole.perColumn).toEqual(whole.perRow)
        expect(scanBox(whole, scan)).toEqual({ x: 0, y: 100, width: 1000, height: 400 })
    })

    it('centres the whole scan on the drawing', () => {
        const box = scanBox(whole, scan)
        expect(add(box.y, scale(box.height, 0.5))).toEqual(drawingHeight / 2)
    })

    it('spreads a block of the bar over the band of its lanes', () => {
        expect(columnY(laidOut, columns.from)).toEqual(add(band.y, band.height))
        expect(columnY(laidOut, columns.to)).toEqual(band.y)
    })

    it('leaves the roll running the same way it did', () => {
        expect(laidOut.x0).toEqual(whole.x0)
        expect(laidOut.perRow).toEqual(whole.perRow)
    })
})

describe('moving between two placements', () => {
    it('rests at either end', () => {
        expect(betweenPlacements(whole, laidOut, 0)).toEqual(whole)
        expect(betweenPlacements(whole, laidOut, 1)).toEqual(laidOut)
    })

    it('takes the halfway placement halfway', () => {
        expect(betweenPlacements(whole, laidOut, 0.5)).toEqual({
            x0: 0,
            perRow: 0.125,
            y0: (whole.y0 + laidOut.y0) / 2,
            perColumn: (whole.perColumn + laidOut.perColumn) / 2
        })
    })

    it('takes a clip region halfway too', () => {
        const bandBox = { x: svg(0), width: svg(900), ...band }
        expect(betweenBoxes(scanBox(whole, scan), bandBox, 0.5))
            .toEqual({ x: 0, y: 110, width: 950, height: 400 })
    })
})

describe('placing a tile of a scan', () => {
    const tile = { x: px(1024), y: px(2048), tileWidth: tilePixels(512), tileHeight: tilePixels(512) }
    const scaleFactor = 2

    it('turns the tile on its side, rows to the right and columns upwards', () => {
        expect(tilePlacement(whole, tile, scaleFactor).transform)
            .toEqual('matrix(0 -0.25 0.25 0 256 372)')
    })

    it('covers the region the tile shows', () => {
        const { box } = tilePlacement(whole, tile, scaleFactor)

        expect(box.x).toEqual(add(whole.x0, reachOf(whole.perRow, tile.y)))
        expect(add(box.y, box.height)).toEqual(columnY(whole, tile.x))
        expect(box.width).toEqual(whole.perRow * scaleFactor * tile.tileHeight)
        expect(box.height).toEqual(whole.perColumn * scaleFactor * tile.tileWidth)
    })

    it('lays the lowest tile of a block on the bottom of its band', () => {
        const { box } = tilePlacement(laidOut, { ...tile, x: columns.from }, scaleFactor)
        expect(add(box.y, box.height)).toEqual(add(band.y, band.height))
    })
})

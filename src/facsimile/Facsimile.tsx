import { columnsOf, Millimeters, Pixels, px, RollCopy, subtract, toAxis, TrackArea } from "linked-rolls"
import { useEffect, useRef, useState } from "react"
import { Svg, svg, svgPerScanPixel } from "../canvas/units"
import useIsVisible from "./useIsVisible"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { FacsimileBlend } from "./facsimileBlend"
import { drawableCalibrationOf } from "./scanCalibration"
import { onPaper } from "./scanResolution"
import {
    betweenBoxes,
    betweenPlacements,
    scanBox,
    scanInBand,
    ScanColumns,
    tilePlacement,
    TilePlacement,
    wholeScan
} from "./scanPlacement"
import { fetchImageService, ImageService, scaleFactorFor, Tile, tilesOf } from "./IIIF"

/** Screen x of a scan row, through whatever alignment the copy was given. */
const rowToXOf = (copy: RollCopy, translateX: (x: Millimeters) => Svg) => {
    const onAxis = toAxis(copy.measurements.alignment)
    return (row: Pixels) => translateX(onAxis(onPaper(row, copy)))
}

/**
 * Fetched once it has scrolled into view, and kept from then on, so
 * that panning back does not have to wait for it again.
 */
const FacsimileTile = ({ tile, placement }: { tile: Tile, placement: TilePlacement }) => {
    const ref = useRef<SVGRectElement>(null)
    const visible = useIsVisible(ref)
    const [wanted, setWanted] = useState(false)
    if (visible && !wanted) setWanted(true)

    return (
        <>
            <rect ref={ref} {...placement.box} fill='none' pointerEvents='none' />
            {wanted && (
                <image
                    href={tile.url}
                    width={tile.tileWidth}
                    height={tile.tileHeight}
                    transform={placement.transform}
                    preserveAspectRatio='none'
                />
            )}
        </>
    )
}

const useImageService = (scan: string | undefined, wanted: boolean) => {
    const [service, setService] = useState<ImageService>()

    useEffect(() => {
        if (!scan || !wanted) return

        let stale = false
        fetchImageService(scan)
            .then(found => { if (!stale) setService(found) })
            .catch(error => console.warn(`no image service behind ${scan}:`, error))
        return () => { stale = true }
    }, [scan, wanted])

    return service
}

interface FacsimileProps {
    copy: RollCopy
    blend: FacsimileBlend
}

/**
 * The scan of a copy, laid under its features: one strip per block of
 * the tracker bar, so that the gaps the drawing leaves between the
 * blocks are not filled with paper that is not there.
 *
 * The strips only part once the blend asks for it. Until then they lie
 * on top of one another, each drawing its share of the whole scan.
 */
export const Facsimile = ({ copy, blend }: FacsimileProps) => {
    const geometry = usePinchZoom()
    const service = useImageService(copy.scan, blend.facsimile > 0)
    const calibration = drawableCalibrationOf(copy)

    if (!service || !calibration || blend.facsimile === 0) return null

    const rowToX = rowToXOf(copy, geometry.translateX)
    const alongRoll = {
        x0: rowToX(px(0)),
        perRow: svgPerScanPixel(subtract(rowToX(px(1)), rowToX(px(0))))
    }
    const scaleFactor = scaleFactorFor(service, alongRoll.perRow)
    const rollWidth = geometry.translateX(geometry.rollLength)

    const scan = { rows: service.height, columns: service.width }
    const whole = wholeScan(alongRoll, scan, geometry.height)
    const wholeBox = scanBox(whole, scan)

    /** The paper outside the bar belongs to the strips at either edge. */
    const sourceColumnsOf = (columns: ScanColumns, index: number): ScanColumns => ({
        from: index === 0 ? px(0) : columns.from,
        to: index === geometry.areas.length - 1 ? scan.columns : columns.to
    })

    const strip = (area: TrackArea, index: number) => {
        const columns = columnsOf(area.from, area.to, calibration)
        const band = geometry.areaBand(area)
        const clipId = `facsimile-${copy.id}-${area.role}`

        const placement = betweenPlacements(
            whole,
            scanInBand(alongRoll, columns, band),
            blend.layout
        )
        const clip = betweenBoxes(wholeBox, { x: svg(0), width: rollWidth, ...band }, blend.layout)

        return (
            <g key={area.role}>
                <clipPath id={clipId}>
                    <rect {...clip} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                    {tilesOf(service, scaleFactor, sourceColumnsOf(columns, index)).map(tile => (
                        <FacsimileTile
                            key={tile.url}
                            tile={tile}
                            placement={tilePlacement(placement, tile, scaleFactor)}
                        />
                    ))}
                </g>
            </g>
        )
    }

    return (
        <g className='facsimile' opacity={blend.facsimile}>
            {geometry.areas.map(strip)}
        </g>
    )
}

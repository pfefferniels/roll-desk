import { calibrationOf, columnsOf, PaperStretch, RollCopy, TrackArea } from "linked-rolls"
import { useEffect, useRef, useState } from "react"
import useIsVisible from "../../hooks/useIsVisible"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Box } from "../../helpers/rollGeometry"
import { fetchImageService, ImageService, scaleFactorFor, Tile, tilesOf } from "./IIIF"

const dpi = 300.25

const pixelsToMM = (pixels: number) => pixels / dpi * 25.4

const stretchOf = (copy: RollCopy) =>
    copy.conditions.find((c): c is PaperStretch => c.conditionType === 'paper-stretch')?.factor ?? 1

/** Screen x of a scan row, through whatever alignment the copy was given. */
const rowToXOf = (copy: RollCopy, translateX: (mm: number) => number) => {
    const shift = copy.measurements.shift?.horizontal ?? 0
    const stretch = stretchOf(copy)
    return (row: number) => translateX((pixelsToMM(row) + shift) * stretch)
}

interface Placement {
    transform: string
    box: Box
}

/**
 * Where a tile goes. The scan's rows run along the roll and its
 * columns across it, so the tile is turned on its side: its rows are
 * scaled by the copy's alignment, its columns spread over the band
 * the tracker bar block occupies, bass at the bottom.
 */
const placementOf = (
    tile: Tile,
    scaleFactor: number,
    rowToX: (row: number) => number,
    band: Box,
    columns: { to: number, width: number }
): Placement => {
    const perRow = rowToX(1) - rowToX(0)
    const perColumn = band.height / columns.width
    const left = rowToX(tile.y)
    const bottom = band.y + perColumn * (columns.to - tile.x)
    const width = perRow * scaleFactor * tile.tileHeight
    const height = perColumn * scaleFactor * tile.tileWidth

    return {
        transform: `matrix(0 ${-perColumn * scaleFactor} ${perRow * scaleFactor} 0 ${left} ${bottom})`,
        box: { x: left, y: bottom - height, width, height }
    }
}

/**
 * Fetched once it has scrolled into view, and kept from then on, so
 * that panning back does not have to wait for it again.
 */
const FacsimileTile = ({ tile, placement }: { tile: Tile, placement: Placement }) => {
    const ref = useRef<SVGRectElement>(null)
    const visible = useIsVisible(ref)
    const [wanted, setWanted] = useState(false)

    useEffect(() => {
        if (visible) setWanted(true)
    }, [visible])

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
    opacity: number
}

/**
 * The scan of a copy, laid under its features: one strip per block of
 * the tracker bar, so that the gaps the drawing leaves between the
 * blocks are not filled with paper that is not there.
 */
export const Facsimile = ({ copy, opacity }: FacsimileProps) => {
    const geometry = usePinchZoom()
    const service = useImageService(copy.scan, opacity > 0)
    const calibration = calibrationOf(copy)

    if (!service || !calibration || opacity === 0) return null

    const rowToX = rowToXOf(copy, geometry.translateX)
    const scaleFactor = scaleFactorFor(service, rowToX(1) - rowToX(0))
    const rollWidth = geometry.translateX(geometry.rollLength)

    const strip = (area: TrackArea) => {
        const columns = columnsOf(area.from, area.to, calibration)
        const band = { x: 0, width: rollWidth, ...geometry.areaBand(area) }
        const clipId = `facsimile-${copy.id}-${area.role}`

        return (
            <g key={area.role}>
                <clipPath id={clipId}>
                    <rect {...band} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>
                    {tilesOf(service, scaleFactor, columns).map(tile => (
                        <FacsimileTile
                            key={tile.url}
                            tile={tile}
                            placement={placementOf(tile, scaleFactor, rowToX, band, columns)}
                        />
                    ))}
                </g>
            </g>
        )
    }

    return (
        <g className='facsimile' opacity={opacity}>
            {geometry.areas.map(strip)}
        </g>
    )
}

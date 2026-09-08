import { useRef, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom.tsx';
import { v4 } from 'uuid';
import { EventDimension } from './RollDesk.tsx';
import { columnsOf, mm, Millimeters, RollCopy, Track, track, welteT100, WithId } from 'linked-rolls';
import { rollPointAt } from '../../helpers/pointer.ts';
import { boxOf } from '../../helpers/rollGeometry.ts';
import { Drag, useDrag } from '../../hooks/useDrag.ts';
import { drawableCalibrationOf } from '../../helpers/scanCalibration';

interface RollGridProps {
    width: number;
    onSelectionDone: (dimension?: EventDimension & WithId) => void;
    selectionMode: boolean
}

/** A corner of a rubber band: along the roll in millimetres, across it in tracks. */
interface Corner {
    x: Millimeters
    track: Track
}

/** What a rubber band encloses, or nothing while it still sits on its corner. */
export const selectionOf = ({ from, to }: Drag<Corner>): EventDimension | undefined => {
    if (from.x === to.x && from.track === to.track) return undefined

    const [left, right] = from.x < to.x ? [from.x, to.x] : [to.x, from.x]
    const [lower, upper] = from.track < to.track ? [from.track, to.track] : [to.track, from.track]

    return {
        horizontal: { from: left, to: right, unit: 'mm' },
        vertical: { from: lower, to: upper, unit: 'track' }
    }
}

export const RollGrid = ({
    width,
    selectionMode,
    onSelectionDone,
}: RollGridProps) => {
    const geometry = usePinchZoom();
    const { zoom, yToTrack, trackToY, height } = geometry;

    const gridRef = useRef<SVGGElement>(null);
    const [selection, setSelection] = useState<EventDimension & WithId>();

    /** Where a pointer sits on the grid, and nothing where no lane does. */
    const cornerAt = (event: MouseEvent): Corner | undefined => {
        const grid = gridRef.current;
        if (!grid || !selectionMode) return undefined;

        const point = rollPointAt(grid, event, zoom);
        if (!point) return undefined;

        const position = yToTrack(point.y);
        return position === 'gap' ? undefined : { x: point.x, track: position };
    };

    const drag = useDrag(gridRef, cornerAt, finished => {
        const drawn = selectionOf(finished);
        const selected = drawn && { ...drawn, id: v4() };

        setSelection(selected);
        onSelectionDone(selected);
    });

    const band = drag ? selectionOf(drag) : selection;

    const lines = Array
        .from({ length: welteT100.trackCount }, (_, i) => track(i + 1))
        .map(position => (
            <line
                key={`gridLine_${position}`}
                x1={0}
                x2={width}
                y1={trackToY(position)}
                y2={trackToY(position)}
                stroke="black"
                strokeWidth={0.1}
            />
        ));

    return (
        <g className="roll-grid" ref={gridRef}>
            <rect
                fill="white"
                fillOpacity={0.1}
                x={0}
                y={0}
                height={height}
                width={width}
            />
            {lines}
            {band && (
                <rect
                    {...boxOf(band, geometry)}
                    fill="rgba(0, 0, 255, 0.3)"
                    stroke="blue"
                    strokeWidth={0.5}
                />
            )}
        </g>
    );
};

const mmToPixels = (mm: number, dpi: number): number => {
    const inchesPerMM = 1 / 25.4;
    return mm * dpi * inchesPerMM;
}

/**
 * Crops the scan back to a selection. The horizontal edges have to be
 * taken back through whatever was done to align this copy with the
 * others; the vertical ones come from the copy's own calibration, since
 * the scan grid sits wherever the roll happened to lie on the scanner.
 *
 * The scans are stored rotated, so the region's first pair of numbers
 * is the vertical extent of the selection.
 */
export const selectionAsIIIFLink = (selection: EventDimension, copy: RollCopy) => {
    const dpi = 300.25
    const calibration = drawableCalibrationOf(copy)
    if (!calibration) return undefined

    const scale = copy.measurements.scale ?? 1
    const asScanned = (mm: number) => {
        const unshifted = mm - (copy.measurements.shift?.horizontal || 0)
        return mmToPixels(unshifted / scale, dpi)
    }

    const x1 = asScanned(selection.horizontal.from)
    const x2 = asScanned(selection.horizontal.to)

    const columns = columnsOf(
        selection.vertical.from,
        selection.vertical.to ?? selection.vertical.from,
        calibration
    )

    const region = [columns.from, x1, columns.width, x2 - x1]
        .map(value => Math.floor(value))
        .join(',')

    return `${copy.scan}/${region}/full/0/default.jpg`
}
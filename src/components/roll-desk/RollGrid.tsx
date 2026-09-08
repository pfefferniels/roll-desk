import { useRef } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom.tsx';
import { v4 } from 'uuid';
import { EventDimension, UserSelection } from './RollDesk.tsx';
import { columnsOf, isRollFeature, mm, Millimeters, RollCopy, Track, track, welteT100, WithId } from 'linked-rolls';
import { rollPointAt } from '../../helpers/pointer.ts';
import { boxOf } from '../../helpers/rollGeometry.ts';
import { Drag, useDrag } from '../../hooks/useDrag.ts';
import { drawableCalibrationOf } from '../../helpers/scanCalibration';
import { inScan } from '../../helpers/scanResolution.ts';
import { useSelection } from '../../providers/SelectionContext.tsx';

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

/**
 * Whether a selected item is a rubber band. A band is a bare span, where
 * a feature carries its span along with everything else it is.
 */
export const isBand = (item: UserSelection): item is EventDimension =>
    !isRollFeature(item) && 'horizontal' in item && 'vertical' in item

export const RollGrid = ({
    width,
    selectionMode,
    onSelectionDone,
}: RollGridProps) => {
    const geometry = usePinchZoom();
    const { zoom, yToTrack, trackToY, height } = geometry;

    const gridRef = useRef<SVGGElement>(null);
    const { selection } = useSelection(isBand);

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
        onSelectionDone(drawn && { ...drawn, id: v4() });
    });

    // Between drags the band is whatever the selection holds, so clearing
    // the selection takes it off the grid.
    const [selected] = selection;
    const band = drag ? selectionOf(drag) : selected;

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
    const calibration = drawableCalibrationOf(copy)
    if (!calibration) return undefined

    const scale = copy.measurements.scale ?? 1
    const asScanned = (place: Millimeters) => {
        const unshifted = place - (copy.measurements.shift?.horizontal || 0)
        return inScan(mm(unshifted / scale))
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
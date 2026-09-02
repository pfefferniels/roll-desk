import React, { useCallback, useEffect, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom.tsx';
import { v4 } from 'uuid';
import { EventDimension } from './RollDesk.tsx';
import { calibrationOf, columnsOf, RollCopy, welteT100, WithId } from 'linked-rolls';

interface RollGridProps {
    width: number;
    onSelectionDone: (dimension: EventDimension & WithId) => void;
    selectionMode: boolean
}

export const RollGrid = ({
    width,
    selectionMode,
    onSelectionDone,
}: RollGridProps) => {
    const { zoom, yToTrack, bandOf, trackToY, height } = usePinchZoom();

    const [rect, setRect] = useState<EventDimension & WithId>();
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!selectionMode) return

        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const offsetX = e.clientX - rect.left
        const offsetY = e.clientY - rect.top;

        setStartPoint({ x: offsetX, y: offsetY });
        setIsDrawing(true);
    }, [selectionMode]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDrawing || !startPoint) return;

        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const offsetX = e.clientX - rect.left
        const offsetY = e.clientY - rect.top

        const from = yToTrack(startPoint.y);
        const to = yToTrack(offsetY);

        // Ignore if the selection was made in the gap
        if (from === 'gap' || to === 'gap') return;

        setRect({
            id: v4(),
            horizontal: {
                from: Math.min(startPoint.x, offsetX) / zoom,
                to: Math.max(startPoint.x, offsetX) / zoom,
                unit: 'mm'
            },
            vertical: {
                from: Math.min(from, to),
                to: Math.max(from, to),
                unit: 'track'
            }
        });
    }, [isDrawing, startPoint, zoom, yToTrack]);

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
        setStartPoint(null);

        if (rect) {
            onSelectionDone(rect);
        }
    }, [onSelectionDone, rect]);

    useEffect(() => {
        const svgElement = document.getElementById('rollGrid');

        if (svgElement) {
            svgElement.addEventListener('mousedown', handleMouseDown);
            svgElement.addEventListener('mousemove', handleMouseMove);
            svgElement.addEventListener('mouseup', handleMouseUp);

            return () => {
                svgElement.removeEventListener('mousedown', handleMouseDown);
                svgElement.removeEventListener('mousemove', handleMouseMove);
                svgElement.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [handleMouseDown, handleMouseMove, handleMouseUp]);

    const lines = Array
        .from({ length: welteT100.trackCount }, (_, i) => i + 1)
        .map(track => (
            <line
                key={`gridLine_${track}`}
                x1={0}
                x2={width}
                y1={trackToY(track)}
                y2={trackToY(track)}
                stroke="black"
                strokeWidth={0.1}
            />
        ));

    return (
        <g id="rollGrid">
            <rect
                fill="white"
                fillOpacity={0.1}
                x={0}
                y={0}
                height={height}
                width={width}
            />
            {lines}
            {rect && (
                <rect
                    x={rect.horizontal.from * zoom}
                    width={(rect.horizontal.to - rect.horizontal.from) * zoom}
                    {...bandOf(rect.vertical)}
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
    const calibration = calibrationOf(copy)
    if (!calibration) return undefined

    const stretch = copy.conditions.find(condition => condition.type === 'paper-stretch')
    const asScanned = (mm: number) => {
        const unshifted = mm - (copy.measurements.shift?.horizontal || 0)
        return mmToPixels(stretch ? unshifted / stretch.factor : unshifted, dpi)
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
import React, { useCallback, useEffect, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom.tsx';
import { v4 } from 'uuid';
import { WithId } from 'linked-rolls/lib/WithId';
import { EventDimension } from './RollDesk.tsx';

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
    const { zoom, yToTrack, trackToY, height } = usePinchZoom();

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
                from: startPoint.x / zoom,
                to: offsetX / zoom,
                unit: 'mm'
            },
            vertical: {
                from,
                to,
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

    const lines = [];
    for (let i = 0; i < 100; i++) {
        const y = trackToY(i);
        lines.push(
            <line
                key={`gridLine_${i}`}
                x1={0}
                x2={width}
                y1={y}
                y2={y}
                stroke="black"
                strokeWidth={0.05}
            />
        );
    }

    return (
        <g id="rollGrid">
            <rect
                fill="white"
                fillOpacity={0}
                x={0}
                y={0}
                height={height}
                width={width}
            ></rect>
            {lines}
            {rect && (
                <rect
                    x={rect.horizontal.from * zoom}
                    y={trackToY(rect.vertical.from)}
                    width={(rect.horizontal.to - rect.horizontal.from) * zoom}
                    height={trackToY(rect.vertical.to!) - trackToY(rect.vertical.from)}
                    fill="rgba(0, 0, 255, 0.3)"
                    stroke="blue"
                    strokeWidth={0.5}
                />
            )}
        </g>
    );
};

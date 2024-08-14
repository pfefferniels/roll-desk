import React, { useCallback, useEffect, useState } from 'react';
import { usePinchZoom } from '../../hooks/usePinchZoom.tsx';
import { EventDimension } from 'linked-rolls/lib/types';
import { v4 } from 'uuid';

interface RollGridProps {
    width: number;
    onSelectionDone: (dimension: EventDimension) => void;
    selectionMode: boolean
}

export const RollGrid = ({
    width,
    selectionMode,
    onSelectionDone
}: RollGridProps) => {
    const { trackHeight, zoom } = usePinchZoom();

    const [rect, setRect] = useState<EventDimension>();
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!selectionMode) return

        const { offsetX, offsetY } = e;
        setStartPoint({ x: offsetX, y: offsetY });
        setIsDrawing(true);
    }, [selectionMode]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDrawing || !startPoint) return;

        const { offsetX, offsetY } = e;
        setRect({
            id: v4(),
            horizontal: {
                from: startPoint.x / zoom,
                to: offsetX / zoom,
                hasUnit: 'mm'
            },
            vertical: {
                from: 100 - Math.round(startPoint.y / trackHeight),
                to: 100 - Math.round((offsetY) / trackHeight),
                hasUnit: 'track'
            }
        });
    }, [isDrawing, startPoint, trackHeight, zoom]);

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
        const y = i * trackHeight + trackHeight / 2;
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
                height={100 * trackHeight}
                width={width}
            ></rect>
            {lines}
            {rect && (
                <rect
                    x={rect.horizontal.from * zoom}
                    y={(100 - rect.vertical.from) * trackHeight}
                    width={(rect.horizontal.to! - rect.horizontal.from) * zoom}
                    height={((100 - rect.vertical.to!) - (100 - rect.vertical.from)) * trackHeight}
                    fill="rgba(0, 0, 255, 0.3)"
                    stroke="blue"
                    strokeWidth={0.5}
                />
            )}
        </g>
    );
};

import { useState, useRef, useCallback, useEffect } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { useSelection } from "../../providers/SelectionContext";
import { Cursor } from "./Cursor";

export const Ground = ({
    x, y, width, height,
}: { x: number; y: number; width: number; height: number; }) => {
    const { zoom, translateX, trackToY } = usePinchZoom();
    const { setRange } = useSelection();

    const [left, setLeft] = useState<number | null>(null);
    const [right, setRight] = useState<number | null>(null);

    const svgRef = useRef<SVGRectElement>(null);
    const draggingRef = useRef(false);

    const getLocalX = useCallback((e: MouseEvent | WheelEvent) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return (e.clientX - rect.left) / zoom;
    }, [zoom]);

    const onMouseDown = useCallback((e: MouseEvent) => {
        const local = getLocalX(e);
        if (local == null) return;
        draggingRef.current = true;
        setLeft(local);
        setRight(local);
    }, [getLocalX]);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingRef.current) return;
        const local = getLocalX(e);
        if (local == null) return;
        setRight(local);
    }, [getLocalX]);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;

        const upX = getLocalX(e);
        if (left == null || upX == null) {
            setLeft(null);
            setRight(null);
            return;
        }

        const a = Math.min(left, upX);
        const b = Math.max(left, upX);

        setRange([a, b]);
    }, [getLocalX, left, setRange]);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        svg.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            svg.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseDown, onMouseMove, onMouseUp]);

    return (
        <>
            {(left != null && right != null) && (
                <g className="range">
                    <rect
                        x={translateX(left)}
                        y={0}
                        width={translateX(right) - translateX(left)}
                        height={trackToY(0) - trackToY(100)}
                        stroke="orange"
                        fillOpacity={0.3}
                        fill='orange'
                    />
                    <line x1={translateX(left)} y1={0} x2={translateX(left)} y2={10} strokeWidth={1} stroke="black" />
                    <line x1={translateX(right)} y1={0} x2={translateX(right)} y2={10} strokeWidth={1} stroke="black" />
                </g>
            )}

            <rect
                ref={svgRef}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="transparent"
            />

            <Cursor svgRef={svgRef} />
        </>
    );
};

import { useRef } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { useSelection } from "../../providers/SelectionContext";
import { spanOf, useRollDrag } from "../../hooks/useRollDrag";
import { Cursor } from "./Cursor";

/** The stretch of roll playback is held to, in millimetres. */
const RangeMarker = ({ span }: { span: [number, number] }) => {
    const { translateX, height } = usePinchZoom();

    const [from, to] = span.map(translateX);

    return (
        <g className="range">
            <rect
                x={from}
                y={0}
                width={to - from}
                height={height}
                stroke="orange"
                fillOpacity={0.3}
                fill='orange'
            />
            <line x1={from} y1={0} x2={from} y2={10} strokeWidth={1} stroke="black" />
            <line x1={to} y1={0} x2={to} y2={10} strokeWidth={1} stroke="black" />
        </g>
    );
};

export const Ground = ({
    x, y, width, height,
}: { x: number; y: number; width: number; height: number; }) => {
    const { range, setRange } = useSelection();

    const svgRef = useRef<SVGRectElement>(null);
    const drag = useRollDrag(svgRef, drag => setRange(spanOf(drag)));

    const marked = drag ? spanOf(drag) : range;

    return (
        <>
            {marked && <RangeMarker span={marked} />}

            <rect
                ref={svgRef}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="transparent"
            />

            {drag && <Cursor at={drag.to} />}
        </>
    );
};

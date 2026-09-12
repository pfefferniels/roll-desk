import { useRef } from "react";
import { subtract } from 'linked-rolls';
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { useSelection } from "../../providers/SelectionContext";
import { spanDragged, useRollDrag } from "../../hooks/useRollDrag";
import { Cursor } from "./Cursor";
import { RollRange } from "../../providers/SelectionContext";

/** The stretch of roll playback is held to. */
const RangeMarker = ({ span }: { span: RollRange }) => {
    const { translateX, height } = usePinchZoom();

    const [start, end] = span;
    const [from, to] = [translateX(start), translateX(end)];

    return (
        <g className="range">
            <rect
                x={from}
                y={0}
                width={subtract(to, from)}
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
    const { zoom } = usePinchZoom();

    const svgRef = useRef<SVGRectElement>(null);

    // Playback covers the whole roll where no range is set, so a click clears it.
    const drag = useRollDrag(svgRef, drag => setRange(spanDragged(drag, zoom)));

    const marked = drag ? spanDragged(drag, zoom) : range;

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

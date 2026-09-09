import { Expression, Note } from "linked-rolls";
import { useContext, useMemo, useState } from "react";
import { usePinchZoom } from "../../hooks/usePinchZoom";
import { usePlaybackMark } from "../../hooks/usePlaybackMark";
import { EditionContext } from "../../providers/EditionContext";
import { shadowLook } from "./constraintLooks";

interface PerforationProps {
    symbol: Note | Expression;
    age?: number;
    highlight: boolean;
    /** How far the performance moves the perforation from where it was measured, in mm. */
    shift?: number;
    onClick: () => void;
}

export const Perforation = ({ symbol, age, highlight, shift = 0, onClick }: PerforationProps) => {
    const { view, viewOnly } = useContext(EditionContext)
    const [hovered, setHovered] = useState(false);
    const { marked, followPlayback } = usePlaybackMark();
    const { translateX, trackToY, laneHeight, height: canvasHeight, zoom, bar } = usePinchZoom();

    const displayDetails = hovered || marked

    const features = useMemo(() => view?.carriersOf(symbol) ?? [], [view, symbol]);

    const { onsets, offsets } = useMemo(() => ({
        onsets: features.map(e => e.horizontal.from).sort(),
        offsets: features.map(e => e.horizontal.to).sort()
    }), [features]);

    const place = view?.placeOf(symbol)
    const position = bar.positionOf(symbol)

    if (!view || !place || position === undefined) return null;
    if (onsets.length === 0 || offsets.length === 0) return null;

    const innerBoundaries = [onsets[onsets.length - 1], offsets[0]].map(translateX);
    const onsetStretch = [onsets[0], onsets[onsets.length - 1]].map(translateX);
    const offsetStretch = [offsets[0], offsets[offsets.length - 1]].map(translateX);

    const meanOnset = place.from
    const meanOffset = place.to

    // The lane is the bar's answer, not the carriers': copies of two
    // systems number their tracks differently and both may carry this.
    const y = trackToY(position);
    const height = laneHeight(position);

    const opacity = 1 / ((age || 0) + 1)
    const color = (age || 0) >= 1 ? 'gray' : 'black';

    const detailed = zoom >= 0.7
    const whiskers = zoom >= 0.3
    const dx = translateX(shift)
    const shadow = Math.abs(dx) >= 1

    const whisker = (x: number) => (
        <line
            x1={x}
            x2={x}
            y1={displayDetails ? 0 : y - 10}
            y2={displayDetails ? canvasHeight : y + 20}
            stroke='black'
            strokeWidth={0.2}
            strokeOpacity={0.7} />
    )

    return (
        <g
            ref={followPlayback}
            data-id={symbol.id}
            id={symbol.id}
            className='collated-event'
            style={{
                pointerEvents: (viewOnly && !detailed) ? 'none' : 'auto'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* The body sits where the perforation plays; the measurement stays behind as a shadow. */}
            <g transform={`translate(${dx} 0)`}>
                <rect
                    x={innerBoundaries[0]}
                    width={innerBoundaries[1] - innerBoundaries[0]}
                    y={y}
                    height={height}
                    fill={highlight ? 'red' : color}
                    fillOpacity={opacity}
                    onClick={onClick} />
                {whiskers && whisker(translateX(meanOnset))}
                {whiskers && whisker(translateX(meanOffset))}
                {detailed && (
                    <polygon
                        onClick={onClick}
                        fill={color}
                        fillOpacity={opacity}
                        points={`
                            ${onsetStretch[0]},${y + height / 2}
                            ${innerBoundaries[0]},${y}
                            ${innerBoundaries[1]},${y}
                            ${offsetStretch[1]},${y + height / 2}
                            ${innerBoundaries[1]},${y + height}
                            ${innerBoundaries[0]},${y + height}
                        `} />
                )}
                {detailed && displayDetails && (
                    <text
                        x={innerBoundaries[0]}
                        y={y - 2}
                        fontSize={12}
                    >
                        <tspan>
                            {symbol.type === 'expression' && symbol.expressionType}
                            {symbol.type === 'note' && `Note: ${symbol.pitch}`}
                        </tspan>
                    </text>
                )}
            </g>
            {shadow && (
                <g style={{ pointerEvents: 'none' }} opacity={opacity}>
                    <line
                        x1={innerBoundaries[0]}
                        x2={innerBoundaries[0] + dx}
                        y1={y + height / 2}
                        y2={y + height / 2}
                        stroke={shadowLook.stroke}
                        strokeWidth={0.4} />
                    <rect
                        x={innerBoundaries[0]}
                        width={innerBoundaries[1] - innerBoundaries[0]}
                        y={y}
                        height={height}
                        {...shadowLook} />
                </g>
            )}
        </g>
    );
};

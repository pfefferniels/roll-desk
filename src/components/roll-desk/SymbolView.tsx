import { add, Expression, Millimeters, mm, Note, scale, subtract } from "linked-rolls";
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
    shift?: Millimeters;
    onClick: () => void;
}

export const Perforation = ({ symbol, age, highlight, shift = mm(0), onClick }: PerforationProps) => {
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

    const firstOnset = onsets.at(0)
    const lastOnset = onsets.at(-1)
    const firstOffset = offsets.at(0)
    const lastOffset = offsets.at(-1)

    if (!view || !place || position === undefined) return null;
    if (!firstOnset || !lastOnset || !firstOffset || !lastOffset) return null;

    // The stretch every carrier agrees the symbol covers, and how far the
    // carriers disagree at either end.
    const innerFrom = translateX(lastOnset)
    const innerTo = translateX(firstOffset)
    const onsetFrom = translateX(firstOnset)
    const offsetTo = translateX(lastOffset)

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
                    x={innerFrom}
                    width={subtract(innerTo, innerFrom)}
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
                            ${onsetFrom},${add(y, scale(height, 0.5))}
                            ${innerFrom},${y}
                            ${innerTo},${y}
                            ${offsetTo},${add(y, scale(height, 0.5))}
                            ${innerTo},${add(y, height)}
                            ${innerFrom},${add(y, height)}
                        `} />
                )}
                {detailed && displayDetails && (
                    <text
                        x={innerFrom}
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
                        x1={innerFrom}
                        x2={add(innerFrom, dx)}
                        y1={y + height / 2}
                        y2={y + height / 2}
                        stroke={shadowLook.stroke}
                        strokeWidth={0.4} />
                    <rect
                        x={innerFrom}
                        width={subtract(innerTo, innerFrom)}
                        y={y}
                        height={height}
                        {...shadowLook} />
                </g>
            )}
        </g>
    );
};

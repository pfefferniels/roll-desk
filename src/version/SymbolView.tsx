import { add, Expression, Millimeters, mm, Note, scale, subtract, placedCarriersOf, placeOf, Track } from "linked-rolls";
import { useContext, useEffect, useMemo, useState } from "react";
import { usePinchZoom } from "../canvas/usePinchZoom";
import { usePlaybackMark } from "../playback/usePlaybackMark";
import { EditionContext } from "../edition/EditionContext";
import { shadowLook } from "../constraints/constraintLooks";
import { halfOf, whiskerReach } from "./whisker";
import { useLaneLabelling } from "./LaneLabel";
import { ReadDynamics, Readings } from "./Dynamics";

interface CommandProps {
    symbol: Note | Expression;
    age?: number;
    highlight: boolean;
    /** How far the performance moves the command from where it was measured, in mm. */
    shift?: Millimeters;
    /** The track the keyboard is divided at, where an emulator says so. */
    division?: Track;
    /** The dynamics drawn for the version, to be read where the whiskers cross them. */
    dynamics?: readonly ReadDynamics[];
    onClick: () => void;
}

export const Command = ({ symbol, age, highlight, shift = mm(0), division, dynamics = [], onClick }: CommandProps) => {
    const { edition, viewOnly } = useContext(EditionContext)
    const [hovered, setHovered] = useState(false);
    const label = useLaneLabelling();
    const { marked, followPlayback } = usePlaybackMark();
    const { translateX, trackToY, laneHeight, height: canvasHeight, room, zoom, bar } = usePinchZoom();

    // Whiskers follow playback too, so a sounding command is read against
    // its dynamics; how far its carriers disagree only the pointer asks.
    const whiskers = hovered || marked

    // While playback stands on the command, the label at the left edge names it.
    useEffect(() => {
        if (!marked) return
        label.played(symbol)
        return () => label.played(current => current?.id === symbol.id ? undefined : current)
    }, [marked, symbol, label])

    const features = useMemo(() => edition ? placedCarriersOf(edition, symbol) : [], [edition, symbol]);

    const { onsets, offsets } = useMemo(() => ({
        onsets: features.map(e => e.horizontal.from).sort((a, b) => a - b),
        offsets: features.map(e => e.horizontal.to).sort((a, b) => a - b)
    }), [features]);

    const place = edition && placeOf(edition, symbol)
    const position = bar.positionOf(symbol)

    const firstOnset = onsets.at(0)
    const lastOnset = onsets.at(-1)
    const firstOffset = offsets.at(0)
    const lastOffset = offsets.at(-1)

    if (!edition || !place || position === undefined) return null;
    if (firstOnset === undefined || lastOnset === undefined || firstOffset === undefined || lastOffset === undefined) return null;

    // Where the carriers put the symbol, as the edition takes it from them.
    const from = translateX(place.from)
    const to = translateX(place.to)

    // The stretch every carrier agrees the symbol covers, and how far the
    // carriers disagree at either end.
    const innerFrom = translateX(lastOnset)
    const innerTo = translateX(firstOffset)
    const onsetFrom = translateX(firstOnset)
    const offsetTo = translateX(lastOffset)

    // The lane is the bar's answer, not the carriers': copies of two
    // systems number their tracks differently and both may carry this.
    const y = trackToY(position);
    const height = laneHeight(position);

    const opacity = 1 / ((age || 0) + 1)
    const color = (age || 0) >= 1 ? 'gray' : 'black';

    const detailed = zoom >= 0.7
    const dx = translateX(shift)
    const shadow = Math.abs(dx) >= 1

    const half = halfOf(symbol, position, division)
    const [top, bottom] = whiskerReach(
        { y, height },
        half,
        { height: canvasHeight, room }
    )
    const whisker = (x: number) => (
        <line
            x1={x}
            x2={x}
            y1={top}
            y2={bottom}
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
            onMouseEnter={() => {
                setHovered(true)
                label.pointedAt(symbol)
            }}
            onMouseLeave={() => {
                setHovered(false)
                label.pointedAt(current => current?.id === symbol.id ? undefined : current)
            }}
        >
            {/* The body sits where the command plays; the measurement stays behind as a shadow. */}
            <g transform={`translate(${dx} 0)`}>
                {/* Under the pointer it gives way to the spread, but stays to be pointed at and clicked. */}
                <rect
                    x={from}
                    width={subtract(to, from)}
                    y={y}
                    height={height}
                    fill={highlight ? 'red' : color}
                    fillOpacity={hovered ? 0 : opacity}
                    onClick={onClick} />
                {hovered && (
                    <>
                        <rect
                            x={innerFrom}
                            width={subtract(innerTo, innerFrom)}
                            y={y}
                            height={height}
                            fill={highlight ? 'red' : color}
                            fillOpacity={opacity}
                            onClick={onClick} />
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
                    </>
                )}
                {whiskers && whisker(from)}
                {whiskers && whisker(to)}
            </g>
            {/* Only under the pointer: playback marks a chord's notes at once, whose readings would be written over each other. */}
            {hovered && half && (
                <Readings
                    at={[add(place.from, shift), add(place.to, shift)]}
                    scope={half}
                    dynamics={dynamics} />
            )}
            {shadow && (
                <g style={{ pointerEvents: 'none' }} opacity={opacity}>
                    <line
                        x1={from}
                        x2={add(from, dx)}
                        y1={y + height / 2}
                        y2={y + height / 2}
                        stroke={shadowLook.stroke}
                        strokeWidth={0.4} />
                    <rect
                        x={from}
                        width={subtract(to, from)}
                        y={y}
                        height={height}
                        {...shadowLook} />
                </g>
            )}
        </g>
    );
};

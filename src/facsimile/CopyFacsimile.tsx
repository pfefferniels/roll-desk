import {
    featuresMadeBy, featuresOf, FeatureOrPatch, Patch, Path, RollCopy, Writing, pathIn
} from "linked-rolls";
import { usePinchZoom } from "../canvas/usePinchZoom.tsx";
import { boxOf } from "../canvas/rollGeometry.ts";
import { useContext, useMemo, useRef } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor } from "../canvas/Cursor.tsx";
import { useRollDrag } from "../canvas/useRollDrag.ts";
import { EventDimension } from "../desk/RollDesk.tsx";
import { Arguable } from "../accounts/Arguable.tsx";
import { EditionContext } from "../edition/EditionContext.tsx";
import { laterHand, Modifications } from "./Modifications.tsx";
import { Facsimile } from "./Facsimile.tsx";
import { FacsimileBlend, transcriptionTakesPointer } from "./facsimileBlend.ts";
import { WrittenText } from "./WrittenText.tsx";

interface CopyFacsimileProps {
    copy: RollCopy;
    active: boolean;
    onClick: (e: FeatureOrPatch) => void;
    color: string;
    onSelectionDone: (dimension?: EventDimension) => void;
    blend: FacsimileBlend;
}

export const CopyFacsimile = ({
    copy,
    active,
    color,
    onClick,
    onSelectionDone,
    blend,
}: CopyFacsimileProps) => {
    const { edition } = useContext(EditionContext);
    const geometry = usePinchZoom();
    const svgRef = useRef<SVGGElement>(null);
    const drag = useRollDrag(svgRef);

    const madeLater = useMemo(
        () => new Set(copy.modifications.flatMap(featuresMadeBy).map(feature => feature.id)),
        [copy.modifications]
    )

    if (!edition) return null

    return (
        <g className="roll-copy" ref={svgRef}>
            <defs>
                <filter id="contrast-brightness">
                    <feComponentTransfer>
                        <feFuncR type="linear" slope="1.5" intercept="0.1" />
                        <feFuncG type="linear" slope="1.5" intercept="0.1" />
                        <feFuncB type="linear" slope="1.5" intercept="0.1" />
                    </feComponentTransfer>
                </filter>
                <filter id="contrast">
                    <feComponentTransfer>
                        <feFuncR type="linear" slope="1.5" intercept="-0.25" />
                        <feFuncG type="linear" slope="1.5" intercept="-0.25" />
                        <feFuncB type="linear" slope="1.5" intercept="-0.25" />
                    </feComponentTransfer>
                </filter>
                <filter id="invert">
                    <feComponentTransfer>
                        <feFuncR type="table" tableValues="1 0" />
                        <feFuncG type="table" tableValues="1 0" />
                        <feFuncB type="table" tableValues="1 0" />
                    </feComponentTransfer>
                </filter>
            </defs>

            <Facsimile copy={copy} blend={blend} />

            {drag && <Cursor at={drag.to} />}

            <g
                className="transcription"
                opacity={blend.transcription}
                pointerEvents={transcriptionTakesPointer(blend) ? 'auto' : 'none'}
            >
                {active && (
                    <RollGrid
                        selectionMode={active}
                        onSelectionDone={onSelectionDone}
                        width={geometry.translateX(geometry.rollLength)}
                    />
                )}

                {featuresOf(copy).map(feature => {
                    const path = edition && pathIn(edition, feature.id)
                    // What a later hand brought onto the copy is drawn in its colour.
                    return (
                        <Feature
                            key={feature.id}
                            feature={feature}
                            conditionPath={path && [...path, 'condition']}
                            onClick={() => onClick(feature)}
                            color={madeLater.has(feature.id) ? laterHand : color}
                        />
                    )
                })}

                <Modifications copy={copy} />

                <KeyboardDivision />
            </g>
        </g>
    );
};

/**
 * Welte divides the keyboard between f♯ and g (Betriebsanleitung p. 7),
 * so the first treble note is MIDI 67. Both emulators put their default
 * division there: track 54 on the T-100 and 52 on the T-98.
 */
const LOWEST_TREBLE_PITCH = 67

const KeyboardDivision = () => {
    const { trackToY, translateX, rollLength, bar } = usePinchZoom();

    const division = bar.positionOf({ type: 'note', pitch: LOWEST_TREBLE_PITCH })
    if (division === undefined) return null

    const y = trackToY(division);

    return (
        <line
            x1={0}
            y1={y}
            x2={translateX(rollLength)}
            y2={y}
            stroke="black"
            strokeWidth={1}
            strokeDasharray={"5 5"}
        />
    );
};

interface FeatureProps<FeatureType extends FeatureOrPatch = FeatureOrPatch> {
    feature: FeatureType;
    conditionPath?: Path
    onClick: React.MouseEventHandler;
    color: string;
}

const Feature = ({ feature, conditionPath, onClick, color }: FeatureProps) => {
    const { x, y } = boxOf(feature, usePinchZoom());

    return (
        <g className="feature">
            {(feature.type === 'Patch') && <PatchFeature feature={feature} color={color} onClick={onClick} />}
            {feature.type === 'Writing' && <WritingFeature feature={feature} color={color} onClick={onClick} />}
            {(feature.type === 'HoleChain') && <HoleChainFeature feature={feature} color={color} onClick={onClick} />}
            {(feature.type === 'Mark') && <MarkFeature feature={feature} color={color} onClick={onClick} />}

            {(feature.condition && conditionPath) && (
                <foreignObject
                    x={x + 10}
                    y={y - 10}
                    width={200}
                    height={40}
                    fontSize={10}
                    transform={`rotate(-90 ${x} ${y})`}
                >
                    <Arguable
                        path={conditionPath}
                    >
                        {feature.condition.conditionType.replaceAll('-', ' ')}
                    </Arguable>
                </foreignObject>
            )}
        </g>
    );
}

const PatchFeature = ({ feature, color }: FeatureProps<Patch>) => {
    const { x, y, width, height } = boxOf(feature, usePinchZoom());

    return (
        <>
            <rect
                fill={color}
                fillOpacity={0.2}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
                data-id={feature.id}
                id={feature.id}
                filter="url(#spray)"
            />

            {feature.features?.map((borne, index) => borne.type === 'Writing' && (
                <WrittenText
                    key={borne.id ?? index}
                    box={{ x, y, width, height }}
                    lines={borne.transcription.text.split('\n')}
                    angle={angleOf(borne)}
                    color={color}
                />
            ))}
        </>
    );
};

/**
 * How far a writing is turned on the drawing. The roll is drawn running
 * from left to right, so a writing across it stands upright, and its
 * rotation turns it from there. The angle is added rather than subtracted
 * because the bar is laid out with the bass below, which makes a turn
 * towards the end of the roll clockwise here.
 */
const angleOf = (writing: Pick<Writing, 'rotation'>) =>
    90 + Number(writing.rotation?.value ?? 0)

const WritingFeature = ({ feature, color }: FeatureProps<Writing>) => (
    <WrittenText
        id={feature.id}
        box={boxOf(feature, usePinchZoom())}
        lines={feature.transcription.text.split('\n')}
        angle={angleOf(feature)}
        color={color}
    />
);

const HoleChainFeature = ({ feature, onClick, color }: FeatureProps) => {
    const geometry = usePinchZoom();

    const isExpression = geometry.roleOf(feature.vertical.from)?.includes('expression')
    const { x, y, width, height } = boxOf(feature, geometry);

    if (isExpression) {
        return (
            <rect x={x} y={y} width={width} height={height} fill={color} id={feature.id} onClick={onClick} />
        )
    }
    return (
        <line
            x1={x + height / 2}
            y1={y + height / 2}
            x2={x + width - height / 2}
            y2={y + height / 2}
            stroke={color}
            strokeWidth={height}
            strokeLinecap="round"
            strokeDasharray={`2 4`}
            id={feature.id}
            onClick={onClick}
        />
    );
}

const MarkFeature = ({ feature, onClick }: FeatureProps) => {
    const { x, y, width } = boxOf(feature, usePinchZoom());

    if (!feature.depiction) return null;

    return (
        <image
            xlinkHref={feature.depiction.replace('default.jpg', 'gray.jpg')}
            x={x}
            y={y}
            width={width}
            data-id={feature.id}
            id={feature.id}
            onClick={onClick}
            filter={"url(#contrast-brightness)"}
        />
    );
}


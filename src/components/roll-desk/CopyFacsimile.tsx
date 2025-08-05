import {
    flat,
    RollCopy,
    RollFeature
} from "linked-rolls";
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx";
import { useLayoutEffect, useRef, useState } from "react";
import { RollGrid } from "./RollGrid.tsx";
import { Cursor } from "./Cursor.tsx";
import { EventDimension } from "./RollDesk.tsx";

interface IIIFInfo {
    "@id": string;
    height: number;
    width: number;
    tiles: { width: number; height: number; scaleFactors: number[] }[];
}

async function fetchIIIFInfo(url: string): Promise<IIIFInfo> {
    const response = await fetch(`${url}/info.json`);
    return response.json();
}

function pixelsToMM(pixels: number, dpi: number): number {
    const millimetersPerInch = 25.4;
    return (pixels / dpi) * millimetersPerInch;
}

async function tilesAsSVGImage(
    baseUrl: string,
    iiifInfo: IIIFInfo,
    holeSeparation: number,
    margins: { treble: number; bass: number },
    stretchX: number,
    trackToY: (track: number) => number,
    shiftOp: number,
    stretchOp: number
) {
    const dpi = 300.25;
    const width = iiifInfo.height;
    const stepSize = 10000

    const images: JSX.Element[] = [];
    const areas = [[0, 9], [10, 89], [90, 99]]
    for (const [from, to] of areas) {
        for (let x = 0; x < width; x += stepSize) {
            const y = Math.ceil(from * holeSeparation + margins.bass);
            const height = Math.ceil(holeSeparation * (to - from));
            const region = `${y},${x},${height},${stepSize}`;
            const size = `256,`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const svgX = (pixelsToMM(x, dpi) + shiftOp) * stretchX * stretchOp;
            const svgWidth = pixelsToMM(stepSize, dpi) * stretchX * stretchOp;
            if (trackToY(from) === null || trackToY(to) === null) {
                continue
            }
            const svgHeight = trackToY(from) - trackToY(to);

            images.push(
                <image
                    key={`tile_${to}_${x}`}
                    xlinkHref={tileUrl}
                    x={svgX}
                    y={trackToY(to)}
                    width={svgWidth}
                    height={svgHeight}
                    preserveAspectRatio="none"
                />
            );
        }
    }
    return images;
}

interface CopyFacsimileProps {
    copy: RollCopy;
    active: boolean;
    onClick: (e: RollFeature) => void;
    color: string;
    onSelectionDone: (dimension: EventDimension) => void;
    facsimile?: File;
    facsimileOpacity: number;
}

export const CopyFacsimile = ({
    copy,
    active,
    color,
    onClick,
    onSelectionDone,
    facsimile,
    facsimileOpacity,
}: CopyFacsimileProps) => {
    const { zoom, trackHeight, trackToY } = usePinchZoom();
    const svgRef = useRef<SVGGElement>(null);

    const [tiles, setTiles] = useState<JSX.Element[]>();

    useLayoutEffect(() => {
        const renderIIIF = async () => {
            if (!svgRef.current) return;

            if (!copy.scan) return;
            const holeSeparation = copy.measurements.holeSeparation?.value
            const margins = copy.measurements.margins
            if (!holeSeparation || !margins) return;

            if (facsimileOpacity > 0) {
                if (!facsimile) {
                    const baseUrl = copy.scan;
                    const info = await fetchIIIFInfo(baseUrl);
                    const stretch = copy.conditions
                        .map(c => flat(c))
                        .find(c => c.type === 'paper-stretch')

                    setTiles(
                        await tilesAsSVGImage(
                            baseUrl,
                            info,
                            holeSeparation,
                            margins,
                            zoom,
                            trackToY,
                            copy.measurements.shift?.horizontal || 0,
                            stretch?.factor || 1
                        )
                    );
                } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const url = reader.result as string;
                        console.log("url=", url);
                        setTiles([
                            <image
                                className="facsimile"
                                key="facsimile"
                                xlinkHref={url}
                                x={0}
                                y={0}
                                width={1000}
                                height={500}
                            />,
                        ]);
                    };
                    reader.readAsDataURL(facsimile);
                }
            } else {
                setTiles([]);
            }
        };

        renderIIIF();
    }, [svgRef, trackHeight, zoom, copy, facsimile, trackToY]);

    return (
        <>
            <g className="roll-copy" ref={svgRef}>
                <defs>
                    <filter id="invertFilter">
                        <feComponentTransfer>
                            <feFuncR type="table" tableValues="1 0" />
                            <feFuncG type="table" tableValues="1 0" />
                            <feFuncB type="table" tableValues="1 0" />
                        </feComponentTransfer>
                    </filter>
                </defs>

                <g className='facsimile' opacity={facsimileOpacity}>
                    {tiles}
                </g>

                <Cursor svgRef={svgRef} />

                {active && (
                    <RollGrid
                        selectionMode={active}
                        onSelectionDone={onSelectionDone}
                        width={100000}
                    />
                )}

                {copy.features.map(feature => {
                    return (
                        <Feature
                            key={feature.id}
                            feature={feature}
                            onClick={() => onClick(feature)}
                            color={color}
                            showFacsimile={facsimileOpacity === 0}
                        />
                    )
                })}
            </g>

            <KeyboardDivision />
        </>
    );
};

const KeyboardDivision = () => {
    const { trackToY } = usePinchZoom();

    const division = 54;
    const y = trackToY(division);

    return (
        <line
            x1={0}
            y1={y}
            x2={100000}
            y2={y}
            stroke="black"
            strokeWidth={1}
            strokeDasharray={"5 5"}
        />
    );
};

interface FeatureProps {
    feature: RollFeature;
    onClick: React.MouseEventHandler;
    color: string;
    showFacsimile?: boolean
}

const Feature = ({ feature, onClick, color, showFacsimile }: FeatureProps) => {
    const { translateX, trackToY, trackHeight } = usePinchZoom();

    // Validate feature data before processing
    if (!feature?.horizontal || !feature?.vertical) {
        console.warn('Invalid feature data:', feature?.id);
        return null;
    }

    // Improved coordinate calculation with validation
    const fromX = feature.horizontal.from;
    const toX = feature.horizontal.to;
    const fromY = feature.vertical.from;
    const toY = feature.vertical.to;

    // Validate coordinate values
    if (!isFinite(fromX) || !isFinite(fromY) || !isFinite(toX)) {
        console.warn('Invalid coordinates for feature:', feature.id);
        return null;
    }

    const x = translateX(fromX);
    const y = trackToY(fromY);
    
    // Calculate width with minimum size for visibility
    const calculatedWidth = translateX(toX - fromX);
    const width = Math.max(0.5, calculatedWidth); // Ensure minimum width

    // Calculate height with proper fallback
    let height: number;
    if (toY === undefined || !isFinite(toY)) {
        height = trackHeight.note;
    } else {
        const calculatedHeight = trackToY(toY) - trackToY(fromY);
        height = Math.max(0.5, Math.abs(calculatedHeight)); // Ensure positive minimum height
    }

    // Validate final rendering coordinates
    if (!isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height)) {
        console.warn('Invalid rendering coordinates for feature:', feature.id);
        return null;
    }

    return (
        <g className="feature" data-id={feature.id} id={feature.id} onClick={onClick}>
            {(showFacsimile && feature.annotates) && (
                <image
                    xlinkHref={feature.annotates.replace('default.jpg', 'gray.jpg')}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    filter="url(#invertFilter)"
                />
            )}

            <rect
                fill={color}
                fillOpacity={0.3}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
            />

            {feature.condition && (
                <text
                    x={Math.max(0, x)}
                    y={Math.max(10, y)}
                    fontSize={10}
                    className="feature-condition"
                >
                    {flat(feature.condition)?.type || 'Unknown'}
                </text>
            )}
        </g>
    );
};

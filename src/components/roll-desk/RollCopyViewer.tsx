import { Emulation, RollCopy } from "linked-rolls"
import type { AnyRollEvent, Cover, EventDimension, Expression, HandwrittenText, MeasurementInfo, Note, Stamp } from "linked-rolls/lib/types.d.ts"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Dynamics } from "./Dynamics.tsx"
import { RollGrid } from "./RollGrid.tsx"
import { Cursor, FixedCursor } from "./Cursor.tsx"

interface IIIFInfo {
    '@id': string;
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
    measurementInfo: MeasurementInfo,
    stretchX: number,
    stretchY: number
) {
    const dpi = 300.25
    // TODO: Calculate the zoom level that best matches the stretch factors
    const zoomLevel = 0;

    const tileSize = iiifInfo.tiles[0].width;
    const scale = iiifInfo.tiles[0].scaleFactors[zoomLevel];
    const scaledWidth = iiifInfo.width / scale;
    const scaledHeight = iiifInfo.height / scale;

    // const totalHeightMM = pixelsToMM(iiifInfo.width, dpi);

    const rows = Math.ceil(scaledHeight / tileSize);
    const cols = Math.ceil(scaledWidth / tileSize);

    const images = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const region = `${x * tileSize},${y * tileSize},${tileSize},${tileSize}`;
            const size = `${tileSize},`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const newX = pixelsToMM(y * tileSize, dpi) * stretchX;
            const xAsTrack = Math.round(((x * tileSize) - measurementInfo.margins.bass) / measurementInfo.holeSeparation)
            const newY = (74 - xAsTrack) * stretchY + stretchY / 2
            // console.log('y=', newY)
            const width = pixelsToMM(tileSize, dpi) * stretchX;
            const height = tileSize / measurementInfo.holeSeparation * stretchY;

            images.push((
                <image
                    key={`tile_${y}${x}`}
                    xlinkHref={tileUrl}
                    x={newX}
                    y={newY}
                    width={width}
                    height={height}
                    opacity={0.8}
                    viewBox={[0, 0, width, height].join(' ')}
                    preserveAspectRatio='none'
                />
            ));
        }
    }
    return images;
}

interface RollCopyViewerProps {
    copy: RollCopy
    onTop: boolean
    onClick: (e: AnyRollEvent) => void
    color: string
    onSelectionDone: (dimension: EventDimension) => void
    fixedX: number
    setFixedX: (fixedX: number) => void
}

export const RollCopyViewer = ({ copy, onTop, color, onClick, onSelectionDone, fixedX, setFixedX }: RollCopyViewerProps) => {
    const { zoom, trackHeight } = usePinchZoom()
    const svgRef = useRef<SVGGElement>(null)

    const [tiles, setTiles] = useState<JSX.Element[]>()
    const [emulation, setEmulation] = useState<Emulation>()

    useLayoutEffect(() => {
        const renderIIIF = async () => {
            if (!svgRef.current) return

            if (!copy.measurement) return

            const baseUrl = copy.measurement.hasCreated.info.iiifLink
            const info = await fetchIIIFInfo(baseUrl)
            setTiles(await tilesAsSVGImage(baseUrl, info, copy.measurement.hasCreated.info, zoom, trackHeight))
        }

        renderIIIF()
    }, [svgRef, trackHeight, zoom, copy.measurement])

    useEffect(() => {
        // whenever the events change, update the emulation
        console.log('rerunning emulation')
        const newEmulation = new Emulation()
        newEmulation?.emulateFromRoll(copy.events.filter(e => e.type === 'note' || e.type === 'expression'))
        setEmulation(newEmulation)
    }, [copy])

    console.log(copy, 'onTop:', onTop)

    return (
        <>
            <g className='roll-copy' ref={svgRef}>
                {tiles}
                {onTop && (
                    <RollGrid
                        selectionMode={onTop}
                        onSelectionDone={onSelectionDone}
                        width={100000} />
                )}
                {copy.events.map((event) => {
                    if (event.type === 'note' || event.type === 'expression' || event.type === 'cover') {
                        return (
                            <PerforatedEvent
                                key={event.id}
                                event={event}
                                onClick={() => onClick(event)}
                                onTop={onTop}
                                color={color}
                            />)
                    }
                    else if (event.type === 'handwrittenText' || event.type === 'stamp') {
                        return (
                            <TextEvent
                                key={event.id}
                                event={event}
                                onTop={onTop}
                                onClick={() => onClick(event)}
                            />
                        )
                    }
                    return null
                })}

                {emulation && <Dynamics forEmulation={emulation} color={color} />}
            </g>

            <Cursor
                onFix={(x) => setFixedX(x)}
                svgRef={svgRef} />
            <FixedCursor fixedAt={fixedX} />
        </>
    )
}

interface PerforatedEventProps {
    event: Note | Expression | Cover
    onClick: () => void
    onTop: boolean
    color: string
}

const PerforatedEvent = ({ event, onClick, onTop, color }: PerforatedEventProps) => {
    const { playSingleNote } = usePiano()
    const { translateX, translateY } = usePinchZoom()

    return (
        <rect
            key={event.id}
            onClick={(e) => {
                if (event.type === 'note') {
                    playSingleNote(event.hasPitch)
                }

                if (e.metaKey && event.annotates) {
                    window.open(event.annotates)
                    return
                }

                onClick()
            }}
            data-id={event.id}
            id={event.id}
            x={translateX(event.hasDimension.horizontal.from)}
            width={translateX(event.hasDimension.horizontal.to!) - translateX(event.hasDimension.horizontal.from)}
            height={5}
            fillOpacity={onTop ? 0.9 : 0.2}
            fill={event.type === 'cover' ? 'url(#patchPattern)' : color}
            y={translateY(100 - event.hasDimension.vertical.from)}>
        </rect>)
}

interface TextEventProps {
    event: HandwrittenText | Stamp
    onClick: () => void
    onTop: boolean
}

const TextEvent = ({ event, onClick, onTop }: TextEventProps) => {
    const { translateX, translateY } = usePinchZoom()

    const horizontal = event.hasDimension.horizontal
    const vertical = event.hasDimension.vertical

    const x = translateX(horizontal.from)
    const y = translateY(100 - vertical.from)

    return (
        <g className='textEvent' data-id={event.id} onClick={onClick}>
            <rect
                fill='white'
                fillOpacity={0.5}
                onClick={onClick}
                strokeWidth={0}
                x={x}
                y={y}
                width={translateX(event.hasDimension.horizontal.to! - event.hasDimension.horizontal.from)}
                height={translateY((100 - event.hasDimension.vertical.to!) - (100 - event.hasDimension.vertical.from))}
            />
            <text
                fill='black'
                stroke='black'
                fillOpacity={onTop ? 0.9 : 0.2}
                strokeOpacity={onTop ? 0.9 : 0.2}
                x={translateX(event.hasDimension.horizontal.from)}
                y={translateY(100 - event.hasDimension.vertical.from)}
                transform={`rotate(90 ${x} ${y})`}
                fontSize={12}>
                {event.text}
            </text>
        </g>
    )
}

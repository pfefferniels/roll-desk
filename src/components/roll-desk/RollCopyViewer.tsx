import { Emulation, RollCopy } from "linked-rolls"
import type { AnyRollEvent, Cover, EventDimension, Expression, HandwrittenText, Note, RollLabel, Stamp } from "linked-rolls/lib/types.d.ts"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
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
    holeSeparation: number,
    margins: { treble: number, bass: number },
    stretchX: number,
    stretchY: number,
    opacity: number,
    shiftOp: number,
    stretchOp: number
) {
    const dpi = 300.25

    const tileSize = iiifInfo.tiles[0].width;

    // TODO: Calculate the zoom level that best matches the stretch factors
    // Also take into account which part of the roll is visible to the 
    // user at the moment
    const scale = 16;

    const rows = Math.ceil(iiifInfo.height / tileSize);
    const cols = Math.ceil(iiifInfo.width / tileSize);

    const images = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const region = `${x * tileSize},${y * tileSize},${tileSize},${tileSize}`;
            const size = `${iiifInfo.width / scale},`;
            const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

            const newX = (pixelsToMM(y * tileSize, dpi) + shiftOp) * stretchX * stretchOp;
            const xAsTrack = Math.round(((x * tileSize) - margins.bass) / holeSeparation)
            const newY = (74 - xAsTrack) * stretchY + stretchY / 2
            const width = pixelsToMM(tileSize, dpi) * stretchX * stretchOp;
            const height = tileSize / holeSeparation * stretchY;

            images.push((
                <image
                    key={`tile_${y}${x}`}
                    xlinkHref={tileUrl}
                    x={newX}
                    y={newY}
                    width={width}
                    height={height}
                    opacity={opacity}
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
    facsimile?: File
    facsimileOpacity: number
}

export const RollCopyViewer = memo(({ copy, onTop, color, onClick, onSelectionDone, fixedX, setFixedX, facsimile, facsimileOpacity }: RollCopyViewerProps) => {
    const { zoom, trackHeight } = usePinchZoom()
    const svgRef = useRef<SVGGElement>(null)

    const [tiles, setTiles] = useState<JSX.Element[]>()
    const [emulation, setEmulation] = useState<Emulation>()

    useLayoutEffect(() => {
        const renderIIIF = async () => {
            if (!svgRef.current) return

            if (!copy.scan || !copy.measurement) return

            if (facsimileOpacity > 0) {
                if (!facsimile) {
                    const baseUrl = copy.scan
                    const info = await fetchIIIFInfo(baseUrl)
                    setTiles(
                        await tilesAsSVGImage(
                            baseUrl,
                            info,
                            copy.measurement.holeSeparation.value,
                            copy.measurement.margins,
                            zoom,
                            trackHeight,
                            facsimileOpacity,
                            copy.shift?.horizontal || 0,
                            copy.stretch?.factor || 1
                        ))
                }
                else {
                    const reader = new FileReader()
                    reader.onload = () => {
                        const url = reader.result as string
                        console.log('url=', url)
                        setTiles([<image className='facsimile' key='facsimile' xlinkHref={url} x={0} y={0} width={1000} height={500} />])
                    }
                    console.log('reading facsimile', facsimile)
                    reader.readAsDataURL(facsimile)
                }
            }
        }

        renderIIIF()
    }, [svgRef, trackHeight, zoom, copy, facsimileOpacity, facsimile])

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
                    else if (event.type === 'handwrittenText' || event.type === 'stamp' || event.type === 'rollLabel') {
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

            <KeyboardDivision />
        </>
    )
})

const KeyboardDivision = () => {
    const { translateY } = usePinchZoom()

    const division = 54
    const y = translateY(100 - division + 1)

    return (
        <line
            x1={0}
            y1={y}
            x2={100000}
            y2={y}
            stroke='black'
            strokeWidth={1}
            strokeDasharray={"5 5"}
        />
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
            data-tracker-hole={event.hasDimension.vertical.from}
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
    event: HandwrittenText | Stamp | RollLabel
    onClick: () => void
    onTop: boolean
}

const TextEvent = ({ event, onClick, onTop }: TextEventProps) => {
    const { translateX, translateY } = usePinchZoom()

    const horizontal = event.hasDimension.horizontal
    const vertical = event.hasDimension.vertical

    const x = translateX(horizontal.from)
    const y = translateY(100 - vertical.from)

    const width = translateX((event.hasDimension.horizontal.to || 0) - event.hasDimension.horizontal.from)
    const height = translateY((100 - (event.hasDimension.vertical.to || 0)) - (100 - event.hasDimension.vertical.from))

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
                transform={`translate(${x + width}, ${y + height / 2}) rotate(${event.type === 'rollLabel' ? 90 : event.rotation || 90})`}
                fontSize={12}
            >
                {event.text.split('\n').map(line => (
                    <tspan x={0} dy='1.2em' alignmentBaseline='middle' textAnchor='middle' key={`span_${line}`}>{line}</tspan>
                ))}
            </text>
        </g>
    )
}
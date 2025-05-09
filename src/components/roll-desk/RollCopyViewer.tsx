import { AnyRollEvent, Cover, Emulation, Expression, HandwrittenText, Note, RollCopy, RollLabel, Shift, Stamp, Stretch } from "linked-rolls"
import { usePiano } from "react-pianosound"
import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Dynamics } from "./Dynamics.tsx"
import { RollGrid } from "./RollGrid.tsx"
import { Cursor, FixedCursor } from "./Cursor.tsx"
import { AssumptionUnderlay } from "./AssumptionUnderlay.tsx"
import { EventDimension } from "./RollDesk.tsx"

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

    const tileWidth = iiifInfo.width;
    const tileHeight = iiifInfo.tiles[0].height * 4;

    // TODO: Calculate the zoom level that best matches the stretch factors
    // Also take into account which part of the roll is visible to the 
    // user at the moment
    const scale = 8;

    const rows = Math.ceil(iiifInfo.height / tileHeight);

    const images = [];
    for (let y = 0; y < rows; y++) {
        const region = `${0},${y * tileHeight},${iiifInfo.width},${tileHeight}`;
        const size = `${iiifInfo.width / scale},`;
        const tileUrl = `${baseUrl}/${region}/${size}/270/default.jpg`;

        const newX = (pixelsToMM(y * tileHeight, dpi) + shiftOp) * stretchX * stretchOp;
        const xAsTrack = 74/* Math.round(margins.bass / holeSeparation)*/
        const newY = (74 - xAsTrack) * stretchY + stretchY / 2
        const width = pixelsToMM(tileHeight, dpi) * stretchX * stretchOp;
        const height = tileWidth / holeSeparation * stretchY;

        images.push((
            <image
                key={`tile_${y}`}
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
    return images;
}

interface RollCopyViewerProps {
    copy: RollCopy
    onTop?: boolean
    onClick: (e: AnyRollEvent) => void
    color: string
    onSelectionDone: (dimension: EventDimension) => void
    fixedX: number
    setFixedX: (fixedX: number) => void
    facsimile?: File
    facsimileOpacity: number
}

export const RollCopyViewer = ({ copy, onTop, color, onClick, onSelectionDone, fixedX, setFixedX, facsimile, facsimileOpacity }: RollCopyViewerProps) => {
    const { zoom, trackHeight } = usePinchZoom()
    const svgRef = useRef<SVGGElement>(null)

    const [tiles, setTiles] = useState<JSX.Element[]>()
    const [emulation, setEmulation] = useState<Emulation>()

    useLayoutEffect(() => {
        const renderIIIF = async () => {
            if (!svgRef.current) return

            if (!copy.scan) return
            const measurement = copy.measurements.find(m => m.holeSeparation && m.margins)
            if (!measurement) return

            if (facsimileOpacity > 0) {
                if (!facsimile) {
                    const baseUrl = copy.scan
                    const info = await fetchIIIFInfo(baseUrl)
                    setTiles(
                        await tilesAsSVGImage(
                            baseUrl,
                            info,
                            measurement.holeSeparation!.value,
                            measurement.margins!,
                            zoom,
                            trackHeight.note,
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
            else {
                setTiles([])
            }
        }

        renderIIIF()
    }, [svgRef, trackHeight, zoom, copy, facsimileOpacity, facsimile])

    useEffect(() => {
        // whenever the events change, update the emulation
        const newEmulation = new Emulation()
        newEmulation?.emulateFromRoll(copy.getOriginalEvents().filter(e => e.type === 'note' || e.type === 'expression'))
        setEmulation(newEmulation)
    }, [copy])

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
                {copy.actions.map((action, i) => (
                    <AssumptionUnderlay
                        assumption={action}
                        key={`underlay_${action.id}`}
                        svgRef={svgRef}
                        onClick={() => { }}
                    />
                ))}

                {[...copy.conjectures.map(c => c.with).flat(), ...copy.getOriginalEvents()].map((event) => {
                    if (event.type === 'note' || event.type === 'expression' || event.type === 'cover') {
                        return (
                            <PerforatedEvent
                                key={event.id}
                                event={event}
                                onClick={() => onClick(event)}
                                onTop={onTop === undefined ? true : onTop}
                                color={color}
                                stretch={copy.stretch}
                                shift={copy.shift}
                            />)
                    }
                    else if (event.type === 'handwrittenText' || event.type === 'stamp' || event.type === 'rollLabel') {
                        return (
                            <TextEvent
                                key={event.id}
                                event={event}
                                onTop={onTop === undefined ? true : onTop}
                                onClick={() => onClick(event)}
                                stretch={copy.stretch}
                                shift={copy.shift}
                            />
                        )
                    }
                    return null
                })}

                { }

                {emulation && (
                    <Dynamics
                        forEmulation={emulation}
                        pathProps={{
                            color,
                            strokeWidth: 1
                        }}
                        shift={copy.shift}
                        stretch={copy.stretch}
                    />
                )}
            </g>

            <Cursor
                onFix={(x) => setFixedX(x)}
                svgRef={svgRef}
                shift={copy.shift}
                stretch={copy.stretch}
            />

            <FixedCursor
                fixedAt={fixedX}
                shift={copy.shift}
                stretch={copy.stretch} />

            <KeyboardDivision />
        </>
    )
}

const KeyboardDivision = () => {
    const { trackToY } = usePinchZoom()

    const division = 54
    const y = trackToY(division)

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
    stretch?: Stretch
    shift?: Shift
}

const PerforatedEvent = ({ event, onClick, onTop, color, stretch, shift }: PerforatedEventProps) => {
    const [mouseOver, setMouseOver] = useState(false)

    const { playSingleNote } = usePiano()
    const { translateX, trackToY } = usePinchZoom()

    const x = translateX(event.horizontal.from * (stretch?.factor || 1) + (shift?.horizontal || 0))
    const width =
        translateX(event.horizontal.to * (stretch?.factor || 1))
        - translateX(event.horizontal.from * (stretch?.factor || 1))

    const y = trackToY(event.vertical.from + (shift?.vertical || 0))

    return (
        <>
            <rect
                key={event.id}
                onMouseOver={() => setMouseOver(true)}
                onMouseOut={() => setMouseOver(false)}
                onClick={(e) => {
                    if (event.type === 'note') {
                        playSingleNote(event.pitch)
                    }

                    if (e.metaKey && event.annotates) {
                        window.open(event.annotates)
                        return
                    }

                    onClick()
                }}
                data-tracker-hole={event.vertical.from}
                data-id={event.id}
                id={event.id}
                x={x}
                width={width}
                height={5}
                fillOpacity={onTop ? 0.9 : 0.2}
                fill={event.type === 'cover' ? 'url(#patchPattern)' : color}
                y={y}>
            </rect>
            {mouseOver && (
                <>
                    <rect
                        x={x}
                        y={trackToY(event.vertical.from) - 60}
                        width={100}
                        height={50}
                        fill='white'
                    />
                    <text
                        x={x}
                        y={trackToY(event.vertical.from) - 50}
                        fontSize={10}
                        fill='black'
                        fillOpacity={mouseOver ? 0.9 : 0.2}
                        strokeOpacity={mouseOver ? 0.9 : 0.2}
                    >
                        {event.type === 'note' && (
                            <>
                                <tspan x={x}>
                                    Track <tspan fontWeight='bold'>{event.type === 'note' ? event.vertical.from : '[unknown]'}</tspan>
                                </tspan>
                                <tspan x={x} dy='1.2em'>
                                    Pitch: <tspan fontWeight='bold'>{event.pitch}</tspan>
                                </tspan>
                            </>
                        )}
                        {event.type === 'expression' && (
                            <tspan x={x} dy='1.2em'>
                                Expression: <tspan fontWeight='bold'>{event.expressionType}</tspan>
                            </tspan>
                        )}
                        <tspan x={x} dy='1.2em'>
                            starts at: {(event.horizontal.from / 10).toFixed(2)}cm{' '}
                            {(shift && stretch) && (
                                <tspan>
                                    ({((event.horizontal.from * (stretch?.factor || 1) + (shift?.horizontal || 0)) / 10).toFixed(2)}cm)
                                </tspan>
                            )}
                        </tspan>
                        <tspan x={x} dy='1.2em'>
                            spans: {((event.horizontal.to - event.horizontal.from) / 10).toFixed(2)}cm{' '}
                            {(shift && stretch) && (
                                <tspan>
                                    ({
                                        (((event.horizontal.to * (stretch?.factor || 1) + (shift?.horizontal || 0)) -
                                            (event.horizontal.from * (stretch?.factor || 1) + (shift?.horizontal || 0))) / 10).toFixed(2)}cm)
                                </tspan>
                            )}
                        </tspan>
                    </text>
                </>
            )}
        </>
    )
}

interface TextEventProps {
    event: HandwrittenText | Stamp | RollLabel
    onClick: () => void
    onTop: boolean
    shift?: Shift
    stretch?: Stretch
}

const TextEvent = ({ event, onClick, onTop, shift, stretch }: TextEventProps) => {
    const { translateX, trackToY } = usePinchZoom()

    const horizontal = event.horizontal
    const vertical = event.vertical

    const x = translateX(horizontal.from * (stretch?.factor || 1) + (shift?.horizontal || 0))
    const y = trackToY(vertical.from + (shift?.vertical || 0))

    const width = translateX(
        ((event.horizontal.to || 0) - event.horizontal.from) * (stretch?.factor || 1)
    )
    const height = trackToY((event.vertical.to || 0)) - trackToY(event.vertical.from)

    return (
        <g className='textEvent' data-id={event.id} onClick={onClick}>
            <rect
                fill='white'
                fillOpacity={0.5}
                onClick={onClick}
                strokeWidth={0}
                x={x}
                y={y}
                width={width}
                height={height}
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
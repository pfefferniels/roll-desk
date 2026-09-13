import { Certainty, ConstraintProblem, derivationsOf, idOf, Path, principalDerivationOf, systemIdOf, trackerBarOf, Version, VersionType } from 'linked-rolls'
import { Box, Popover, Portal } from "@mui/material";
import { problemCount, problemsOfVersion } from '../../helpers/constraints';
import { useContext, useMemo, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, SVGProps, useEffect } from "react";
import { EditionContext } from '../../providers/EditionContext';
import { Legend } from './Legend';
import { useSelection } from '../../providers/SelectionContext';
import { SlicedBalloon } from './SlicedBalloon';
import { Arguable } from './Arguable';
import { along, minus, perpendicular, point, Point, unit } from '../../helpers/drawing';
import { Svg, svg } from '../../helpers/units';

interface Stemma {
    currentVersionId: string | undefined
    /** The constraint problems of the whole edition, counted per node. */
    problems?: readonly ConstraintProblem[]
    /** How tall the drawing is, which leaves room beneath it for what is written about a version. */
    height?: number
    onClick: (versionId: string) => void
}

export const Stemma = ({ onClick, currentVersionId, problems = [], height = 600 }: Stemma) => {
    const { edition, view } = useContext(EditionContext)

    const svgRef = useRef<SVGSVGElement>(null)
    const zoomLayerRef = useRef<SVGGElement>(null)
    const svgWidth = 300
    const svgHeight = height
    const versions = edition?.versions

    // Laid out while rendering, so that no link outlives the derivation its mark addresses.
    const { nodes, links } = useMemo(() => {
        if (!versions || !view) return { nodes: [], links: [] }

        const graph = graphOf(view.withGenerations(), problems)
        return { links: graph.links, nodes: calculatePositions(graph.nodes, graph.links, svgWidth, svgHeight) }
    }, [versions, view, problems, svgHeight])

    const fit = useMemo(() => fitOf(nodes, svgWidth, svgHeight), [nodes, svgWidth, svgHeight])

    useEffect(() => {
        if (!svgRef.current || !zoomLayerRef.current || nodes.length === 0) return

        const svg = d3.select(svgRef.current)
        const zoomLayer = d3.select(zoomLayerRef.current)

        const zoomed = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
            zoomLayer.attr("transform", event.transform.toString())
        }

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 5])
            .on("zoom", zoomed)

        svg.call(zoom)

        const initialTransform = d3.zoomIdentity
            .translate(svgWidth / 2, svgHeight / 2)
            .scale(fit.scale)
            .translate(-fit.midX, -fit.midY)

        // apply initial “fit all nodes” transform
        // eslint-disable-next-line @typescript-eslint/unbound-method -- d3 means zoom.transform to be passed to `call`
        svg.call(zoom.transform, initialTransform)

        return () => {
            svg.on(".zoom", null)
        }
    }, [nodes, fit, svgWidth, svgHeight])

    return (
        <Box sx={{ position: 'relative', width: svgWidth, height: svgHeight, flexShrink: 0 }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '0.5rem', zIndex: 10 }}>
                <Legend />
            </div>
            <svg
                width={svgWidth}
                height={svgHeight}
                ref={svgRef}
                style={{ display: 'block' }}
            >
                <defs>
                    <filter id="f1"
                        x="-100%" y="-100%"
                        width="300%" height="300%">
                        <feOffset in="SourceGraphic" dx="3" dy="3" />
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g ref={zoomLayerRef}>
                    <LinkContainer
                        links={links}
                        positionedNodes={nodes}
                        markScale={1 / fit.scale}
                        onVersionClick={onClick}
                    />

                    {nodes.map((node, i) => (
                        <NavigationNode
                            key={`interpretation_${i}`}
                            node={node}
                            onClick={() => {
                                if (!edition) return
                                onClick(node.id)
                            }}
                            highlight={currentVersionId === node.id}
                        />
                    ))}
                </g>
            </svg>
        </Box>
    )
}


export interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    generation: number
    radius?: number;
    /** Left out where the version does not say whether it served as a master. */
    type?: VersionType;
    /** The reproducing system the version is coded for, named short. */
    system?: string
    /**
     * Whether the version names its system in the drawing. A version
     * inherits the system of the one it is based on, so only the root
     * and a version that changes system say which one they are in.
     */
    namesSystem?: boolean
    overlayInfo?: ReactNode
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    index?: number;
    motivationPath?: Path
    /**
     * Whether the derivation crosses from one reproducing system to
     * another. That is a transfer rather than a revision: the whole
     * expression vocabulary is re-spelled, and the edits carry out a
     * rule stated on the version's creation.
     */
    transfer?: boolean

    /** How certainly the derivation is held. */
    certainty: Certainty

    /**
     * Whether the version's text is read against this derivation. The
     * others stand as hypotheses, drawn apart and carrying no motivations.
     */
    principal: boolean

    /** Where the derivation stands in the version's `basedOn`, which is how its belief is addressed. */
    derivation: number

    /** Whether a belief is stated of the derivation, which is then marked on the link. */
    believed: boolean
}

const sharesSystem = (a: Version, b: Version) =>
    systemIdOf(a.system) === systemIdOf(b.system)

/** The versions and their derivations, as the graph the stemma draws. */
export const graphOf = (
    versions: readonly (Version & { generation: number })[],
    problems: readonly ConstraintProblem[]
): { nodes: Node[], links: Link[] } => {
    const versionBy = (id: string) => versions.find(other => other.id === id)

    /** The version the text is read against. */
    const parentOf = (version: Version) => {
        const principal = principalDerivationOf(version)
        return principal && versionBy(idOf(principal))
    }

    const nodes: Node[] = versions.map(version => {
        const troubles = problemsOfVersion(problems, version.id).length
        const parent = parentOf(version)

        return {
            id: version.id,
            label: version.siglum,
            type: version.versionType,
            system: trackerBarOf(version.system)?.name,
            namesSystem: parent === undefined || !sharesSystem(parent, version),
            generation: version.generation,
            overlayInfo: troubles > 0
                ? <Box sx={{ p: 1 }}>{problemCount(troubles)}</Box>
                : null
        }
    })

    const nodeOf = (id: string) => nodes.find(node => node.id === id) || 'unknown'

    const links: Link[] = versions.flatMap(version => {
        const principal = parentOf(version)
        return derivationsOf(version).flatMap(({ parent, certainty, belief }, derivation): Link[] => {
            const target = versionBy(parent)
            if (!target) return []

            return [{
                source: nodeOf(version.id),
                target: nodeOf(target.id),
                transfer: !sharesSystem(target, version),
                certainty,
                principal: target === principal,
                derivation,
                believed: belief !== undefined
            }]
        })
    })

    return { nodes, links }
}

/** The scale and the centre that fit every node into the drawing, with a margin left around them. */
export const fitOf = (nodes: readonly Node[], width: number, height: number, margin = 40) => {
    const xs = nodes.map(node => node.x ?? 0)
    const ys = nodes.map(node => node.y ?? 0)
    if (xs.length === 0) return { scale: 1, midX: 0, midY: 0 }

    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    return {
        scale: Math.min((width - 2 * margin) / (maxX - minX || 1), (height - 2 * margin) / (maxY - minY || 1)),
        midX: (minX + maxX) / 2,
        midY: (minY + maxY) / 2
    }
}

/** Where the mark of a derivation's belief sits: beside the middle of the link, clear of it by the distance given. */
export const linkMarkAt = (a: Point, b: Point, clearance: Svg): Point => {
    const middle = along(a, minus(b, a), 0.5)
    const direction = unit(minus(b, a))
    return direction ? along(middle, perpendicular(direction), clearance) : middle
}

export const radiusOf = (node: Node) =>
    node.radius ?? (node.type === 'edition' ? 32 : 26)

/**
 * Half the caption and the gap to the next one. Text cannot be
 * measured before it is drawn, so the width is estimated at the
 * 5.8 px a character of 10 px sans-serif takes on average.
 */
const captionHalfWidth = (node: Node) =>
    node.namesSystem && node.system ? node.system.length * 2.9 + 4 : 0

/** What a node claims of its row, caption included. */
const spaceFor = (node: Node) => Math.max(radiusOf(node), captionHalfWidth(node))

export const calculatePositions = (
    nodes: Node[],
    links: Link[],
    width: number,
    height: number,
    n: number = 300
): Node[] => {

    const rowGap = 200; // vertical distance between generations

    // fix y position based on generation
    nodes.forEach(node => {
        const y = 50 + node.generation * rowGap;
        node.y = y;
        node.fy = y;               // <- fixed y, D3 won't move it
    });

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink<Node, Link>(links.filter(l => l.source !== 'unknown' && l.target !== 'unknown'))
                .id(d => d.id)
                .strength(link => link.principal ? 0.6 : 0.1)
        )
        .force("charge", d3.forceManyBody().strength(-200))
        .force(
            "x",
            d3.forceX<Node>()
                .x(width / 2)                  // roughly center each row
                .strength(0.01)
        )
        .force(
            "collide",
            d3.forceCollide<Node>(spaceFor)
                .strength(1)
        );

    simulation.stop();
    for (let i = 0; i < n; i++) simulation.tick();

    return nodes;
};

export interface NavigationNodeProps extends SVGProps<SVGGElement> {
    node: Node
    highlight: boolean
}

export const NavigationNode = ({ node, highlight, ...svgProps }: NavigationNodeProps) => {
    const [hover, setHover] = useState(false)
    const elRef = useRef<SVGGElement>(null)

    return (
        <>
            <g
                {...svgProps}
                style={{
                    cursor: node.id !== '' ? 'pointer' : 'auto',
                    pointerEvents: 'auto'
                }}
                onClick={(e) => {
                    setHover(!hover)
                    svgProps.onClick?.(e)
                }}
                ref={elRef}
            >
                {node.system && <title>{node.system}</title>}

                <circle
                    cx={node.x || 10}
                    cy={node.y || 10}
                    r={radiusOf(node)}
                    fill={node.type === 'edition' ? 'darkslategray' : node.type === 'unicum' ? '#8FB1FF' : '#9ca3af'}
                    strokeWidth={highlight ? 3 : 0}
                    stroke='black'
                    strokeDasharray={highlight ? '3 2' : undefined}
                />
                <text
                    x={node.x || 10}
                    y={node.y || 10}
                    width={40}
                    height={40}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={14}
                    fill="white"
                >
                    {node.label.includes('_') ? (
                        <tspan>
                            {node.label.split('_')[0]}
                            <tspan baselineShift='super' fontSize={9}>{node.label.split('_')[1]}</tspan>
                        </tspan>
                    ) : (
                        node.label
                    )}
                </text>

                {node.system && node.namesSystem && (
                    <text
                        x={node.x || 10}
                        y={(node.y || 10) + radiusOf(node) + 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#555"
                        stroke="white"
                        strokeWidth={3}
                        paintOrder="stroke"
                    >
                        {node.system}
                    </text>
                )}

                {node.overlayInfo && (
                    <Portal>
                        <Popover
                            open={hover}
                            anchorEl={() => elRef.current!}
                            onClose={() => setHover(false)}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                            style={{ pointerEvents: 'none' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ pointerEvents: 'auto' }}>
                                {node.overlayInfo}
                            </div>
                        </Popover>
                    </Portal>
                )}
            </g>
        </>
    )
}

interface BeliefMarkProps {
    at: Point
    path: Path
    /** How much the mark is enlarged against the drawing. */
    scale: number
}

/** The mark of the belief a derivation is held under, centred on the point given. */
const BeliefMark = ({ at, path, scale }: BeliefMarkProps) => (
    <g transform={`translate(${at.x} ${at.y}) scale(${scale})`}>
        <Arguable asSVG={{ buttonPlacement: { x: -10, y: -10 } }} path={path}>
            {null}
        </Arguable>
    </g>
)

/** How far on the screen the mark of a derivation's belief keeps from its link, clear of the balloon at rest. */
const markClearance = 16

interface LinkContainerProps {
    positionedNodes: Node[];
    links: Link[];
    /**
     * How much a mark is enlarged against the drawing: the inverse of the
     * scale the drawing is fitted at, so that a mark keeps a size one can
     * click however many generations the stemma has to fit.
     */
    markScale: number
    onVersionClick: (versionId: string) => void
}

export const LinkContainer = ({
    positionedNodes,
    links,
    markScale,
    onVersionClick,
}: LinkContainerProps) => {
    const { selection, setSelection } = useSelection()
    const { view } = useContext(EditionContext)

    return (
        <>
            {links.map((link, i) => {
                const source = positionedNodes.find(
                    node => node.id === (link.source as Node).id
                )
                const target = positionedNodes.find(
                    node => node.id === (link.target as Node).id
                )

                if (!source || !source.x || !source.y || !target || !target.x || !target.y) {
                    return null
                }

                const versionPath = view?.getPath(source.id)
                const mark = link.believed && versionPath && (
                    <BeliefMark
                        at={linkMarkAt(point(svg(source.x), svg(source.y)), point(svg(target.x), svg(target.y)), svg(markClearance * markScale))}
                        path={[...versionPath, 'basedOn', link.derivation]}
                        scale={markScale}
                    />
                )

                if (!link.principal) {
                    return (
                        <g key={`link_${i}`}>
                            <g style={{ cursor: 'pointer' }} onClick={() => onVersionClick(source.id)}>
                                <title>{`Also derived from ${target.label}, held ${link.certainty}`}</title>
                                <line
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke="#6b7280"
                                    strokeWidth={1.5}
                                    strokeDasharray="2 4"
                                />
                                <line
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke="transparent"
                                    strokeWidth={12}
                                    pointerEvents="stroke"
                                />
                            </g>
                            {mark}
                        </g>
                    )
                }

                const motivations = view?.get<Version>(source.id)?.motivations || []

                return (
                    <g key={`link_${i}`}>
                        {link.transfer && (
                            <line
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#b45309"
                                strokeWidth={2}
                                strokeDasharray="6 4"
                            >
                                <title>Transferred to another reproducing system</title>
                            </line>
                        )}
                        <SlicedBalloon
                        slices={
                            motivations.map(m => {
                                return {
                                    count: view?.linksTo(m.id).length || 0,
                                    id: m.id,
                                    selected: selection.some(s => 'id' in s && s.id === m.id),
                                    description: m.note || 'No description'
                                }
                            })
                        }
                        a={{ x: source.x, y: source.y }}
                        b={{ x: target.x, y: target.y }}
                        onSliceClick={(slice) => {
                            if (slice) {
                                const m = motivations.find(m => m.id === slice.id)
                                if (m) {
                                    onVersionClick(source.id)
                                    queueMicrotask(() => setSelection([m]))
                                }
                            } else {
                                setSelection([])
                            }
                        }}
                        />
                        {mark}
                    </g>
                )
            })}
        </>
    )
}

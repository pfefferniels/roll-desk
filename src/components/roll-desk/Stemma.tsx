import { idOf, Path, Version, VersionType } from 'linked-rolls'
import { Box, Popover, Portal } from "@mui/material";
import { useContext, useRef, useState } from "react"
import * as d3 from "d3";
import { ReactNode, SVGProps, useEffect } from "react";
import { Arguable } from './Arguable';
import { EditString } from './EditString';
import { EditionContext } from '../../providers/EditionContext';
import { Legend } from './Legend';
import { useSelection } from '../../providers/SelectionContext';
import { SlicedBalloon } from './SlicedBalloon';

interface Stemma {
    currentVersionId: string | undefined
    onClick: (versionId: string) => void
}

export const Stemma = ({ onClick, currentVersionId }: Stemma) => {
    const { edition, view } = useContext(EditionContext)
    const [nodes, setNodes] = useState<Node[]>([])
    const [links, setLinks] = useState<Link[]>([])

    const svgRef = useRef<SVGSVGElement>(null)
    const zoomLayerRef = useRef<SVGGElement>(null)
    const svgWidth = 300
    const svgHeight = 600

    useEffect(() => {
        if (!edition || !view) return

        const nodes: Node[] = []

        view.withGenerations()
            .forEach(version => {
                nodes.push({
                    id: version.id,
                    label: version.siglum,
                    type: version.type,
                    generation: version.generation,
                    overlayInfo: version.actor && (
                        <Box sx={{ p: 1 }}>
                            {version.actor && (
                                <Arguable
                                    path={['versions', edition.versions.findIndex(v => v.id === version.id), 'actor'] as const}
                                >
                                    Actor: <b>{version.actor.name}</b>
                                </Arguable>
                            )}
                        </Box>
                    )
                })
            })

        const links: Link[] = edition.versions
            .filter(v => v.basedOn !== undefined)
            .map((version) => {
                const basedOn = idOf(version.basedOn!)

                return {
                    source: nodes.find(n => n.id === version.id) || 'unknown',
                    target: nodes.find(n => n.id === basedOn) || 'unknown',
                }
            })

        setLinks(links)
        calculatePositions(nodes, links, svgWidth, svgHeight).then(setNodes)
    }, [edition?.versions, view])

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

        const xs = nodes.map(n => n.x ?? 0)
        const ys = nodes.map(n => n.y ?? 0)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const nodesWidth = maxX - minX || 1
        const nodesHeight = maxY - minY || 1

        const margin = 40
        const scale = Math.min(
            (svgWidth - 2 * margin) / nodesWidth,
            (svgHeight - 2 * margin) / nodesHeight
        )

        const midX = (minX + maxX) / 2
        const midY = (minY + maxY) / 2

        const initialTransform = d3.zoomIdentity
            .translate(svgWidth / 2, svgHeight / 2)
            .scale(scale)
            .translate(-midX, -midY)

        // apply initial “fit all nodes” transform
        svg.call(zoom.transform, initialTransform)

        return () => {
            svg.on(".zoom", null)
        }
    }, [nodes, svgWidth, svgHeight])

    return (
        <>
            <div style={{ position: 'absolute', bottom: 0, right: 0, padding: '0.5rem', zIndex: 10 }}>
                <Legend />
            </div>
            <svg
                width={svgWidth}
                height={svgHeight}
                ref={svgRef}
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
                        onChange={() => {
                            setLinks([...links])
                        }}
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
        </>
    )
}


export interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    generation: number
    radius?: number;
    type: VersionType;
    overlayInfo?: ReactNode
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    index?: number;
    motivationPath?: Path
}

export const calculatePositions = async (
    nodes: Node[],
    links: Link[],
    width: number,
    height: number,
    n: number = 300
): Promise<Node[]> => {

    const rowGap = 200; // vertical distance between generations

    // fix y position based on generation
    nodes.forEach(node => {
        const y = 50 + node.generation * rowGap;
        node.y = y;
        (node as any).fy = y;               // <- fixed y, D3 won't move it
    });

    const simulation = d3
        .forceSimulation(nodes)
        .force(
            "link",
            d3
                .forceLink(links.filter(l => l.source !== 'unknown' && l.target !== 'unknown'))
                .id((d: any) => d.id)
                .strength(0.6)
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
            d3.forceCollide<Node>(d => d.radius ?? 40)
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
                <circle
                    cx={node.x || 10}
                    cy={node.y || 10}
                    r={node.radius || (node.type === 'edition' ? 32 : 26)}
                    fill={node.type === 'edition' ? 'darkslategray' : '#8FB1FF'}
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

                {node.overlayInfo && (
                    <Portal>
                        <Popover
                            open={hover}
                            anchorEl={elRef.current}
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

interface LinkContainerProps {
    positionedNodes: Node[];
    links: Link[];
    onChange: () => void
}

export const LinkContainer = ({
    positionedNodes,
    links,
}: LinkContainerProps) => {
    const { selection } = useSelection()
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

                const motivations = view?.get<Version>(source.id)?.motivations || []

                return (
                    <SlicedBalloon
                        key={`link_${i}`}
                        slices={
                            motivations.map(m => {
                                return {
                                    count: view?.linksTo(m.id).length || 0,
                                    id: m.id,
                                    selected: selection.includes(m),
                                    description: m.note || 'No description'
                                }
                            })
                        }
                        a={{ x: source.x!, y: source.y! }}
                        b={{ x: target.x!, y: target.y! }}
                    />
                )
            })}
        </>
    )
}

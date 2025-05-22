import { AnyEditorialAssumption } from "linked-rolls";
import { useEffect, useState } from "react";
import * as d3 from "d3";
import { getHull } from "./Hull";
import { BBox, getBoundingBox } from "../../../helpers/getBoundingBox";
import { EditUnderlay } from "./EditUnderlay";
import { TextOverlay } from "./TextOverlay";
import { getBoxToBoxArrow } from "curved-arrows";

const inferencesOf = (assumption: AnyEditorialAssumption) => {
    if (!assumption.reasons) return []
    return assumption.reasons
        .filter(r => r.type === 'inference')
        .flat()
}

const traceInferences = (assumption: AnyEditorialAssumption, callback: (assumption: AnyEditorialAssumption) => void) => {
    callback(assumption)
    for (const inference of inferencesOf(assumption)) {
        const premises = inference.premises
        for (const premise of premises) {
            traceInferences(premise, callback)
        }
    }
}

const unpack = (acc: BBox[], assumption: AnyEditorialAssumption, svgEl: SVGGElement) => {
    if (assumption.type === 'edit') {
        const ids = [
            ...(assumption.insert || []).map(e => e.id),
            ...(assumption.delete || []).map(e => e.id)
        ]
        const { points } = getHull(ids, svgEl);
        const bbox = getBoundingBox(points);
        acc.push(bbox);
    }
    else if (assumption.type === 'intention') {
        const inferences = inferencesOf(assumption)
        for (const inference of inferences) {
            // get one bbox for every inference
            const premises = inference.premises
            const ids = []
            for (const premise of premises) {
                if (premise.type === 'edit') {
                    ids.push(
                        ...(premise.insert || []).map(e => e.id),
                        ...(premise.delete || []).map(e => e.id)
                    )
                }
            }

            const { points } = getHull(ids, svgEl);
            const bbox = getBoundingBox(points);
            acc.push(bbox);
        }
    }
    else if (assumption.type === 'question') {
        const inferences = inferencesOf(assumption)
        for (const inference of inferences) {
            const premises = inference.premises
            for (const premise of premises) {
                unpack(acc, premise, svgEl)
            }
        }
    }
    return acc
}

interface AllAssumptionsProps {
    assumptions: AnyEditorialAssumption[];
    svgRef: React.RefObject<SVGGElement>;
    onClick: (assumption: AnyEditorialAssumption) => void;
    svgWidth: number;
    svgHeight: number;
}

export interface Node extends d3.SimulationNodeDatum {
    id: string
    assumption: AnyEditorialAssumption;
    x: number;
    y: number;
    radius?: number;
    highlight?: boolean;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    highlight?: boolean
}

const calculateLinks = (assumption: AnyEditorialAssumption) => {
    const links: Link[] = []
    for (const inference of inferencesOf(assumption)) {
        const premises = inference.premises
        for (const premise of premises) {
            links.push({
                source: assumption.id,
                target: premise.id
            })
        }
    }
    return links
}

export const AllAssumptions = ({ assumptions, svgRef, svgWidth, svgHeight, onClick }: AllAssumptionsProps) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);

    useEffect(() => {
        if (!svgRef.current) return;

        const nodes: Node[] = assumptions.map(assumption => {
            return {
                id: assumption.id,
                assumption,
                x: 0,
                y: 0
            }
        })

        const links = assumptions
            .map(assumption => calculateLinks(assumption))
            .flat()

        for (const node of nodes) {
            const bbox = unpack([], node.assumption, svgRef.current);
            if (!bbox.length) continue

            node.x = bbox.reduce((sum, b) => sum + (b.x + b.width / 2), 0) / bbox.length;
            node.y = bbox.reduce((sum, b) => sum + (b.y + b.height / 2), 0) / bbox.length;

            // edits and conjectures should always remain in the same place
            if (['edit', 'conjecture'].includes(node.assumption.type)) {
                node.fx = node.x
                node.fy = node.y
            }
        }

        const simulation = d3
            .forceSimulation(nodes)
            .force("position", d3
                .forceY((d: any) => {
                    if (d.assumption.type === 'intention') {
                        return svgHeight / 4
                    }
                    else if (d.assumption.type === 'question') {
                        return svgHeight / 2
                    }
                    return 0
                })
                .strength(0.2))
            .force("charge", d3.forceManyBody())
            .force("collide", d3.forceCollide<Node>(d => {
                if (d.radius) return d.radius;
                if (d.assumption.type === 'intention') return 50;
                if (d.assumption.type === 'question') return 70;
                return 5;
            }).strength(0.4))

        simulation.restart();
        for (let i = 0; i < 1000; i++) {
            simulation.tick();
        }

        simulation.stop();

        setNodes(nodes);
        setLinks(links);
    }, [assumptions, svgRef, svgWidth, svgHeight]);

    const arrows = links.map((link, i) => {
        const startX = nodes.find(n => n.id === link.source)?.x
        const startY = nodes.find(n => n.id === link.source)?.y
        const endX = nodes.find(n => n.id === link.target)?.x
        const endY = nodes.find(n => n.id === link.target)?.y
        if (!startX || !startY || !endX || !endY) return null

        const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = getBoxToBoxArrow(
            startX,
            startY,
            0,
            0,
            endX,
            endY,
            0,
            0,
            {
                padStart: 0,
                padEnd: 0,
            }
        )

        const arrowPath = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ex},${ey}`;

        return (
            <path
                key={`link_${i}`}
                stroke="black"
                strokeWidth={link.highlight ? 2 : 1}
                strokeOpacity={link.highlight ? 0.8 : 0.4}
                fill="none"
                d={arrowPath}
            />
        )
    })

    return (
        <>
            {arrows}

            {nodes.map(node => {
                if (node.assumption.type === 'edit') {
                    return (
                        <EditUnderlay
                            key={node.id}
                            assumption={node.assumption}
                            svgRef={svgRef}
                            onClick={onClick}
                            highlight={node.highlight || false}
                        />)
                }

                else if (node.assumption.type === 'intention' || node.assumption.type === 'question') {
                    return (
                        <TextOverlay
                            key={node.id}
                            assumption={node.assumption}
                            x={node.x}
                            y={node.y}
                            highlight={node.highlight || false}
                            onMouseEnter={() => {
                                traceInferences(node.assumption, (assumption) => {
                                    const node = nodes.find(n => n.assumption === assumption)
                                    if (!node) return

                                    node.highlight = true
                                    links
                                        .filter(l => l.source === node.id)
                                        .forEach(l => {
                                            l.highlight = true
                                        })
                                })
                                setNodes([...nodes])
                            }}
                            onMouseLeave={() => {
                                setNodes(prev => prev.map(n => {
                                    n.highlight = false
                                    return n
                                }))

                                setLinks(prev => prev.map(l => {
                                    l.highlight = false
                                    return l
                                }))
                            }}
                        />
                    )
                }

                return (
                    <circle
                        key={node.id}
                        cx={node.x}
                        cy={node.y}
                        r={node.radius || 20}
                        fill={'none'}
                        stroke="black"
                        strokeWidth={2}
                        onClick={() => onClick(node.assumption)}
                    />
                )
            })}
        </>
    )
}

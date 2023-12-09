import React, { useRef, useEffect, useState, useContext } from 'react';
import * as d3 from 'd3';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { getThingAll, getUrlAll, Thing, asUrl } from '@inrupt/solid-client';
import { crm, frbroo, mer } from '../../helpers/namespaces';
import './WorksGraph.css';
import { urlAsLabel } from '../../helpers/urlAsLabel';
import { RollNode } from './RollNode';
import { InterpretationNode } from './InterpretationNode';
import { useSnackbar } from '../../providers/SnackbarContext';

export interface Node extends d3.SimulationNodeDatum {
    type: 'interpretation' | 'roll'
    thing: Thing
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    relationship: string
}

interface WorksGraphProps {
}

const WorksGraph: React.FC<WorksGraphProps> = () => {
    const { setMessage } = useSnackbar()
    const { solidDataset: worksDataset } = useContext(DatasetContext)

    const [nodes, setNodes] = useState<Node[]>([])

    const ref = useRef<SVGSVGElement | null>(null);

    const [width, height] = [1200, 800]

    useEffect(() => {
        if (!ref.current || !worksDataset) return;

        const svg = d3.select(ref.current);
        const g = svg.select('#nodes')

        const nodes_ = getThingAll(worksDataset)
            .filter(thing => {
                const types = getUrlAll(thing, crm('P2_has_type'))

                return (
                    types.includes(mer('Roll')) ||
                    types.includes(mer('Interpretation'))
                )
            })
            .map(thing => ({
                thing,
                type: getUrlAll(thing, crm('P2_has_type')).includes(mer('Roll'))
                    ? 'roll'
                    : 'interpretation'
            }) as Node)

        const linkingProperties = [frbroo('R2_is_derivative_of')]

        const links_: Link[] = []
        for (const source of nodes_) {
            for (const property of linkingProperties) {
                const targetUrls = getUrlAll(source.thing, property)
                for (const targetUrl of targetUrls) {
                    const target = nodes_.find(node => asUrl(node.thing) === targetUrl);
                    if (target) {
                        const relationship = urlAsLabel(property) || '(unknown)'
                        links_.push({ source, target, relationship })
                    }
                }
            }
        }

        // Define the zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4]) // This control how much you can unzoom (x0.1) and zoom (x4)
            .on("zoom", ({ transform }: any) => {
                g.attr("transform", transform)
            }) as any

        svg.call(zoom)

        setMessage('Rendering graph ...')
        d3.forceSimulation(nodes_ as d3.SimulationNodeDatum[])
            .force("link", d3.forceLink()
                .id(function (d) { return d.index!; })
                .links(links_)
            )
            .force("charge", d3.forceManyBody().strength(-20))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide(d => {
                const datum = d as Node
                if (datum.type === 'roll') return 100
                else if (datum.type === 'interpretation') return 80
                return 0 
            }))
            .on('end', () => {
                setMessage('Done rendering.')
                setNodes(nodes_)
            })
    }, [worksDataset, width, height, setMessage])

    return (
        <div>
            <svg ref={ref} width={width} height={height}>
                <g id='nodes'>
                    {nodes.map(((node, i) => (
                        <g key={`node_${i}`}>
                            {node.type === 'roll'
                                ? <RollNode x={node.x!} y={node.y!} thing={node.thing} />
                                : <InterpretationNode x={node.x!} y={node.y!} thing={node.thing} />
                            }
                        </g>
                    )))}
                </g>
            </svg>
        </div>
    );
};

export default WorksGraph;

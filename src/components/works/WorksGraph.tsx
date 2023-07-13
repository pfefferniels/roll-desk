import React, { useRef, useEffect, useState, useContext, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { getThingAll, getUrlAll, getStringNoLocale, Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { crm } from '../../helpers/namespaces';
import { NodeDetails } from './NodeDetails';
import './WorksGraph.css';
import { urlAsLabel } from '../../helpers/urlAsLabel';

export interface Node extends d3.SimulationNodeDatum {
    thing: Thing
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    relationship: string
}

interface WorksGraphProps {
}

const WorksGraph: React.FC<WorksGraphProps> = () => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const { solidDataset: worksDataset } = useContext(DatasetContext)

    const ref = useRef<SVGSVGElement | null>(null);

    const [width, height] = [800, 800]

    const nodes = worksDataset ? getThingAll(worksDataset).map(thing => ({ thing } as Node)) : []

    const linkingProperties =
        [crm('R2_is_derivative_of'),
        crm('R12_is_realized_in'),
        crm('R10_has_member'),
        crm('P67_refers_to'),
        crm('P9_consists_of')]

    const links: Link[] = []
    for (const source of nodes) {
        for (const property of linkingProperties) {
            const targetUrls = getUrlAll(source.thing, property)
            for (const targetUrl of targetUrls) {
                const target = nodes.find(node => asUrl(node.thing) === targetUrl);
                if (target) {
                    const relationship = urlAsLabel(property) || '(unknown)'
                    links.push({ source, target, relationship  })
                }
            }

        }
    }

    useEffect(() => {
        if (!ref.current) return;

        const svg = d3.select(ref.current);
        svg.selectAll('*').remove();

        const g = svg.append('g');

        // Initialize the links
        var link = g
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .style("stroke", "#aaa")

        // Initialize the nodes
        const node = g
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g');

        node
            .append('path')
            .attr('class', 'node-symbol')
            .attr('d', (node) => {
                const rdfTypes = getUrlAll(node.thing, RDF.type)

                if (rdfTypes.includes('Work')) {
                    return d3.symbol().type(d3.symbolSquare).size(400)();
                } else {
                    return d3.symbol().type(d3.symbolCircle).size(400)();
                }
            })
            .style('fill', '#69b3a2');

        node
            .append('text')
            .attr('class', 'node-label')
            .text((node) => {
                return getStringNoLocale(node.thing, RDFS.label) ||
                    urlAsLabel(getUrl(node.thing, crm('P2_has_type'))) ||
                    urlAsLabel(getUrl(node.thing, RDF.type)) ||
                    '(unknown)'
            })
            .attr('dx', -10)
            .attr('dy', 5)
            .style('font-size', '14px')
            .style('fill', 'black');

        node.on('click', (_, d) => setSelectedNode(d))
            .on('mouseover', function (_) {
                d3.select(this).select('.node-symbol').classed('node-symbol-hover', true);
                d3.select(this).select('.node-label').classed('node-label-hover', true);
            })
            .on('mouseout', function (_) {
                d3.select(this).select('.node-symbol').classed('node-symbol-hover', false);
                d3.select(this).select('.node-label').classed('node-label-hover', false);
            });

        // Label the links
        const linkText = g
            .selectAll(".link-label")
            .data(links)
            .enter()
            .append("text")
            .attr("class", "link-label")
            .text((link) => link.relationship)
            .style("font-size", "12px")
            .style("fill", "black");

        // Define the zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4]) // This control how much you can unzoom (x0.1) and zoom (x4)
            .translateExtent([[-100, -100], [width + 90, height + 100]])
            .on("zoom", zoomed) as any;

        svg.call(zoom); // Apply zoom behavior to the svg

        function zoomed({ transform }: any) { // Destructuring transform from the event
            g.attr("transform", transform); // Apply new transform attribute to the 'g' element
        }

        d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force("link", d3.forceLink()
                .id(function (d) { return d.index!; })
                .links(links)
            )
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .on('tick', () => {
                link
                    .attr("x1", (d) => { return (d.source as Node).x!; })
                    .attr("y1", (d) => { return (d.source as Node).y!; })
                    .attr("x2", (d) => { return (d.target as Node).x!; })
                    .attr("y2", (d) => { return (d.target as Node).y!; });

                linkText
                    .attr("x", (d) => { return ((d.source as Node).x! + (d.target as Node).x!) / 2; })
                    .attr("y", (d) => { return ((d.source as Node).y! + (d.target as Node).y!) / 2; });

                node.attr('transform', (node: Node) => {
                    return 'translate(' + (node.x || 0) + ',' + (node.y || 0) + ')';
                });
            });
    }, [worksDataset])

    return (
        <div>
            <svg ref={ref} width={1000} height={600} />

            {selectedNode && (
                <NodeDetails
                    node={selectedNode.thing}
                    onClose={() => setSelectedNode(null)}
                />
            )}
        </div>
    );
};

export default WorksGraph;

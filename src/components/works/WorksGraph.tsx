import React, { useRef, useEffect, useState, useContext } from 'react';
import * as d3 from 'd3';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { getThingAll, getUrlAll, getStringNoLocale, Thing, asUrl, getUrl } from '@inrupt/solid-client';
import { RDF, RDFS } from '@inrupt/vocab-common-rdf';
import { crm, crmdig, frbroo, mer, oa } from '../../helpers/namespaces';
import { NodeDetails } from './details/NodeDetails';
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

    // be default, do not display certain nodes
    const nodes = worksDataset ? getThingAll(worksDataset)
        .filter(thing => {
            const types = getUrlAll(thing, RDF.type)

            return (
                !types.includes(oa('Annotation')) &&
                !types.includes(frbroo('F28_Expression_Creation')) &&
                !types.includes(crmdig('D10_Software_Execution')) &&
                !types.includes(frbroo('F17_Aggregation_Work')) &&
                !types.includes(mer('Range'))
            )
        })
        .map(thing => ({ thing } as Node)) : []

    const linkingProperties =
        [frbroo('R2_is_derivative_of'),
        frbroo('R3_is_realised_in'),
        frbroo('R12_is_realised_in'),
        frbroo('R12i_realises'),
        frbroo('R10_has_member'),
        frbroo('R17_created'),
        frbroo('R19_created_a_realisation_of'),
        crm('P16_used_specific_object'),
        crm('P67_refers_to'),
        crm('P9_consists_of'),
        crm('P31_has_modified'),
        mer('has_score'),
        mer('has_recording')]

    const links: Link[] = []
    for (const source of nodes) {
        for (const property of linkingProperties) {
            const targetUrls = getUrlAll(source.thing, property)
            for (const targetUrl of targetUrls) {
                const target = nodes.find(node => asUrl(node.thing) === targetUrl);
                if (target) {
                    const relationship = urlAsLabel(property) || '(unknown)'
                    links.push({ source, target, relationship })
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
            .append('circle')
            .attr('class', 'node-symbol')
            .attr('r', (node) => {
                const rdfTypes = getUrlAll(node.thing, RDF.type)
                const crmTypes = getUrlAll(node.thing, crm('P2_has_type'))

                if (rdfTypes.includes(frbroo('F21_Recording_Work')) ||
                    crmTypes.includes(mer('ScoreWork')))
                    return 30
                else if (rdfTypes.includes(crm('E13_Attribute_Assignment'))) {
                    return 5
                }
                return 15
            })
            .style('fill', (node) => {
                const rdfTypes = getUrlAll(node.thing, RDF.type)
                const crmTypes = getUrlAll(node.thing, crm('P2_has_type'))

                if (rdfTypes.includes(frbroo('F21_Recording_Work'))) return '#69b3a2'
                else if (crmTypes.includes(mer('ScoreWork'))) return 'orange'
                return 'lightgray'
            })
            .style('fill-opacity', '1');

        node
            .append('text')
            .attr('class', 'node-label')
            .text((node) => {
                if (getUrlAll(node.thing, RDF.type).includes(crm('E13_Attribute_Assignment')))
                    return ''
                return (
                    getStringNoLocale(node.thing, crm('P102_has_title')) ||
                    getStringNoLocale(node.thing, RDFS.label) ||
                    urlAsLabel(getUrl(node.thing, crm('P2_has_type'))) ||
                    urlAsLabel(getUrl(node.thing, RDF.type)) ||
                    '(unknown)'
                )
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

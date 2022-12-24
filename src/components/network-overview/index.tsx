import { useEffect } from "react";
import Graph from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { DatasetProvider, useDataset, useSession } from "@inrupt/solid-ui-react";
import { getThingAll, getUrl } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";

export const LoadGraph = () => {
    const loadGraph = useLoadGraph()
    const { dataset } = useDataset()

    useEffect(() => {
        const graph = new Graph();

        // load things from the linked early records dataset 
        if (dataset) {
            const allThings = getThingAll(dataset)
            allThings.forEach((thing, i) => {
                graph.addNode(thing.url, {
                    x: i,
                    y: i,
                    size: 20,
                    label: getUrl(thing, RDF.type) || 'unknown',
                    color: '#FA4F40'
                })
            })
        }

        loadGraph(graph);
    }, [loadGraph, dataset]);

    return null;
};

export const NetworkOverview = () => {
    const { session } = useSession()

    if (!session.info.isLoggedIn) return <span>You must be logged in</span>

    return (
        <DatasetProvider datasetUrl="https://pfefferniels.inrupt.net/notes/test.ttl">
            <SigmaContainer style={{ height: "900px", width: "900px" }}>
                <LoadGraph />
            </SigmaContainer>
        </DatasetProvider>
    );
};


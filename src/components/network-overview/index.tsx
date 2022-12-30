import { useEffect, useState } from "react";
import Graph from "graphology";
import { ControlsContainer, SearchControl, SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { DatasetProvider, Table, Text, useDataset, useSession } from "@inrupt/solid-ui-react";
import { getThingAll, getUrl } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material";
import { Add, Save } from "@mui/icons-material";
import GraphEventsController from "./GraphEventsController";
import { AddDigitalObjects } from "./AddDigitalObjects";
import { DetailsPanel } from "./DetailsPanel";

export const LoadGraph = () => {
    const loadGraph = useLoadGraph()
    const { dataset } = useDataset()

    useEffect(() => {
        if (!dataset) return
        const graph = new Graph();

        // load things from the linked early records dataset 
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

        loadGraph(graph);
    }, [loadGraph, dataset]);

    return null;
};

export const NetworkOverview = () => {
    const { session } = useSession()

    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [selectedThing, setSelectedThing] = useState<string | null>(null)

    const openAddDialog = () => {
        setAddDialogOpen(true)
    }

    const actions = [
        { icon: <Save />, name: 'Save' },
        { icon: <Add />, name: 'Upload files', action: openAddDialog },
    ];

    if (!session.info.isLoggedIn) return <span>You must be logged in</span>

    return (
        <>
            <SigmaContainer style={{ height: "500px", width: "900px" }}>
                <LoadGraph />
                <ControlsContainer position='top-left'>
                    <SearchControl />
                </ControlsContainer>
                <GraphEventsController setSelectedThing={setSelectedThing} />

                <div className='panels'>
                    {selectedThing && <DetailsPanel node={selectedThing} />}
                </div>
            </SigmaContainer>

            <SpeedDial
                ariaLabel="add work"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                icon={<SpeedDialIcon />}
            >
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={action.action}
                    />
                ))}
            </SpeedDial>

            <AddDigitalObjects open={addDialogOpen} setOpen={setAddDialogOpen} />
        </>
    );
};


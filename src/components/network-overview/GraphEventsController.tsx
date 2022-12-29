import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { FC, useEffect } from "react";

function getMouseLayer() {
  return document.querySelector(".sigma-mouse");
}

interface GraphEventsControllerProps {
    setSelectedThing: (node: string | null) => void
    children?: React.ReactNode
}

const GraphEventsController = ({setSelectedThing, children }: GraphEventsControllerProps) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const registerEvents = useRegisterEvents();

  /**
   * Initialize here settings that require to know the graph and/or the sigma
   * instance:
   */
  useEffect(() => {
    registerEvents({
      clickNode({ node }) {
          setSelectedThing(node)
      }
    });
  }, []);

  return <>{children}</>;
};

export default GraphEventsController;

import React from "react";
import { AlignedPerformance } from "../lib/AlignedPerformance";

const GlobalContext = React.createContext({
    alignedPerformance: new AlignedPerformance(),
    alignmentReady: 0,
    triggerUpdate: () => {}
})

export default GlobalContext
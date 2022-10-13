import React from "react";
import { AlignedPerformance } from "../lib/AlignedPerformance";

export const GlobalContext = React.createContext({
    alignedPerformance: new AlignedPerformance(),
    alignmentReady: 0,
    triggerUpdate: () => {}
})


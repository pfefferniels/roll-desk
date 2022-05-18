import React from "react";
import { AlignedPerformance } from "../lib/AlignedPerformance";
import { RawPerformance } from "../lib/Performance";
import { Score } from "../lib/Score";

const GlobalContext = React.createContext({
    alignedPerformance: new AlignedPerformance(),
    alignmentReady: 0,
    triggerUpdate: () => {}
})

export default GlobalContext
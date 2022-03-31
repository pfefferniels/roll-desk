import { useContext } from "react"
import { Interpolation } from "../lib/Export"
import GlobalContext from "./GlobalContext"
import { parse } from "js2xmlparser"

export default function InterpolationEditor() {
    const { alignedPerformance, alignmentReady} = useContext(GlobalContext)

    return (
        <div>
            { alignmentReady ? <p>ready</p> : <p>not yet ready</p>}
            <pre>
                <code>
                    { parse("test", new Interpolation(alignedPerformance, false).exportMPM('my performance', 720, 20)) }
                </code>
            </pre>
        </div>
    )
}

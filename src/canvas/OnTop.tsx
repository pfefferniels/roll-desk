import { createContext, ReactNode, useContext } from "react"
import { createPortal } from "react-dom"

/** The layer of the canvas drawn after everything else, once it is in the document. */
export const TopLayer = createContext<SVGGElement | null>(null)

/**
 * Draws its children in the canvas's top layer, over the roll, the
 * selection and the ruler alike, in the same units as the roll.
 */
export const OnTop = ({ children }: { children: ReactNode }) => {
    const layer = useContext(TopLayer)
    return layer ? createPortal(children, layer) : children
}

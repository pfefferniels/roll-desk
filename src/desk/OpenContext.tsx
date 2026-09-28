import { createContext } from "react"

/** Opens on the desk whatever the id names, and turns to where it is read. */
export const OpenContext = createContext<(id: string) => void>(() => { })

import { SolidDataset, Thing } from "@inrupt/solid-client"
import { DatasetContext, ThingContext } from "@inrupt/solid-ui-react"
import { useState, useEffect } from "react"

interface DatasetProviderProps {
    dataset: SolidDataset
    thing: Thing
    children: React.ReactNode
}

/**
 * This component provides both a `DatasetContext` and 
 * a `ThingContext` for a given dataset and thing.
 * Other than the respective component of the solid-ui-react
 * library at also provides the setters for both.
 */
export const DatasetProvider = ({ dataset, thing: thing_, children }: DatasetProviderProps) => {
    const [solidDataset, setDataset] = useState<SolidDataset>(dataset)
    const [thing, setThing] = useState<Thing>(thing_)

    useEffect(() => setThing(thing), [thing])
    useEffect(() => setDataset(dataset), [dataset])

    return (
        <DatasetContext.Provider value={{
            solidDataset, setDataset
        }}>
            <ThingContext.Provider value={{ thing, setThing }}>
                {children}
            </ThingContext.Provider>
        </DatasetContext.Provider>
    )
}
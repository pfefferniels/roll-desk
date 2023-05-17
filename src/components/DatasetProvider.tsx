import { SolidDataset, Thing, getSolidDataset, getThing, thingAsMarkdown } from "@inrupt/solid-client"
import { DatasetContext, ThingContext, useSession } from "@inrupt/solid-ui-react"
import { useState, useEffect } from "react"
import { datasetUrl } from "../helpers/datasetUrl"

interface DatasetProviderProps {
    datasetName: string
    children: React.ReactNode
}

/**
 * This component checks for a given resource in both the 
 * public as well as the private pod and provides this
 * dataset to the user.
 * 
 * @prop datasetName specifies the name of the dataset in
 * which the entity is being searched
 */
export const DatasetProvider = ({ datasetName, children }: DatasetProviderProps) => {
    const { session } = useSession()

    const [solidDataset, setDataset] = useState<SolidDataset>()
    const [thing, setThing] = useState<Thing>()

    useEffect(() => {
        const entityUrl = `https://measuring-early-records.org${window.location.pathname}`

        const fetchDataset = async (datasetUrl: string) => {
            console.log('fetching', datasetUrl)
            try {
                const publicDataset = await getSolidDataset(datasetUrl, { fetch: session.fetch as any })
                const thing = getThing(publicDataset, entityUrl)

                if (thing) {
                    console.log(entityUrl, 'in', datasetUrl, '=', thingAsMarkdown(thing))

                    setThing(thing)
                    setDataset(publicDataset)
                }
                else {
                    console.log('thing', entityUrl, 'not found in dataset', datasetUrl)
                }
            }
            catch (e) {
                console.error(e)
            }
        }

        // try to find the given resource in both, personal and public dataset
        fetchDataset(`${datasetUrl}/${datasetName}`)
        // fetchDataset('personal-dataset.solid-community.org/works.ttl')
    }, [datasetName, children, session.fetch, session, session.info.isLoggedIn])

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
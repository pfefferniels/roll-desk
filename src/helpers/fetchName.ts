import { getStringNoLocale, getThing, getWebIdDataset, UrlString } from "@inrupt/solid-client"
import { FOAF } from "@inrupt/vocab-common-rdf"

export const fetchName = async (profileUrl: UrlString) => {
    const profile = await getWebIdDataset(profileUrl)
    const profileThing = getThing(profile, profileUrl)
    if (!profileThing) return null
    return getStringNoLocale(profileThing, FOAF.name) 
}

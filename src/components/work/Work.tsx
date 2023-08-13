import { Checkbox, CircularProgress, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack } from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2/Grid2"
import { useEffect, useState } from "react"
import { ScoreViewer } from "../score/ScoreViewer"
import { Thing, UrlString, asUrl, getFile, getSolidDataset, getStringNoLocale, getThing, getThingAll, getUrl, getUrlAll, thingAsMarkdown } from "@inrupt/solid-client"
import { useDataset, useSession, useThing } from "@inrupt/solid-ui-react"
import { crm, crmdig, frbroo, mer } from "../../helpers/namespaces"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { Mei } from "../../lib/mei"
import { loadDomParser, loadVerovio } from "../../lib/globals"

interface WorkProps {
    url: string
}

interface Analysis {
    url: UrlString
    title: string
    annotations: Thing[]
    alignments: Thing[]
    mpm: string
    mei: Mei
}

export const Work = ({ url }: WorkProps) => {
    const { session } = useSession()

    const { dataset: workDataset } = useDataset(url, { fetch: session.fetch as any })
    const { thing: work } = useThing(url, url, { fetch: session.fetch as any })

    const [availableMPMs, setAvailableMPMs] = useState<Thing[]>([])
    const [availableAnalyses, setAvailableAnalyses] = useState<Thing[]>([])

    const [selectedAnalyses, setSelectedAnalyses] = useState<Analysis[]>([]);

    const handleToggleAnalysis = (analysis: Thing) => async () => {
        const currentIndex = selectedAnalyses.findIndex(a => a.url === asUrl(analysis))
        const newChecked = [...selectedAnalyses];

        if (currentIndex === -1) {
            const url = analysis.url
            const title = getStringNoLocale(analysis, crm('P3_has_note')) || 'no title'

            const analysisDataset = await getSolidDataset(url, { fetch: session.fetch as any })
            const annotations = getUrlAll(analysis, crm('P9_consists_of'))
                .map(annotationUrl => {
                    return getThing(analysisDataset, annotationUrl)
                })
                .filter(thing => thing !== null) as Thing[]

            let mpm: string | null = null
            let mei: Mei | null = null
            let alignments: Thing[] = []

            for (const availableMPM of availableMPMs) {
                const mpmContents = await getFile(getUrl(availableMPM, RDFS.label) || '', { fetch: session.fetch as any })
                if (!mpmContents) continue

                mpm = await mpmContents.text()

                const creationUrl = getUrl(availableMPM, frbroo('R17i_was_created_by'))
                if (!creationUrl) return

                const mpmDataset = await getSolidDataset(creationUrl, { fetch: session.fetch as any })
                const creation = getThing(mpmDataset, creationUrl)
                if (!creation) return

                const componentUrls = getUrlAll(creation, crm('P9_consists_of'))
                for (const componentUrl of componentUrls) {
                    const component = getThing(mpmDataset, componentUrl)
                    if (!component) continue

                    const alignmentUrl = getUrl(component, crmdig('L10_had_input'))
                    if (!alignmentUrl) continue

                    const alignmentDataset = await getSolidDataset(alignmentUrl, { fetch: session.fetch as any })
                    const alignment = getThing(alignmentDataset, alignmentUrl)
                    if (!alignment) continue

                    alignments = getUrlAll(alignment, crm('P9_consists_of'))
                        .map(pairUrl => {
                            return getThing(alignmentDataset, pairUrl)
                        })
                        .filter(thing => thing !== null) as Thing[]

                    const scoreUrl_ = getUrl(alignment, mer('has_score'))
                    if (!scoreUrl_) continue

                    const scoreDataset = await getSolidDataset(scoreUrl_, { fetch: session.fetch as any })
                    const score = getThing(scoreDataset, scoreUrl_)
                    if (!score) continue

                    const label = getUrl(score, RDFS.label)
                    if (label) {
                        const meiContents = await getFile(label, { fetch: session.fetch as any })
                        if (!meiContents) continue

                        mei = new Mei(await meiContents.text(), await loadVerovio(), await loadDomParser())

                        break;
                    }
                }
            }

            if (mpm && mei && alignments.length) {
                newChecked.push({
                    url,
                    title,
                    annotations,
                    alignments,
                    mpm,
                    mei,
                })

            }
        }
        else {
            newChecked.splice(currentIndex, 1);
        }

        setSelectedAnalyses(newChecked);
    }

    const title = work && getStringNoLocale(work, RDFS.label)

    const handleAddAnalysisUrl = () => {

    }

    useEffect(() => {
        const fetchAnalyses = async () => {
            if (!workDataset || !work) return

            const aggregationWorks = getThingAll(workDataset)
                .filter(thing =>
                    getUrlAll(thing, RDF.type).includes(frbroo('F17_Aggregation_Work')))

            let aggregationWork
            for (const aggregation of aggregationWorks) {
                const referredWorkUrl = getUrl(aggregation, frbroo('R2_is_derivative_of'))

                if (referredWorkUrl === asUrl(work)) {
                    aggregationWork = aggregation
                    break
                }
            }

            if (!aggregationWork) return

            const analysisUrls = getUrlAll(aggregationWork, frbroo('R3_is_realised_in'))
            const analysisThings = []
            for (const analysisUrl of analysisUrls) {
                const analysisDataset = await getSolidDataset(analysisUrl, { fetch: session.fetch as any })
                const analysis = getThing(analysisDataset, analysisUrl)
                if (analysis) analysisThings.push(analysis)
            }
            setAvailableAnalyses(analysisThings)
        }

        const fetchMPMs = async () => {
            if (!work) return

            const realisationUrls = getUrlAll(work, frbroo('R12_is_realised_in'))
            const expressions = []
            for (const url of realisationUrls) {
                const dataset = await getSolidDataset(url, { fetch: session.fetch as any })
                const expression = getThing(dataset, url)
                if (!expression) continue

                if (getUrl(expression, crm('P2_has_type')) === mer('MPM')) {
                    expressions.push(expression)
                }
            }
            setAvailableMPMs(expressions)
        }

        fetchMPMs()
        fetchAnalyses()
    }, [session.fetch, work, workDataset])

    useEffect(() => {
        // find fitting MPM

    }, [selectedAnalyses])

    return (
        <Grid2 container>
            <Grid2 xs={12}>
                <b>{title || <CircularProgress />}</b>
            </Grid2>
            <Grid2 xs={12}>
                <Stack direction='row' spacing={2}>
                    {availableAnalyses?.map((analysis, i) => (
                        <ListItem key={`analysis_${asUrl(analysis)}`}>
                            <ListItemButton role={undefined} onClick={handleToggleAnalysis(analysis)} dense>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={selectedAnalyses.findIndex(a => a.url === asUrl(analysis)) !== -1}
                                        tabIndex={-1}
                                        disableRipple
                                        inputProps={{ 'aria-labelledby': `checkbox_${i}` }}
                                    />
                                </ListItemIcon>
                                <ListItemText id={`checkbox_${i}`}
                                    secondary={getStringNoLocale(analysis, crm('P3_has_note')) || '[no note]'}>
                                    Analysis {i + 1}
                                </ListItemText>
                            </ListItemButton>
                        </ListItem>
                    ))}
                </Stack>
            </Grid2>

            <Grid2 xs={12}>
                {selectedAnalyses.length > 0 && (
                    <>
                        <ScoreViewer mei={selectedAnalyses[0].mei.asString()} landscape />
                        {selectedAnalyses.map((analysis) => analysis.annotations).flat().map(annotation => {
                            return (
                                <div key={`annotation_${asUrl(annotation)}`}>
                                    {thingAsMarkdown(annotation)}
                                </div>
                            )
                        })}
                    </>
                )}
            </Grid2>
        </Grid2>
    )
}
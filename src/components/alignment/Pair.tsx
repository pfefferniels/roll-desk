import { Thing, getUrl } from "@inrupt/solid-client"
import { Card, CardContent } from "@mui/material"
import { oa } from "../../helpers/namespaces"
import { urlAsLabel } from "../../helpers/urlAsLabel"

interface PairCardProps {
    pair: Thing
}

export const Pair = ({ pair }: PairCardProps) => {
    const scoreId = urlAsLabel(getUrl(pair, oa('hasTarget'))) || 'unknown'
    const midiId = urlAsLabel(getUrl(pair, oa('hasBody'))) || 'unknown'

    const highlight = (id: string) => {
        const el = document.querySelector(`*[data-id="${id}"]`)

        console.log(el)

        if (!el) return
        el.setAttribute('fill', 'red')
        el.querySelector('path')?.setAttribute('fill', 'red')
    }

    return (
        <Card style={{ marginBottom: 2 }}>
            <CardContent>
                <div onMouseOver={() => {
                    highlight(scoreId)
                    highlight(midiId)
                }}>
                    <div style={{ float: 'left' }}>
                        {scoreId}
                    </div>
                    <div style={{ float: 'right' }}>
                        {midiId}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


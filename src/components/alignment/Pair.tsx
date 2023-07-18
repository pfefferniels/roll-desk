import { Thing, getUrl } from "@inrupt/solid-client"
import { Card, CardContent } from "@mui/material"
import { oa } from "../../helpers/namespaces"
import { urlAsLabel } from "../../helpers/urlAsLabel"

interface PairCardProps {
    pair: Thing
}

export const Pair = ({ pair }: PairCardProps) => {
    return (
        <Card style={{ marginBottom: 2 }}>
            <CardContent>
                <div style={{ float: 'left' }}>{urlAsLabel(getUrl(pair, oa('hasTarget'))) || 'unknown'}</div>
                <div style={{ float: 'right' }}>
                    {urlAsLabel(getUrl(pair, oa('hasBody')))}
                </div>
            </CardContent>
        </Card>
    )
}


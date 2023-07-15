import { Card, CardContent, CardActions, Typography, IconButton } from "@mui/material";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import { Thing, asUrl, getInteger, getSolidDataset, getStringNoLocale, getThing, getUrl, isThing } from "@inrupt/solid-client";
import { useSession } from "@inrupt/solid-ui-react";
import { useState, useEffect } from "react";
import { crm, mer } from "../../helpers/namespaces";
import { urlAsLabel } from "../../helpers/urlAsLabel";
import { CommentOutlined, DeleteOutlined } from "@mui/icons-material";
import { CommentDialog } from "./CommentDialog";

interface E13CardProps {
    e13: Thing;
}

export const E13Card = ({ e13 }: E13CardProps) => {
    const { session } = useSession()

    const [commentDialogOpen, setCommentDialogOpen] = useState(false)
    const [assigned, setAssigned] = useState<number | Thing>()

    const note = getStringNoLocale(e13, crm('P3_has_note')) || 'No note available.';

    const remove = async () => {

    }

    useEffect(() => {
        const fetchRange = async (url: string) => {
            const dataset = await getSolidDataset(url, { fetch: session.fetch as any })
            if (!dataset) return

            const rangeThing = getThing(dataset, url)
            rangeThing && setAssigned(rangeThing)
        }

        const asNumber = getInteger(e13, crm('P141_assigned'))
        if (asNumber) {
            setAssigned(asNumber)
            return
        }

        const url = getUrl(e13, crm('P141_assigned'))
        url && fetchRange(url)
    }, [e13, session.fetch])

    const assignedLabel = isThing(assigned)
        ? `${getInteger(assigned, mer('min'))}-${getInteger(assigned, mer('mean'))}-${getInteger(assigned, mer('max'))}`
        : `${assigned}`

    return (
        <>
            <CommentDialog
                thing={e13}
                open={commentDialogOpen}
                onClose={() => setCommentDialogOpen(false)} />

            <Card sx={{ margin: '0' }}>
                <CardContent style={{ float: 'left' }}>
                    <Typography>
                        {urlAsLabel(getUrl(e13, crm('P177_assigned_property_of_type')))} → {assignedLabel}
                    </Typography>
                </CardContent>

                <CardActions style={{ float: 'right' }}>
                    <IconButton
                        onClick={() => window.open(asUrl(e13))}
                        style={{ padding: '2px' }}>
                        <LinkOutlined />
                    </IconButton>
                    <IconButton
                        onClick={() => setCommentDialogOpen(true)}
                        style={{ padding: '2px' }}>
                        <CommentOutlined />
                    </IconButton>
                    <IconButton
                        onClick={() => remove()}
                        style={{ padding: '2px' }}>
                        <DeleteOutlined />
                    </IconButton>
                </CardActions>
            </Card>
        </>
    );
}

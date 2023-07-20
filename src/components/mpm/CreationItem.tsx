import { Thing, asUrl } from "@inrupt/solid-client"
import { LinkOutlined } from "@mui/icons-material"
import { Card, IconButton } from "@mui/material"

interface CreationItemProps {
    item: Thing
}

export const CreationItem = ({ item }: CreationItemProps) => {
    return (
        <Card>
            <IconButton onClick={() => window.open(asUrl(item))}>
                <LinkOutlined />
            </IconButton>
        </Card>
    )
}
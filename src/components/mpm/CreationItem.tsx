import { Thing, asUrl, getStringNoLocale } from "@inrupt/solid-client"
import { LinkOutlined } from "@mui/icons-material"
import { Card, IconButton } from "@mui/material"
import { crmdig } from "../../helpers/namespaces"

interface CreationItemProps {
    item: Thing
}

export const CreationItem = ({ item }: CreationItemProps) => {
    return (
        <Card>
            <IconButton onClick={() => window.open(asUrl(item))}>
                <LinkOutlined />
            </IconButton>
            {getStringNoLocale(item, crmdig('L23_used_software_or_firmware'))}
        </Card>
    )
}
import { Card, CardContent, CardActions, Typography, IconButton } from "@mui/material";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import { Thing, asUrl, getStringNoLocale } from "@inrupt/solid-client";
import { oa } from "../../helpers/namespaces";
import { DeleteOutlined, EditOutlined } from "@mui/icons-material";

interface AnnotationCardProps {
    annotation: Thing;
}

export const AnnotationCard = ({ annotation }: AnnotationCardProps) => {
    return (
        <>
            <Card sx={{ margin: '0' }}>
                <CardContent style={{ float: 'left' }}>
                    <Typography>
                        {getStringNoLocale(annotation, oa('hasBody'))}
                    </Typography>
                </CardContent>

                <CardActions style={{ float: 'right' }}>
                    <IconButton
                        onClick={() => window.open(asUrl(annotation))}
                        style={{ padding: '2px' }}>
                        <LinkOutlined />
                    </IconButton>
                    <IconButton
                        onClick={() => {}}
                        style={{ padding: '2px' }}>
                        <EditOutlined />
                    </IconButton>
                    <IconButton
                        onClick={() => {}}
                        style={{ padding: '2px' }}>
                        <DeleteOutlined />
                    </IconButton>
                </CardActions>
            </Card>
        </>
    );
}

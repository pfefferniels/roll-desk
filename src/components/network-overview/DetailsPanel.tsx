import { Link, useDataset } from "@inrupt/solid-ui-react";
import { getThing, getUrl } from "@inrupt/solid-client";
import { RDF } from "@inrupt/vocab-common-rdf";
import { Button, Card, CardActions, CardContent, Paper, Typography } from "@mui/material";

export const DetailsPanel = ({ node }: { node: string; }) => {
    const { dataset } = useDataset();
    if (!dataset)
        return null;

    const thing = getThing(dataset, node);
    if (!thing)
        return null;

    const typeUrl = getUrl(thing, RDF.type);
    const type = typeUrl?.substring(typeUrl?.lastIndexOf('#') + 1);

    let actions = null;
    if (type === 'Work') {
        actions = (
            <div>
                <Button variant='outlined'>Add Expression</Button>
            </div>
        );
    }
    else if (type === 'Expression') {
        actions = (
            <div>
                <Button variant='outlined'>Add MIDI</Button>
            </div>
        );
    }

    return (
        <Card className='panel'>
            <CardContent>
                <Typography variant='h5'>Details</Typography>
                <Typography component='div'>
                    <Link thing={thing} property={RDF.type} />
                </Typography>
            </CardContent>
            <CardActions>
                {actions}
            </CardActions>
        </Card>
    );
};

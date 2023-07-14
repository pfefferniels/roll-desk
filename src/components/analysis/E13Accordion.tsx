import { Thing, asUrl, getStringNoLocaleAll, getInteger, getUrl, getStringNoLocale } from "@inrupt/solid-client";
import { Accordion, AccordionSummary, AccordionDetails, Typography, IconButton } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { crm } from "../../helpers/namespaces";
import { urlAsLabel } from "../../helpers/urlAsLabel";
import { LinkOutlined } from "@mui/icons-material";

interface E13CardProps {
    e13: Thing;
}

export const E13Accordion = ({ e13 }: E13CardProps) => {
    const note = getStringNoLocale(e13, crm('P3_has_note')) || 'No note available.';

    return (
        <Accordion sx={{ margin: '0' }}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
            >
                <IconButton style={{ padding: 0, paddingRight: '0.5rem' }}>
                    <LinkOutlined />
                </IconButton>

                <Typography>
                    {urlAsLabel(getUrl(e13, crm('P177_assigned_property_of_type')))} → {getInteger(e13, crm('P141_assigned'))}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography>
                    Note: {note}
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
}

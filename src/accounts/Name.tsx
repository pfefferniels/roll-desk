import { Box, Link } from "@mui/material"
import { Named } from "linked-rolls"
import { Fragment } from "react"
import { recordAt, recordLabel, recordsOf } from "../edition/authorities"

/**
 * A name the edition gives, followed by the authority records it links,
 * each by the authority that keeps it: "Grünfeld, Alfred GND · Wikidata".
 */
export const Name = ({ named }: { named: Named }) => {
    const records = recordsOf(named)

    return (
        <>
            {named.name}
            {records.length > 0 && (
                <Box component='span' sx={{ ml: 0.75, fontSize: '0.85em', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                    {records.map((uri, at) => (
                        <Fragment key={uri}>
                            {at > 0 && ' · '}
                            <Link
                                href={uri}
                                target='_blank'
                                rel='noopener noreferrer'
                                color='text.secondary'
                                underline='hover'
                                title={recordLabel(uri)}
                                aria-label={`${named.name} in ${recordLabel(uri)}`}
                            >
                                {recordAt(uri).keeper}
                            </Link>
                        </Fragment>
                    ))}
                </Box>
            )}
        </>
    )
}

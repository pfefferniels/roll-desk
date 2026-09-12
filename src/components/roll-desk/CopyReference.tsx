import { Link as LinkIcon } from "@mui/icons-material"
import { IconButton, Tooltip } from "@mui/material"
import { useSnackbar } from "../../providers/SnackbarContext"

interface CopyReferenceProps {
    /** The IRI of what is shown, or nothing where there is nothing to cite yet. */
    reference?: string
}

/**
 * Hands the reader the IRI of what the desk shows, which is what the
 * edition is cited by and what opens the desk here again.
 */
export const CopyReference = ({ reference }: CopyReferenceProps) => {
    const { setMessage } = useSnackbar()

    const copy = async () => {
        if (!reference) return

        try {
            await navigator.clipboard.writeText(reference)
            setMessage(`Copied ${reference}`)
        }
        catch {
            // Denied, or no clipboard at all outside a secure context.
            setMessage(`Could not reach the clipboard. The reference is ${reference}`)
        }
    }

    return (
        <Tooltip title={reference ?? 'Nothing to reference yet'}>
            <span>
                <IconButton
                    size='small'
                    disabled={!reference}
                    aria-label='Copy reference'
                    onClick={() => void copy()}
                >
                    <LinkIcon />
                </IconButton>
            </span>
        </Tooltip>
    )
}

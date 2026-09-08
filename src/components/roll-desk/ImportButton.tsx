import React, { useCallback, useContext, useState } from 'react';
import { FileOpen } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { EditionView, constraintProblems } from "linked-rolls";
import { EditionContext } from '../../providers/EditionContext';
import { useSnackbar } from '../../providers/SnackbarContext';
import { problemCount } from '../../helpers/constraints';
import { CheckedDocument, importedEdition, readDocument, refusalToOpen } from '../../helpers/importEdition';
import { refusalToDrawScans } from '../../helpers/scanCalibration';

interface ImportButtonProps {
    outlined?: boolean
}

export const ImportButton = ({ outlined }: ImportButtonProps) => {
    const { setEdition } = useContext(EditionContext)
    const { setMessage } = useSnackbar()

    const [errors, setErrors] = useState<string[]>()
    const [pending, setPending] = useState<CheckedDocument['document']>()

    /**
     * Takes the document as the edition and says what it could not take
     * at face value: scans it cannot place, and constraints that fail.
     */
    const adopt = useCallback((document: CheckedDocument['document']) => {
        const imported = importedEdition(document)
        if ('refusal' in imported) {
            setMessage(imported.refusal)
            return
        }

        const edition = imported.value
        setEdition(edition)

        const count = constraintProblems(new EditionView(edition)).length
        const notices = [
            refusalToDrawScans(edition.copies),
            count > 0 ? `${problemCount(count)}, see the Constraints tab` : undefined
        ].flatMap(notice => notice ? [notice] : [])

        if (notices.length > 0) setMessage(notices.join(' '))
    }, [setEdition, setMessage])

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const refusal = refusalToOpen(file.name)
        if (refusal) {
            setMessage(refusal)
            return
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const reading = readDocument(e.target?.result as string);
            if ('refusal' in reading) {
                setMessage(reading.refusal)
                return
            }

            const { document, errors } = reading.value
            if (errors.length === 0) {
                adopt(document)
            }
            else {
                setErrors(errors)
                setPending(document)
            }
        };

        reader.readAsText(file);
    }, [adopt, setMessage]);

    /** Takes the document although the schema turns it down. The outcome is said in the snackbar. */
    const proceedAnyways = () => {
        adopt(pending)
        setPending(undefined)
        setErrors(undefined)
    }

    return (
        <>
            <input
                accept=".json,.jsonld"
                style={{ display: 'none' }}
                id="import-file"
                type="file"
                onChange={handleFileUpload}
            />
            <label htmlFor="import-file">
                {outlined
                    ? (
                        <Button
                            variant='outlined'
                            component="span"
                            startIcon={<FileOpen />}
                        >
                            Open
                        </Button>
                    )
                    : (
                        <IconButton size='small'>
                            <FileOpen />
                        </IconButton>
                    )}
            </label>

            {errors && (
                <Dialog open={true} onClose={() => setErrors(undefined)}>
                    <DialogTitle>
                        Import Error
                    </DialogTitle>
                    <DialogContent>
                        {errors.map((error, index) => (
                            <Alert key={index} severity='error'>
                                {error}
                            </Alert>
                        ))}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setErrors(undefined)} variant='outlined'>
                            Cancel
                        </Button>
                        <Button onClick={proceedAnyways} variant='outlined' color='error'>
                            Proceed Anyways
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};

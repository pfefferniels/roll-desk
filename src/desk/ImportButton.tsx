import React, { useCallback, useContext, useRef, useState } from 'react';
import { FileOpen } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { constraintProblems } from "linked-rolls";
import { EditionContext } from '../edition/EditionContext';
import { useSnackbar } from './SnackbarContext';
import { problemCount } from '../constraints/constraints';
import { CheckedDocument, importedEdition, readDocument, refusalToOpen } from '../edition/importEdition';
import { refusalToDrawScans } from '../facsimile/scanCalibration';
import { ToolButton } from './ToolButton';

interface ImportButtonProps {
    outlined?: boolean
}

export const ImportButton = ({ outlined }: ImportButtonProps) => {
    const { setEdition } = useContext(EditionContext)
    const { setMessage } = useSnackbar()

    const [errors, setErrors] = useState<string[]>()
    const [pending, setPending] = useState<CheckedDocument['document']>()
    const fileInput = useRef<HTMLInputElement>(null)

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

        const count = constraintProblems(edition).length
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

        reader.onload = async (e) => {
            const reading = await readDocument(e.target?.result as string);
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
                ref={fileInput}
                accept=".json,.jsonld"
                style={{ display: 'none' }}
                type="file"
                onChange={handleFileUpload}
            />
            {/*
              The button asks the hidden input for the file. A label around
              it would answer the pointer only, and a button inside a label
              does not even do that in every browser.
            */}
            {outlined
                ? (
                    <Button
                        variant='outlined'
                        startIcon={<FileOpen />}
                        onClick={() => fileInput.current?.click()}
                    >
                        Open
                    </Button>
                )
                : (
                    <ToolButton label='Open an edition' size='small' onClick={() => fileInput.current?.click()}>
                        <FileOpen />
                    </ToolButton>
                )}

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

import React, { useCallback, useContext, useState } from 'react';
import { FileOpen } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { EditionView, constraintProblems, importJsonLd, validate } from "linked-rolls";
import { EditionContext } from '../../providers/EditionContext';
import { useSnackbar } from '../../providers/SnackbarContext';
import { problemCount } from '../../helpers/constraints';

interface ImportButtonProps {
    outlined?: boolean
}

export const ImportButton = ({ outlined }: ImportButtonProps) => {
    const { setEdition } = useContext(EditionContext)
    const { setMessage } = useSnackbar()

    const [errors, setErrors] = useState<string[]>()
    const [pending, setPending] = useState<any>()

    /** Takes the document as the edition and says whether its constraints hold. */
    const adopt = useCallback((document: Parameters<typeof importJsonLd>[0]) => {
        const edition = importJsonLd(document)
        setEdition(edition)

        const count = constraintProblems(new EditionView(edition)).length
        if (count > 0) setMessage(`${problemCount(count)}, see the Constraints tab`)
    }, [setEdition, setMessage])

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        reader.onload = async (e) => {
            const fileContent = e.target?.result as string;

            try {
                if (fileExtension === 'json') {
                    const jsonDoc = JSON.parse(fileContent);
                    const success = validate(jsonDoc);
                    if (success) {
                        adopt(jsonDoc)
                    }
                    else {
                        setErrors((validate.errors || []).map(e => e.instancePath + " " + e.message))
                        setPending(jsonDoc)
                    }
                } else {
                    console.log("Unsupported file format. Please select a JSON file.");
                    return;
                }
            } catch (error) {
                console.error("Error importing file:", error);
            }
        };

        reader.readAsText(file);
    }, [adopt]);

    return (
        <>
            <input
                accept=".xml, .json"
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
                        <Button onClick={() => {
                            adopt(pending)
                            setPending(undefined)
                        }} variant='outlined' color='error'>
                            Proceed Anyways
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};

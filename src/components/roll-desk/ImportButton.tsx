import React, { useCallback, useContext, useState } from 'react';
import { FileOpen } from "@mui/icons-material";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { Edition, importJsonLd, validate } from "linked-rolls";
import { EditionContext } from '../../providers/EditionContext';

interface ImportButtonProps {
    outlined?: boolean
}

export const ImportButton = ({ outlined }: ImportButtonProps) => {
    const { setEdition } = useContext(EditionContext)

    const [errors, setErrors] = useState<string[]>()
    const [pending, setPending] = useState<any>()

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
                        setEdition(importJsonLd(jsonDoc))
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
    }, [setEdition]);

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
                            setEdition(importJsonLd(pending))
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

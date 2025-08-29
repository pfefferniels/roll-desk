import React, { useCallback, useContext } from 'react';
import { FileOpen } from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import { Edition, importJsonLd } from "linked-rolls";
import { EditionContext } from '../../providers/EditionContext';

interface ImportButtonProps {
    outlined?: boolean
}

export const ImportButton = ({ outlined }: ImportButtonProps) => {
    const { setEdition } = useContext(EditionContext)

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        reader.onload = async (e) => {
            const fileContent = e.target?.result as string;

            try {
                let newEdition: Edition;

                if (fileExtension === 'json') {
                    const jsonDoc = JSON.parse(fileContent);
                    newEdition = importJsonLd(jsonDoc);
                } else {
                    console.log("Unsupported file format. Please select a JSON file.");
                    return;
                }

                setEdition(newEdition)
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
        </>
    );
};

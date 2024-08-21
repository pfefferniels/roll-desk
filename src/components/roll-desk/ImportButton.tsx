import React from 'react';
import { FileOpen } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { Edition, importXML } from "linked-rolls";

interface ImportButtonProps {
    onImport: (newEdition: Edition) => void;
}

export const ImportButton = ({ onImport }: ImportButtonProps) => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const xmlText = e.target?.result as string;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const newEdition: Edition = importXML(xmlDoc);
            onImport(newEdition);
        };
        reader.readAsText(file);
    };

    return (
        <>
            <input
                accept=".xml"
                style={{ display: 'none' }}
                id="import-file"
                type="file"
                onChange={handleFileUpload}
            />
            <label htmlFor="import-file">
                <IconButton
                    size='small'
                    component="span"
                >
                    <FileOpen />
                </IconButton>
            </label>
        </>
    );
};

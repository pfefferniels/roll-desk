import React from 'react';
import { FileOpen } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { Edition, importXML, importJsonLd } from "linked-rolls";

interface ImportButtonProps {
    onImport: (newEdition: Edition) => void;
}

export const ImportButton = ({ onImport }: ImportButtonProps) => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        reader.onload = async (e) => {
            const fileContent = e.target?.result as string;

            try {
                let newEdition: Edition;
                
                if (fileExtension === 'xml') {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(fileContent, "application/xml");
                    newEdition = importXML(xmlDoc);
                } else if (fileExtension === 'json') {
                    const jsonDoc = JSON.parse(fileContent);
                    newEdition = importJsonLd(jsonDoc);
                } else {
                    console.log("Unsupported file format. Please select an XML or JSON file.");
                    return;
                }

                onImport(newEdition);
            } catch (error) {
                console.error("Error importing file:", error);
            }
        };

        reader.readAsText(file);
    };

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

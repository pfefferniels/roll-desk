import { Box, Button, Stack } from "@mui/material";
import exp from "constants";
import { assign, Edition } from "linked-rolls";
import { ImportButton } from "./ImportButton";
import { useState } from "react";
import EditMetadata from "./EditMetadata";
import { Create } from "@mui/icons-material";

const emptyEdition: Edition = {
    title: '',
    license: '',
    base: '',
    publicationEvent: {
        publisher: { name: '', sameAs: [] },
        publicationDate: new Date(),
        consistsOf: {
            toleranceEnd: 5,
            toleranceStart: 5,
        }
    },
    roll: {
        catalogueNumber: '',
        recordingEvent: {
            recorded: {
                pianist: {
                    name: '',
                    sameAs: []
                },
                playing: ''
            },
            date: assign('dateAssignment', new Date()),
            place: { name: '', sameAs: [] }
        }
    },
    stages: [],
    copies: [],
    questions: []
};

export interface WelcomeProps {
    onCreate: (edition: Edition) => void;
}

export const Welcome = ({ onCreate }: WelcomeProps) => {
    const [editMetadata, setEditMetadata] = useState(false)
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <Box
                    sx={{
                        width: '80%',
                        textAlign: 'center',
                        p: 2,
                    }}
                >
                    <h2>Welcome</h2>
                    <p>
                        <i>Roll Desk</i> is a tool to create and edit scholarly editions of
                        (reproducing) piano rolls.
                    </p>
                    <p>
                        To start, you can either import an existing edition or create a new one.
                    </p>
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        sx={{ mt: 2 }}
                    >
                        <ImportButton onImport={onCreate} />
                        <Button
                            variant="outlined"
                            startIcon={<Create />}
                            onClick={() => setEditMetadata(true)}
                        >
                            Create
                        </Button>
                    </Stack>
                </Box>
            </Box>
            <EditMetadata
                edition={emptyEdition}
                open={editMetadata}
                onClose={() => setEditMetadata(false)}
                onDone={(edition) => {
                    onCreate(edition);
                    setEditMetadata(false);
                }}
            />
        </>
    );
}
import { Box, Button, Stack } from "@mui/material";
import { ImportButton } from "./ImportButton";
import { Create } from "@mui/icons-material";

interface WelcomeProps {
    onCreate: () => void
}

export const Welcome = ({ onCreate }: WelcomeProps) => {
    return (
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
                    <ImportButton outlined={true} />
                    <Button
                        variant="outlined"
                        startIcon={<Create />}
                        onClick={onCreate}
                    >
                        Create
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}

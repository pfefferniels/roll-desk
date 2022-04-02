import { Button, Paper } from "@mui/material";

export default function AnnotatedScore() {
    return (
        <div>
            <Paper style={{position: 'fixed', padding: '0.5rem'}}>
                <Button variant='outlined'>Export Annotated MEI</Button>
            </Paper>
        </div>
    )
}

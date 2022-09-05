import { Paper, Box, IconButton } from "@mui/material";
import { FC, useState } from "react";
import { AlignedPerformance } from "../../lib/AlignedPerformance";
import { ExportAlignmentDialog } from "./ExportAlignmentDialog";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ClearIcon from '@mui/icons-material/Clear';

interface AlignmentActionsProps {
    alignedPerformance: AlignedPerformance
    triggerUpdate: () => void
}

export const AlignmentActions: FC<AlignmentActionsProps> = ({ alignedPerformance, triggerUpdate }) => {
    const [exportDialogOpen, setExportDialogOpen] = useState(false)

    return (
        <>
            <ExportAlignmentDialog alignedPerformance={alignedPerformance}
                dialogOpen={exportDialogOpen}
                setDialogOpen={setExportDialogOpen} />

            <Paper style={{ position: 'fixed', padding: '0.5rem', right: 0 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
                    <IconButton onClick={() => setExportDialogOpen(true)}>
                        <FileDownloadIcon />
                    </IconButton>

                    <IconButton onClick={() => {
                        alignedPerformance.removeAllAlignments();
                        triggerUpdate()
                    }}>
                        <ClearIcon />
                    </IconButton>
                </Box>
            </Paper>
        </>
    )
}

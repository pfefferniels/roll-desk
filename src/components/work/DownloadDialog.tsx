import { Download } from "@mui/icons-material"
import { Dialog, DialogContent, List, ListItem, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"
import { Analysis } from "./Work"
import { downloadFile } from "../../helpers/downloadFile"

interface DownloadDialogProps {
    open: boolean
    onClose: () => void
    analysis: Analysis
}

export const DownloadDialog = ({ open, onClose, analysis }: DownloadDialogProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <List>
                    <ListItem>
                        <ListItemButton onClick={() => {
                            downloadFile('performance.mpm', analysis.mpm.serialize(), 'application/xml')
                        }}>
                            <ListItemAvatar><Download /></ListItemAvatar>
                            <ListItemText
                                primary='MPM'
                                secondary={
                                    `Download the Music Performance Markup (MPM) file.`
                                } />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton onClick={() => {
                            downloadFile('score.mei', analysis.mei.asString(), 'application/xml')
                        }}>
                            <ListItemAvatar><Download /></ListItemAvatar>
                            <ListItemText primary='MEI' secondary={
                                `Text modifications of the interpretation
                            such as e.g. added grace notes,
                            added chords etc. are embedded into the MEI as
                            variant readings (<rdg>)`} />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton>
                            <ListItemAvatar><Download /></ListItemAvatar>
                            <ListItemText
                                primary='MPM Toolbox Project'
                                secondary={
                                    `This file can be opened using the MPM Toolbox. It
                                    will include both, MPM and MSM.`
                                } />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton>
                            <ListItemAvatar><Download /></ListItemAvatar>
                            <ListItemText
                                primary='Alignment'
                                secondary={
                                    `This will serialize the alignments using the Match File Format.`
                                } />
                        </ListItemButton>
                    </ListItem>
                </List>
            </DialogContent>
        </Dialog >
    )
}
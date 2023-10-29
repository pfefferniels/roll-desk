import { Download } from "@mui/icons-material"
import { Dialog, DialogContent, List, ListItem, ListItemAvatar, ListItemButton, ListItemText } from "@mui/material"
import { downloadFile } from "../../helpers/downloadFile"
import { MEI } from "../../lib/mei"
import { MPM } from "mpm-ts"

interface DownloadDialogProps {
    open: boolean
    onClose: () => void
    mpm: MPM
    mei: MEI
}

export const DownloadDialog = ({ open, onClose, mpm, mei }: DownloadDialogProps) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <List>
                    <ListItem>
                        <ListItemButton onClick={() => {
                            downloadFile('performance.mpm', mpm.serialize(), 'application/xml')
                        }}>
                            <ListItemAvatar>
                                <Download />
                            </ListItemAvatar>
                            <ListItemText
                                primary='MPM'
                                secondary={
                                    `Download the Music Performance Markup (MPM) file.`
                                } />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton onClick={() => {
                            downloadFile('score.mei', mei.asString(), 'application/xml')
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
                                    will include both, MPM and MEI.`
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
import { Button, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { assignValue, Named, ProductionEvent, systemOf, TrackerBar, trackerBarOf, valueOf, welteT100 } from "linked-rolls";
import { DateField } from "./DateField";
import { noSpeed, PaperSpeedFields, paperSpeedOf, SpeedInput, speedInputOf, SystemSelect } from "./ProductionFields";

interface ProductionEventDialog {
    open: boolean
    event?: ProductionEvent
    onClose: () => void
    onDone: (event: ProductionEvent) => void
}

/** A name with an optional authority record, or nothing when the name is empty. */
const namedOrNone = (name: string, authority: string): Named | undefined =>
    name.trim() ? { name: name.trim(), sameAs: authority.trim() ? [authority.trim()] : [] } : undefined

export const ProductionEventDialog = ({ open, event, onClose, onDone }: ProductionEventDialog) => {
    // A copy that names no system is read by the T-100, as barOf has it.
    const editionBar = welteT100
    const [company, setCompany] = useState('');
    const [companyAuthority, setCompanyAuthority] = useState('');
    const [paper, setPaper] = useState('');
    const [paperAuthority, setPaperAuthority] = useState('');
    const [date, setDate] = useState<Date>();
    const [system, setSystem] = useState<TrackerBar>(editionBar)
    const [speed, setSpeed] = useState<SpeedInput>(noSpeed)

    useEffect(() => {
        if (!event) return

        setCompany(event.company?.name ?? '')
        setCompanyAuthority(event.company?.sameAs[0] ?? '')
        setPaper(event.paper?.name ?? '')
        setPaperAuthority(event.paper?.sameAs[0] ?? '')
        setDate(event.date ? valueOf(event.date) : undefined)
        setSystem(trackerBarOf(event.system) ?? editionBar)
        setSpeed(speedInputOf(event.speed))
    }, [event, editionBar])

    const handleDone = () => {
        const paperSpeed = paperSpeedOf(speed)
        onDone({
            company: namedOrNone(company, companyAuthority),
            paper: namedOrNone(paper, paperAuthority),
            date: date && assignValue(date),
            system: systemOf(system),
            // the belief held about an earlier statement of the speed stays with the new value
            speed: paperSpeed && { ...event?.speed, ...paperSpeed }
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Edit Production Event</DialogTitle>
            <DialogContent>
                <Typography>Roll Production</Typography>
                <Stack direction="column" spacing={2}>
                    <TextField
                        size='small'
                        label='Manufacturer'
                        value={company}
                        placeholder="e.g. M. Welte & Söhne"
                        onChange={e => setCompany(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        label='Manufacturer authority record'
                        value={companyAuthority}
                        placeholder="e.g. https://d-nb.info/gnd/…"
                        onChange={e => setCompanyAuthority(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        label='Paper'
                        value={paper}
                        placeholder="e.g. red paper, lined"
                        onChange={e => setPaper(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        size='small'
                        label='Paper authority record'
                        value={paperAuthority}
                        placeholder="e.g. https://www.wikidata.org/entity/…"
                        onChange={e => setPaperAuthority(e.target.value)}
                        fullWidth
                    />
                    <DateField
                        label="Roll Date"
                        value={date}
                        onChange={setDate}
                        mayBeEmpty
                    />
                    <SystemSelect value={system} onChange={setSystem} />
                    <PaperSpeedFields value={speed} onChange={setSpeed} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => {
                        handleDone()
                        onClose()
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

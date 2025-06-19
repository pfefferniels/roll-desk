import { Dialog, DialogContent } from "@mui/material";
import { Stage } from "linked-rolls";
import { EditBelief } from "./EditAssumption";
import { useEffect, useState } from "react";

interface StageInfoProps {
    open: boolean
    stage: Stage
    onClose: () => void
    onDone: (stage: Stage) => void
}

export const StageInfo = ({ open, stage, onClose, onDone }: StageInfoProps) => {
    const [actor, setActor] = useState(stage.actor || '');

    useEffect(() => {
        setActor(stage.actor || '');
    }, [stage]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogContent>
            </DialogContent>
        </Dialog>
    )
}
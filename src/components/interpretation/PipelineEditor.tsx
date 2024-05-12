import { Checkbox, List, ListItem, ListItemButton, ListItemText } from "@mui/material"
import { Pipeline } from "mpmify"
import { Transformer } from "mpmify/lib/transformers/Transformer"

interface PipelineEditorProps {
    pipeline: Pipeline
    onChange: (newPipeline: Pipeline) => void
}

export const PipelineEditor = ({ pipeline, onChange }: PipelineEditorProps) => {
    const transformerItems: Transformer[] = []
    for (let i = 0; i < pipeline.length; i++) {
        // transformerItems.push(pipeline.at(i))
    }

    return (
        <List>
            {transformerItems.map((item, i) => {
                return (
                    <ListItem key={`transformerItem_${i}`}>
                        <ListItemText
                            primary={item?.name} />
                    </ListItem>
                )
            })}
        </List>
    )
}
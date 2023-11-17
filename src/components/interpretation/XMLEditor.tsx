import { useState } from "react"
import { IconButton } from "@mui/material";
import { Save } from "@mui/icons-material";
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import "./XMLEditor.css"

interface XMLEditorProps {
    text: string
    onSave: (text: string) => void
}

export const XMLEditor = ({ text: initialText, onSave }: XMLEditorProps) => {
    const [text, setText] = useState(initialText)

    return (
        <>
            <IconButton onClick={() => onSave(text)}>
                <Save />
            </IconButton>
            <CodeMirror
                value={text}
                onChange={newText => setText(newText)}
                extensions={[xml()]}
            />
        </>
    )
}
import { Edit } from '@mui/icons-material';
import { ToggleButton } from '@mui/material';
import { Editor, EditorState, convertToRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { useState } from 'react';

interface NotesEditorProps {
    notes: string
    save: (contents: string) => void
}

export const NotesEditor = ({ notes, save }: NotesEditorProps) => {
    const [editing, setEditing] = useState(false)

    const [editorState, setEditorState] = useState(
        () => EditorState.createEmpty(),
    );

    const toggleEditing = () => {
        const content = convertToRaw(editorState.getCurrentContent())
        save(JSON.stringify(content))
        setEditing(!editing)
    }
    
    return (
        <>
            <ToggleButton value="check" selected={editing} onChange={toggleEditing}>
                <Edit />
            </ToggleButton>

            {editing
                ? <Editor editorState={editorState} onChange={setEditorState} />
                : notes
            }
        </>
    )
}

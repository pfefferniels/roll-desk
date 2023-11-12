import { Edit } from '@mui/icons-material';
import { Stack, ToggleButton } from '@mui/material';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LexicalEditor, $getRoot, $insertNodes } from 'lexical';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin'
import { useEffect, useRef, useState } from 'react';

interface NotesEditorProps {
    notes: string
    save: (contents: string) => void
}

const theme = {}

const onError = (error: Error) => {
    console.error(error);
}

export const NotesEditor = ({ notes, save }: NotesEditorProps) => {
    const [editing, setEditing] = useState(false)

    const editorRef = useRef<LexicalEditor | null>(null);

    const initialConfig = {
        namespace: 'notes-editor',
        theme,
        onError,
    };

    const toggleEditing = () => {
        if (editorRef.current) {
            const htmlString = editorRef.current
                .getEditorState()
                .read(() => $generateHtmlFromNodes(editorRef.current!, null));
            save(htmlString)
        }
        setEditing(!editing)
    }

    useEffect(() => {
        if (!editorRef.current) return 

        const editor = editorRef.current
        editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(notes, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().select()
            $insertNodes(nodes, true);
          });
    }, [notes])

    return (
        <div>
            <Stack direction='row' spacing={2}>
                <b>Notes</b>

                <ToggleButton size='small' value="check" selected={editing} onChange={toggleEditing}>
                    <Edit />
                </ToggleButton>
            </Stack>

            {editing
                ? (
                    <div style={{ position: 'relative' }}>
                        <LexicalComposer initialConfig={initialConfig}>
                            <PlainTextPlugin
                                contentEditable={
                                    <ContentEditable
                                        style={{ height: '400px', border: '1px solid gray', borderRadius: '0.2rem', marginTop: '1rem', paddingLeft: '1rem' }} />}
                                placeholder={<div style={{ position: 'absolute', top: 0, marginTop: '1rem', marginLeft: '1rem' }}>Enter some text...</div>}
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                            <HistoryPlugin />
                            <EditorRefPlugin editorRef={editorRef} />
                        </LexicalComposer>
                    </div>
                )
                : <div dangerouslySetInnerHTML={{ __html: notes }} />
            }
        </div>
    )
}

import React from 'react';
import MidiViewer from '../midi-ld/MidiViewer';
import { useThing } from '@inrupt/solid-ui-react';
import { CircularProgress } from '@mui/material';
import { getUrl } from '@inrupt/solid-client';
import { crm } from '../../helpers/namespaces';

interface AnalysisEditorProps {
  url: string
}

/**
 * This components the analysis or interpretation 
 * of a Welte recording, meaning that it represents
 * `E13 Attribute Assignment`s to single events of a 
 * particular piano roll, possibly associated
 * `I1 Argumentation`s and allows creating and editing
 * them.
 */
export const AnalysisEditor = ({ url }: AnalysisEditorProps) => {
  const { thing: analysis, error } = useThing(url, url)

  if (!analysis) {
    if (error) return <span>Failed loading analysis</span>
    return <CircularProgress />
  }

  const midiUrl = getUrl(analysis, crm('P16_used_specific_object'))

  return (
    <div>
      <h1>Interpretation</h1>

      midiUrl && <MidiViewer url={midiUrl || ''} />
    </div>
  );
};

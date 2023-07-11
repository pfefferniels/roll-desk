import React from 'react';

interface AlignmentEditorProps {
  url: string
}

/*
 * An alignment expresses the fact that a performance
 * is based on a particular score. It provides 
 * further details about this connection, such as 
 * which score note is represented by which event
 * in the performance.
 */
export const AlignmentEditor = ({ url }: AlignmentEditorProps) => {
  return (
    <div>
      <h1>Alignment</h1>
      <p>displaying alignment: {url}</p>
    </div>
  );
};

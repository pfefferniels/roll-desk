import React from 'react';
import { useParams } from 'react-router-dom';

/*
 * An alignment expresses the fact that a performance
 * is based on a particular score. It provides 
 * further details about this connection, such as 
 * which score note is represented by which event
 * in the performance.
 */
export const AlignmentEditor: React.FC = () => {
  const { alignmentId } = useParams();

  return (
    <div>
      <h1>Alignment</h1>
      <p>Alignment ID: {alignmentId}</p>
      {/* implementation goes here */}
    </div>
  );
};

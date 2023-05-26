import React from 'react';
import { useParams } from 'react-router-dom';

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

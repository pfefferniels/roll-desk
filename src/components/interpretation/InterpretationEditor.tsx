import React from 'react';
import { useParams } from 'react-router-dom';

export const InterpretationEditor: React.FC = () => {
  const { interpretationId } = useParams();

  return (
    <div>
      <h1>Interpretation</h1>
      <p>Interpretation ID: {interpretationId}</p>
      {/* implementation goes here */}
    </div>
  );
};

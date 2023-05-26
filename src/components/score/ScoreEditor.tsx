import React from 'react';
import { useParams } from 'react-router-dom';

const ScoreEditor: React.FC = () => {
  const { scoreId } = useParams();

  return (
    <div>
      <h1>Score Editor</h1>
      <p>Score ID: {scoreId}</p>
      {/* Your score editor implementation goes here */}
    </div>
  );
};

export default ScoreEditor;
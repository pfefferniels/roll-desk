import React from 'react';
import { useParams } from 'react-router-dom';

const Work: React.FC = () => {
  const { workId } = useParams();

  return (
    <p>Work ID: {workId}</p>
  );
};

export default Work;

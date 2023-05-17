import React from 'react';
import { useParams } from 'react-router-dom';
import { DatasetProvider } from '../DatasetProvider';

const Work: React.FC = () => {
  const { workId } = useParams();



  return (
    <DatasetProvider datasetName='works.ttl'>
      <p>Work ID: {workId}</p>
      {/* Your work expressions implementation goes here */}
    </DatasetProvider>
  );
};

export default Work;

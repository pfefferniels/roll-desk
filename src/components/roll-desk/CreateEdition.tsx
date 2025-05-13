import React, { useEffect, useState } from 'react';
import { TextField, Button, MenuItem, Dialog, DialogContent, DialogTitle, DialogActions, Divider, Stack } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { Edition } from 'linked-rolls';
import { ImportButton } from './ImportButton';

interface CreateEditionProps {
  edition: Edition
  open: boolean
  onClose: () => void
  onDone: (edition: Edition) => void;
}

const licenses = [
  { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { name: 'Creative Commons Attribution-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { name: 'Creative Commons Attribution-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
];

const CreateEdition: React.FC<CreateEditionProps> = ({ edition, onDone, open, onClose }) => {
  const [title, setTitle] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [catalogueNumber, setCatalogueNumber] = useState<string>('');
  const [recordingDate, setRecordingDate] = useState<string>('');
  const [recordingPlace, setRecordingPlace] = useState<string>('');
  const [publisherName, setPublisherName] = useState<string>('');
  const [publicationDate, setPublicationDate] = useState<string>(new Date().toLocaleDateString('de-DE'));

  useEffect(() => {
    setTitle(edition.title);
    setLicense(edition.license);
    setPublisherName(edition.publicationEvent.publisher.name);
    setPublicationDate(edition.publicationEvent.publicationDate);
    setCatalogueNumber(edition.roll.catalogueNumber);
    setRecordingDate(edition.roll.recordingEvent.date);
    setRecordingPlace(edition.roll.recordingEvent.tookPlaceAt);
  }, [edition])

  const handleCreate = () => {
    const selectedLicense = licenses.find((l) => l.name === license);

    const newEdition = edition.shallowClone()
    newEdition.title = title
    newEdition.license = selectedLicense?.url || license
    newEdition.publicationEvent.publisher.name = publisherName
    newEdition.publicationEvent.publicationDate = publicationDate
    newEdition.roll.catalogueNumber = catalogueNumber
    newEdition.roll.recordingEvent.date = recordingDate
    newEdition.roll.recordingEvent.tookPlaceAt = recordingPlace

    onDone(newEdition);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Create Edition
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ minWidth: 400 }}>
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="License"
            fullWidth
            select
            value={license}
            onChange={(e) => setLicense(e.target.value)}
          >
            {licenses.map((license) => (
              <MenuItem key={license.url} value={license.url}>
                {license.name}
              </MenuItem>
            ))}
          </TextField>
          <Divider />
          <TextField
            label="Publisher Name"
            fullWidth
            value={publisherName}
            onChange={(e) => setPublisherName(e.target.value)}
          />
          <TextField
            label="Publication Date"
            fullWidth
            value={publicationDate}
            onChange={e => setPublicationDate(e.target.value)}
          />
          <Divider orientation='horizontal' />
          <TextField
            label="Catalogue Number"
            fullWidth
            value={catalogueNumber}
            onChange={(e) => setCatalogueNumber(e.target.value)}
          />
          <TextField
            label="Recording Date"
            fullWidth
            value={recordingDate}
            onChange={(e) => setRecordingDate(e.target.value)}
          />
          <TextField
            label="Recording Place"
            fullWidth
            value={recordingPlace}
            onChange={(e) => setRecordingPlace(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleCreate}
        >
          Create
        </Button>
        <ImportButton
          onImport={(newEdition) => {
            onDone(newEdition)
            onClose()
          }}
        />
      </DialogActions>
    </Dialog>
  );
};

export default CreateEdition;

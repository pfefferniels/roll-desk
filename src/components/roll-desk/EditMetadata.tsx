import React, { useEffect, useState } from 'react';
import { TextField, Button, MenuItem, Dialog, DialogContent, DialogTitle, DialogActions, Divider, Stack } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { assign, Edition, EditionMetadata, flat } from 'linked-rolls';
import { ImportButton } from './ImportButton';

interface EditMetadataProps {
  metadata: EditionMetadata
  open: boolean
  onClose: () => void
  onDone: (metadata: EditionMetadata) => void;
}

const licenses = [
  { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { name: 'Creative Commons Attribution-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { name: 'Creative Commons Attribution-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
];

const EditMetadata = ({ metadata: edition, onDone, open, onClose }: EditMetadataProps) => {
  const [title, setTitle] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [baseURI, setBaseURI] = useState<string>('');
  const [catalogueNumber, setCatalogueNumber] = useState<string>('');
  const [recordingDate, setRecordingDate] = useState<Date>(new Date());
  const [recordingPlace, setRecordingPlace] = useState<string>('');
  const [publisherName, setPublisherName] = useState<string>('');
  const [publicationDate, setPublicationDate] = useState<Date>(new Date());

  useEffect(() => {
    setTitle(edition.title);
    setLicense(edition.license);
    setBaseURI(edition.base);
    setPublisherName(edition.publicationEvent.publisher.name);
    setPublicationDate(edition.publicationEvent.publicationDate);
    setCatalogueNumber(edition.roll.catalogueNumber);
    setRecordingDate(flat(edition.roll.recordingEvent.date));
    setRecordingPlace(edition.roll.recordingEvent.place.name);
  }, [edition])

  const handleCreate = () => {
    const selectedLicense = licenses.find((l) => l.name === license);

    const newEdition = { ...edition }
    newEdition.title = title
    newEdition.license = selectedLicense?.url || license
    newEdition.base = baseURI
    newEdition.publicationEvent.publisher.name = publisherName
    newEdition.publicationEvent.publicationDate = publicationDate
    newEdition.roll.catalogueNumber = catalogueNumber
    newEdition.roll.recordingEvent.date = assign('dateAssignment', recordingDate)
    newEdition.roll.recordingEvent.place.name = recordingPlace

    onDone(newEdition);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Create Edition
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} direction='row' sx={{ marginTop: '1rem' }}>
          <Stack spacing={2} sx={{ minWidth: 300 }}>
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
            <TextField
              label="Base URI"
              fullWidth
              value={baseURI}
              onChange={(e) => setBaseURI(e.target.value)}
            />
          </Stack>
          <Stack sx={{ minWidth: 200 }} spacing={2}>
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
              onChange={e => setPublicationDate(new Date(e.target.value))}
            />
          </Stack>
          <Stack sx={{ minWidth: 200 }} spacing={2}>
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
              onChange={(e) => setRecordingDate(new Date(e.target.value))}
            />
            <TextField
              label="Recording Place"
              fullWidth
              value={recordingPlace}
              onChange={(e) => setRecordingPlace(e.target.value)}
            />
          </Stack>
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

export default EditMetadata;

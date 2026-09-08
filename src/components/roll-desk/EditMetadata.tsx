import { useContext, useEffect, useState } from 'react';
import { TextField, Button, MenuItem, Dialog, DialogContent, DialogTitle, DialogActions, Stack, IconButton, Typography } from '@mui/material';
import { Add, DeleteOutline, Save as SaveIcon } from '@mui/icons-material';
import { ImportButton } from './ImportButton';
import { EditionContext } from '../../providers/EditionContext';
import { assignValue, CollationTolerance, Concept, Editor, EditorialRole, editorialRoles, systemOf, valueOf, welteT100 } from 'linked-rolls';
import { toleranceOf } from '../../helpers/collationTolerance';
import { DateField } from './DateField';
import { ToleranceFields } from './ToleranceFields';

interface EditMetadataProps {
  open: boolean
  onClose: () => void
}

/** The reproducing systems the library can read. */
const systems: Concept[] = [systemOf(welteT100)]

const capitalized = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

const licenses = [
  { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { name: 'Creative Commons Attribution-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { name: 'Creative Commons Attribution-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  { name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/' },
];

const EditMetadata = ({ open, onClose }: EditMetadataProps) => {
  const { apply, edition } = useContext(EditionContext)

  const [title, setTitle] = useState<string>('');
  const [license, setLicense] = useState<string>('');
  const [baseURI, setBaseURI] = useState<string>('');
  const [catalogueNumber, setCatalogueNumber] = useState<string>('');
  const [system, setSystem] = useState<Concept>(systems[0]);
  const [recordingDate, setRecordingDate] = useState<Date>(new Date());
  const [recordingPlace, setRecordingPlace] = useState<string>('');
  const [publisherName, setPublisherName] = useState<string>('');
  const [publicationDate, setPublicationDate] = useState<Date>(new Date());
  const [tolerance, setTolerance] = useState<CollationTolerance>(toleranceOf(edition));
  const [editors, setEditors] = useState<Editor[]>([]);

  const addEditor = () =>
    setEditors([...editors, { name: '', sameAs: [], role: 'editor' }])

  const replaceEditor = (index: number, editor: Editor) =>
    setEditors(editors.map((existing, at) => at === index ? editor : existing))

  const removeEditor = (index: number) =>
    setEditors(editors.filter((_, at) => at !== index))

  useEffect(() => {
    if (!edition) return

    setTitle(edition.title);
    setLicense(edition.license);
    setBaseURI(edition.base);
    setPublisherName(edition.creation.publisher.name);
    setPublicationDate(edition.creation.publicationDate);
    setTolerance(toleranceOf(edition));
    setEditors(edition.creation.editors ?? []);
    setCatalogueNumber(edition.roll.catalogueNumber);
    setSystem(edition.roll.system);
    setRecordingDate(valueOf(edition.roll.recordingEvent.date));
    setRecordingPlace(edition.roll.recordingEvent.place.name);
  }, [edition])

  const editingExisting = edition !== undefined

  const handleSave = () => {
    const selectedLicense = licenses.find((l) => l.name === license);

    apply(draft => {
      draft.title = title
      draft.license = selectedLicense?.url || license
      draft.base = baseURI
      draft.creation.publisher.name = publisherName
      draft.creation.publicationDate = publicationDate
      draft.creation.collationTolerance = tolerance
      draft.creation.editors = editors
      draft.roll.catalogueNumber = catalogueNumber
      draft.roll.system = system
      draft.roll.recordingEvent.date = assignValue(recordingDate)
      draft.roll.recordingEvent.place.name = recordingPlace
    })

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {editingExisting ? 'Edit Metadata' : 'Create Edition'}
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
            <DateField
              label="Publication Date"
              value={publicationDate}
              onChange={setPublicationDate}
            />
            <ToleranceFields value={tolerance} onChange={setTolerance} />
          </Stack>
          <Stack sx={{ minWidth: 200 }} spacing={2}>
            <TextField
              label="Catalogue Number"
              fullWidth
              value={catalogueNumber}
              onChange={(e) => setCatalogueNumber(e.target.value)}
            />
            <TextField
              label="Reproducing System"
              fullWidth
              select
              value={system.id ?? ''}
              onChange={(e) => setSystem(systems.find(s => s.id === e.target.value) ?? system)}
            >
              {systems.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <DateField
              label="Roll Date"
              value={recordingDate}
              onChange={setRecordingDate}
            />

            <TextField
              label="Recording Place"
              fullWidth
              value={recordingPlace}
              onChange={(e) => setRecordingPlace(e.target.value)}
            />
          </Stack>
        </Stack>

        <Stack spacing={2} sx={{ marginTop: '1.5rem' }}>
          <Typography variant="subtitle2">Editors</Typography>
          {editors.map((editor, index) => (
            <Stack key={index} spacing={1} direction="row" alignItems="center">
              <TextField
                label="Name"
                sx={{ minWidth: 300 }}
                value={editor.name}
                onChange={(e) => replaceEditor(index, { ...editor, name: e.target.value })}
              />
              <TextField
                label="Role"
                select
                sx={{ minWidth: 200 }}
                value={editor.role}
                onChange={(e) => replaceEditor(index, { ...editor, role: e.target.value as EditorialRole })}
              >
                {editorialRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {capitalized(role)}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton
                aria-label={`Remove ${editor.name || 'editor'}`}
                onClick={() => removeEditor(index)}
              >
                <DeleteOutline />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<Add />} onClick={addEditor} sx={{ alignSelf: 'flex-start' }}>
            Add Editor
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          {editingExisting ? 'Save' : 'Create'}
        </Button>
        <ImportButton />
      </DialogActions>
    </Dialog>
  );
};

export default EditMetadata;

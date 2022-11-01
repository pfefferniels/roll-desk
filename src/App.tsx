

import { Box, Button, Divider, Grid } from "@mui/material";
import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from "react-router-dom";
import Editor from "./Editor";
import Viewer from "./Viewer";

function Home() {
  return (
    <Grid
      container
      spacing={0}
      direction='column'
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '90vh' }}
    >
      <Grid item xs={3}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            flexDirection: 'row',
          }}>
          <Button component={Link} to="/editor">Editor</Button>
          <Divider orientation='vertical' flexItem />
          <Button component={Link} to="/viewer">Viewer</Button>
        </Box>
      </Grid>
    </Grid>
  )
}

function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/viewer" element={<Viewer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

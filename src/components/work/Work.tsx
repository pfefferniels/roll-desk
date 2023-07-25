import Grid2 from "@mui/material/Unstable_Grid2/Grid2"

export const Work = () => {
    return (
        <Grid2 container>
            <Grid2 xs={4}>
                Toolbar
            </Grid2>
            <Grid2 xs={8}>
                Choose analysis
            </Grid2>
            <Grid2 xs={12}>
                Verovio with overlays
            </Grid2>
            <Grid2 xs={12}>
                Annotation display.
            </Grid2>
        </Grid2>
    )
}
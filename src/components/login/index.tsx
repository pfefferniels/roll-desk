import { CombinedDataProvider, LoginButton, LogoutButton, Text, useSession } from "@inrupt/solid-ui-react";
import { FOAF } from "@inrupt/vocab-common-rdf";
import { Button, Paper } from "@mui/material";

function Profile() {
    const { session, sessionRequestInProgress } = useSession();
    if (sessionRequestInProgress) return <p>Loading...</p>;

    const webId = session.info.webId;

    if (!webId) return <span>something went wrong</span>

    console.log('session=', session)

    return (
        <CombinedDataProvider datasetUrl={webId} thingUrl={webId}>
            <span>Welcome, <Text property={FOAF.name} /></span>
        </CombinedDataProvider>
    )
}

export function LoginForm() {
    const { session, sessionRequestInProgress } = useSession();

    return (
        <Paper sx={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000, padding: '0.8rem' }}>
            {session.info.isLoggedIn ?
                <>
                    <Profile />
                    <LogoutButton>
                        <Button>Log Out</Button>
                    </LogoutButton>
                </> :
                <>
                    <LoginButton
                        oidcIssuer='https://inrupt.net'
                        redirectUrl={window.location.href}
                        authOptions={{ clientName: 'Measuring Early Records' }}>
                        <Button disabled={sessionRequestInProgress}>Log In</Button>
                    </LoginButton>
                </>
            }
        </Paper>
    )
}


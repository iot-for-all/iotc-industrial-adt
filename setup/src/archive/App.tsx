import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import './App.css';
import Progress from './Progress';
import Conditions from './Conditions';
import Setup, { SetupContext } from './context';
import StepWizard from 'react-step-wizard';
import Central from './Central';
import Configure from './Configure';
import { Callout, DefaultButton, Icon, IPersonaSharedProps, Persona, PersonaSize, PrimaryButton } from '@fluentui/react';
import { getPicture, login, logout, msalInstance } from './auth';
import { MsalProvider, useIsAuthenticated, useMsal } from '@azure/msal-react';
import { AccountInfo } from '@azure/msal-browser';
import { useBoolean, useId } from '@fluentui/react-hooks';
import Provision from './Provision';
import Generator from './Generator';


const App = React.memo(() => {
    return (
        <div className='flex-center full-height'>
            <MsalProvider instance={msalInstance}>
                <Setup>
                    <Root />
                </Setup>
            </MsalProvider>
        </div>)
});

const UserCard = React.memo<{ user: AccountInfo & { image?: string }, target: string, logout: () => void }>(({ user, target, logout }) => {
    const personaConfig = useMemo<IPersonaSharedProps>(() => ({
        imageUrl: `data:image/jpeg;base64,${user.image}`,
        size: PersonaSize.size72,
        text: user.name ?? user.username,
        secondaryText: user.username
    }), [user]);

    return (<Callout isBeakVisible={false} target={`#${target}`} className='height-200 width-300 vertical-center-text' >
        <div className='flex-center'>
            <Persona {...personaConfig} />
            <DefaultButton text='Logout' onClick={logout} />
        </div>
    </Callout>)
});

const Root = React.memo(() => {
    const { currentStep, setCurrentStep, setUser, user } = useContext(SetupContext);
    const isAuthenticated = useIsAuthenticated();
    const { accounts } = useMsal();
    const userIconId = useId();
    const [userCardVisible, { toggle }] = useBoolean(false);

    const loadUser = useCallback(async () => {
        try {
            const image = await getPicture(accounts[0]);
            setUser({ ...accounts[0], image })
        }
        catch (ex) {
            setUser(accounts[0]);
        }

    }, [accounts]);

    useEffect(() => {
        if (isAuthenticated && accounts.length > 0) {
            loadUser();
        }
    }, [isAuthenticated]);

    return (<>
        <div className='masthead'>
            <h3 className='padding-horizontal flex1'>Azure IoT Central Digital Twins plugin</h3>
            <div className='right-align-flex'>
                {isAuthenticated && user ?
                    <div className='link' onClick={toggle}>
                        <span className='margin-right-sm'>{user.name || user.username}</span>
                        <div id={userIconId} className='round-border inline-block'>
                            <Icon iconName='Contact' className='icon-30' />
                            {userCardVisible && <UserCard target={userIconId} user={user} logout={logout} />}
                        </div></div> :
                    <div className='round-border link' onClick={login}>
                        <Icon iconName='AddFriend' className='icon-30' />
                    </div>}
            </div>
        </div>
        {/* {isAuthenticated ? <>
            <Progress steps={4} index={currentStep} />
            <StepWizard onStepChange={({ activeStep }) => setCurrentStep(activeStep)} className='flex-center full-height'>
                <Generator/>
                <Provision />
                <Central />
                <Conditions />
                <Configure />
            </StepWizard>
        </> :
            <div className='flex-center'>
                <h1>Welcome to the Azure IoT Central Digital Twins plugin!</h1>
                <h3>Login to list your IoT Central application and start configuring the plugin.</h3>
                <PrimaryButton text='Login' onClick={login} />
            </div>} */}
        <Generator />
    </>)
});

export default App;
import { Callout, DefaultButton, Icon, IPersonaSharedProps, Persona, PersonaSize, PrimaryButton } from '@fluentui/react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Mapping } from './mapping';
import './App.css';
import { useBoolean, useId } from '@fluentui/react-hooks';

declare global {
  interface Window {
    electron: any;
  }
}

type AccountInfo = {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
  idTokenClaims?: object;
};

const UserCard = React.memo<{ user: AccountInfo & { image?: string }, target: string, logout: () => void }>(({ user, target, logout }) => {
  const personaConfig = React.useMemo<IPersonaSharedProps>(() => ({
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
  return null;
});

const App = React.memo(function App() {
  const [user, setUser] = React.useState<AccountInfo>();
  const [userCardVisible, { toggle }] = useBoolean(false);
  const userIconId = useId();
  React.useEffect(() => {
    const fn = async () => {
      setUser(await window.electron.signInSilent());
    };
    fn();
  }, []);
  return (
    <div>
      <div className='masthead'>
        <h3 className='padding-horizontal flex1'>OPCUA to DT Mapping Tool</h3>
        <div className='right-align-flex'>
          {user ?
            <div className='link' onClick={toggle}>
              <span className='margin-right-sm'>{user.name || user.username}</span>
              <div id={userIconId} className='round-border inline-block'>
                <Icon iconName='Contact' className='icon-30' />
                {userCardVisible && <UserCard target={userIconId} user={user} logout={async () => {
                  const data = await window.electron.signOut();
                  console.log(data);
                  setUser(data);
                }} />}
              </div></div> :
            <div className='round-border link' onClick={async () => {
              const data = await window.electron.signIn();
              console.log(data);
              setUser(data);
            }}>
              <Icon iconName='AddFriend' className='icon-30' />
            </div>}
        </div>
      </div>
      <Mapping />
    </div>);
});

function render() {
  ReactDOM.render(<App />, document.getElementById('app'));
}

render();
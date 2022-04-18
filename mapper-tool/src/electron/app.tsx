import {
  Callout,
  DefaultButton,
  Icon,
  IPersonaSharedProps,
  Persona,
  PersonaSize,
  Spinner,
  SpinnerSize,
} from "@fluentui/react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Mapping } from "./mapping";
import "./app.css";
import { useBoolean, useId } from "@fluentui/react-hooks";
import { AccountInfo, ElectronBridge } from "./models";
import useIsAuthAvailable from "./core/hooks/useIsAuthAvailable";

declare global {
  interface Window {
    electron: ElectronBridge;
  }
}

const UserCard = React.memo<{
  user: AccountInfo & { image?: string };
  target: string;
  logout: () => void;
}>(({ user, target, logout }) => {
  const personaConfig = React.useMemo<IPersonaSharedProps>(
    () => ({
      imageUrl: `data:image/jpeg;base64,${user.image}`,
      size: PersonaSize.size72,
      text: user.name ?? user.username,
      secondaryText: user.username,
    }),
    [user]
  );

  return (
    <Callout
      isBeakVisible={true}
      target={`#${target}`}
      className="height-200 width-300 vertical-center-text white-background margin-top-10"
    >
      <div className="flex-center">
        <Persona {...personaConfig} />
        <DefaultButton text="Logout" onClick={logout} />
      </div>
    </Callout>
  );
});

const App = React.memo(function App() {
  const [initializing, isAuthAvailable] = useIsAuthAvailable();
  const [user, setUser] = React.useState<AccountInfo | null>();
  const [userCardVisible, { toggle }] = useBoolean(false);
  const userIconId = useId();

  React.useEffect(() => {
    const fn = async () => {
      let data = await window.electron.signInSilent();
      if (!data) {
        data = await window.electron.signIn();
      }
      setUser(data);
    };
    if (isAuthAvailable && !user) {
      fn();
    }
  }, [isAuthAvailable, setUser, user]);

  if (initializing || isAuthAvailable) {
    return (
      <>
        {user ? (
          <div>
            <div className="masthead">
              <h3 className="padding-horizontal flex1">
                OPCUA to DT Mapping Tool
              </h3>
              <div className="right-align-flex">
                <div className="link" onClick={toggle}>
                  <span className="margin-right-sm">
                    {user.name || user.username}
                  </span>
                  <div id={userIconId} className="round-border inline-block">
                    <Icon iconName="Contact" className="icon-30" />
                    {userCardVisible && (
                      <UserCard
                        target={userIconId}
                        user={user}
                        logout={async () => {
                          toggle();
                          await window.electron.signOut();
                          setUser(null);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Mapping isAuthAvailable={isAuthAvailable} />
          </div>
        ) : (
          <div className="flex-center full-height justify-center">
            <Spinner size={SpinnerSize.large} />
          </div>
        )}
      </>
    );
  }
  return <Mapping isAuthAvailable={isAuthAvailable} />;
});

function render() {
  ReactDOM.render(<App />, document.getElementById("app"));
}

render();

import { initializeIcons } from '@fluentui/font-icons-mdl2';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Mapping } from './mapping';

// add app as excluded in tsconfig.json

declare global {
  interface Window {
    electron: any;
  }
}

const App = React.memo(function App() {
  initializeIcons();
  return (
    <div>
      <Mapping />
    </div>);
});

function render() {
  ReactDOM.render(<App />, document.getElementById('app'));
}

render();
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as fs from 'fs';
import isDev from 'electron-is-dev';
const openAboutWindow = require('aboutWindow').default;
import path from 'path';

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow: any;

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 768,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  isDev && mainWindow.webContents.openDevTools();
  const menu = Menu.buildFromTemplate([
    {
      label: 'OPCUA ADT Mapper',
      submenu: [
        {
          label: 'About',
          click: () =>
            openAboutWindow({
              icon_path: path.join(__dirname, 'logo.png'),
              package_json_dir: __dirname,
              open_devtools: isDev,
              product_name: 'OPCUA Digital Twins Mapper'
            })
        },
        {
          role: 'quit',
        },
      ],
    },
  ]);
  app.applicationMenu = menu;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
// https://www.sitepoint.com/electron-forge-react-build-secure-desktop-app/
ipcMain.handle('loadFile', async (e, filePath) => {
  if (!fs.existsSync(filePath)) { throw new Error('Forbidden') }
  return await fs.promises.readFile(filePath, 'utf8');
});
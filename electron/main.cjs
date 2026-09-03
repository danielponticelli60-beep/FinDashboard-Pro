const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function resolveRendererPath() {
  const candidates = [
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html')
  ];

  const rendererPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!rendererPath) {
    throw new Error(
      `Renderer non trovato. Percorsi verificati:\n${candidates.join('\n')}`
    );
  }

  return rendererPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'FinDashboard Pro - Gestione Finanze Personali',
    backgroundColor: '#090D16',
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    }
  });

  const indexPath = resolveRendererPath();

  console.log('--- Electron Environment Diagnostics ---');
  console.log('app.getAppPath():', app.getAppPath());
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('indexPath:', indexPath);
  console.log('fs.existsSync(indexPath):', fs.existsSync(indexPath));
  console.log('----------------------------------------');

  mainWindow.loadFile(indexPath).catch((error) => {
    console.error('loadFile failed:', error);
    dialog.showErrorBox(
      'Errore caricamento FinDashboard Pro',
      `${error.message}\n\nRenderer:\n${indexPath}`
    );
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load:', {
      errorCode,
      errorDescription,
      validatedURL,
      indexPath
    });
    dialog.showErrorBox(
      'Errore caricamento did-fail-load',
      `Codice: ${errorCode}\nDescrizione: ${errorDescription}\nURL: ${validatedURL}\nRenderer: ${indexPath}`
    );
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Renderer caricato con successo:', indexPath);
    mainWindow.show();
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('render-process-gone:', details);
    dialog.showErrorBox(
      'Processo Renderer Terminato',
      `Ragione: ${details.reason}\nExit code: ${details.exitCode}`
    );
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console - L${level}]: ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const { app, BrowserWindow, shell, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let monitorWindow = null;
let devServerProcess = null;
let serverProcesses = new Map();
let monitorAlwaysOnTop = true;

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [MainProcess] ${message}`, ...args);
}

function createMonitorWindow() {
  if (monitorWindow) {
    monitorWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  monitorWindow = new BrowserWindow({
    width: 320,
    height: 480,
    x: screenWidth - 340,
    y: 20,
    frame: false,
    transparent: false,
    alwaysOnTop: monitorAlwaysOnTop,
    resizable: false,
    skipTaskbar: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#1a1a2e',
  });

  monitorWindow.once('ready-to-show', () => {
    monitorWindow.show();
  });

  if (isDev) {
    monitorWindow.loadURL('http://localhost:5173/#/monitor');
  } else {
    const appPath = app.getAppPath();
    const resourcesPath = path.dirname(appPath);
    const distPath = app.isPackaged
      ? path.join(resourcesPath, 'app.asar.unpacked', 'win7-dist', 'index.html')
      : path.join(appPath, 'win7-dist', 'index.html');
    monitorWindow.loadFile(distPath, { hash: '/monitor' });
  }

  monitorWindow.on('closed', () => {
    monitorWindow = null;
  });

  log('info', 'Monitor window created, alwaysOnTop:', monitorAlwaysOnTop);
}

function closeMonitorWindow() {
  if (monitorWindow) {
    monitorWindow.close();
    monitorWindow = null;
    log('info', 'Monitor window closed');
  }
}

function setMonitorAlwaysOnTop(value) {
  monitorAlwaysOnTop = value;
  if (monitorWindow) {
    monitorWindow.setAlwaysOnTop(value);
  }
  log('info', 'Monitor alwaysOnTop set to:', value);
  return value;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#1a1a2e',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const appPath = app.getAppPath();
    const resourcesPath = path.dirname(appPath);
    const distPath = app.isPackaged
      ? path.join(resourcesPath, 'app.asar.unpacked', 'win7-dist', 'index.html')
      : path.join(appPath, 'win7-dist', 'index.html');
    mainWindow.loadFile(distPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    log('info', 'Starting development server...');

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    devServerProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: app.getAppPath(),
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    devServerProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Local:') || output.includes('ready in')) {
        log('info', 'Development server is ready');
        resolve();
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      log('warn', 'Dev server stderr:', data.toString().trim());
    });

    devServerProcess.on('error', (error) => {
      log('error', 'Failed to start dev server:', error.message);
      reject(error);
    });

    devServerProcess.on('close', (code) => {
      log('info', `Dev server closed with code ${code}`);
      devServerProcess = null;
    });

    setTimeout(() => {
      resolve();
    }, 5000);
  });
}

function terminateProcess(pid, signal = 'SIGTERM') {
  return new Promise((resolve) => {
    if (!pid) {
      resolve({ success: true, message: 'No PID provided' });
      return;
    }

    log('info', `Terminating process ${pid} with signal ${signal}`);

    try {
      if (process.platform === 'win32') {
        exec(`taskkill /PID ${pid} /F`, (error) => {
          if (error) {
            log('error', `Failed to terminate process ${pid}:`, error.message);
            resolve({ success: false, error: error.message });
          } else {
            log('info', `Process ${pid} terminated successfully`);
            serverProcesses.delete(pid);
            resolve({ success: true });
          }
        });
      } else {
        exec(`kill -${signal === 'SIGKILL' ? 9 : 15} ${pid}`, (error) => {
          if (error) {
            log('error', `Failed to terminate process ${pid}:`, error.message);
            resolve({ success: false, error: error.message });
          } else {
            log('info', `Process ${pid} terminated successfully`);
            serverProcesses.delete(pid);
            resolve({ success: true });
          }
        });
      }
    } catch (error) {
      log('error', 'Process termination error:', error.message);
      resolve({ success: false, error: error.message });
    }
  });
}

function terminateAllProcesses() {
  return new Promise(async (resolve) => {
    log('info', 'Terminating all server processes...');

    const pids = Array.from(serverProcesses.keys());
    const results = [];

    for (const pid of pids) {
      const result = await terminateProcess(pid, 'SIGKILL');
      results.push({ pid, ...result });
    }

    if (devServerProcess) {
      devServerProcess.kill('SIGKILL');
      devServerProcess = null;
    }

    log('info', `Terminated ${results.length} processes`);
    resolve({ results, devServerKilled: !!devServerProcess });
  });
}

function cleanupOnExit() {
  log('info', 'Starting cleanup on exit...');

  terminateAllProcesses()
    .then(({ results, devServerKilled }) => {
      log('info', 'Cleanup completed', { results, devServerKilled });
    })
    .catch((error) => {
      log('error', 'Cleanup error:', error.message);
    })
    .finally(() => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
}

ipcMain.handle('terminate-server-process', async (event, pid) => {
  log('info', `IPC: terminate-server-process for PID ${pid}`);
  return terminateProcess(pid, 'SIGTERM');
});

ipcMain.handle('terminate-all-processes', async () => {
  log('info', 'IPC: terminate-all-processes');
  return terminateAllProcesses();
});

ipcMain.handle('register-server-process', async (event, { id, pid, name, port }) => {
  log('info', `IPC: register-server-process ${name} (PID: ${pid}, Port: ${port})`);
  serverProcesses.set(pid, { id, name, port, pid });
  return { success: true };
});

ipcMain.handle('get-server-processes', async () => {
  const processes = Array.from(serverProcesses.values());
  return processes;
});

ipcMain.handle('get-dev-server-status', async () => {
  return {
    running: !!devServerProcess,
    pid: devServerProcess?.pid || null,
  };
});

ipcMain.handle('open-monitor-window', async () => {
  log('info', 'IPC: open-monitor-window');
  createMonitorWindow();
  return { success: true };
});

ipcMain.handle('close-monitor-window', async () => {
  log('info', 'IPC: close-monitor-window');
  closeMonitorWindow();
  return { success: true };
});

ipcMain.handle('close-monitor-window-ipc', async () => {
  log('info', 'IPC: close-monitor-window-ipc');
  closeMonitorWindow();
  return { success: true };
});

ipcMain.handle('toggle-monitor-always-on-top', async (event, value) => {
  log('info', 'IPC: toggle-monitor-always-on-top', value);
  return setMonitorAlwaysOnTop(value);
});

ipcMain.handle('is-monitor-always-on-top', async () => {
  return monitorAlwaysOnTop;
});

ipcMain.handle('capture-screen', async () => {
  log('info', 'IPC: capture-screen');
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length === 0) {
      log('error', 'No screen sources found');
      return { success: false, error: 'No screen sources found' };
    }

    const primarySource = sources[0];
    const thumbnail = primarySource.thumbnail;
    const dataUrl = thumbnail.toDataURL();

    log('info', 'Screen captured successfully, size:', thumbnail.getSize().width, 'x', thumbnail.getSize().height);
    return {
      success: true,
      image: dataUrl,
      width: thumbnail.getSize().width,
      height: thumbnail.getSize().height
    };
  } catch (error) {
    log('error', 'Screen capture failed:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-monitor-position', async (event, x, y) => {
  if (monitorWindow) {
    monitorWindow.setPosition(x, y);
    log('info', 'Monitor position set to:', x, y);
  }
  return { success: true };
});

ipcMain.handle('minimize-monitor-window', async () => {
  if (monitorWindow) {
    monitorWindow.minimize();
  }
  return { success: true };
});

app.whenReady().then(async () => {
  log('info', 'App ready, creating window...');
  createWindow();

  if (isDev) {
    try {
      await startDevServer();
    } catch (error) {
      log('warn', 'Could not auto-start dev server:', error.message);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('info', 'All windows closed');
  if (process.platform !== 'darwin') {
    cleanupOnExit();
  }
});

app.on('before-quit', (event) => {
  log('info', 'Before quit event received');
  event.preventDefault();
  cleanupOnExit();
});

app.on('will-quit', () => {
  log('info', 'Will quit event');
});

process.on('exit', (code) => {
  log('info', `Process exiting with code ${code}`);
});

process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception:', error.message);
});
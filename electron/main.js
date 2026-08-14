const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Sri Explainer - OTT Streaming",
    icon: path.join(__dirname, "../frontend/public/icon-512.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Target local server during development or production URL
  const targetUrl = process.env.ELECTRON_START_URL || "https://sriexplainer.in";
  mainWindow.loadURL(targetUrl);

  // Handle external links safely in browser instead of electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Custom minimal application menu
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow.reload() },
        { label: "Toggle Fullscreen", accelerator: "F11", click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: "separator" },
        { label: "Exit", role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Zoom In", role: "zoomIn" },
        { label: "Zoom Out", role: "zoomOut" },
        { label: "Reset Zoom", role: "resetZoom" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

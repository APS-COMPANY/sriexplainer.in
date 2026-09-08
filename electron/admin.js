const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

let controlWindow;

function createControlWindow() {
  const iconPath = process.platform === "win32"
    ? path.join(__dirname, "icon.ico")
    : path.join(__dirname, "icon.png");

  controlWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Sri Explainer Control Center",
    icon: iconPath,
    backgroundColor: "#080808",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Clean User-Agent so Google OAuth and auth cookies work seamlessly
  const defaultUA = controlWindow.webContents.getUserAgent();
  const cleanUA = defaultUA
    .replace(/Electron\/\S+\s?/gi, "")
    .replace(/sri-explainer\/\S+\s?/gi, "");
  controlWindow.webContents.setUserAgent(cleanUA);

  // Directly load the Control Center dashboard
  const targetUrl = process.env.CONTROL_CENTER_URL || "https://sriexplainer.in/admin/control-center";
  controlWindow.loadURL(targetUrl);

  // Custom Desktop Menu for Executive Control
  const menuTemplate = [
    {
      label: "Control Center",
      submenu: [
        {
          label: "Sync Live Telemetry",
          accelerator: "CmdOrCtrl+R",
          click: () => controlWindow.reload()
        },
        {
          label: "Hard Refresh (Clear Cache)",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => controlWindow.webContents.reloadIgnoringCache()
        },
        { type: "separator" },
        {
          label: "Open Website in Browser",
          click: () => shell.openExternal("https://sriexplainer.in")
        },
        {
          label: "Open AdMob Console",
          click: () => shell.openExternal("https://admob.google.com/")
        },
        {
          label: "Open AdSense Console",
          click: () => shell.openExternal("https://adsense.google.com/")
        },
        { type: "separator" },
        { label: "Exit", role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Fullscreen", accelerator: "F11", click: () => controlWindow.setFullScreen(!controlWindow.isFullScreen()) },
        { label: "Developer Tools", accelerator: "F12", click: () => controlWindow.webContents.toggleDevTools() },
        { type: "separator" },
        { label: "Zoom In", role: "zoomIn" },
        { label: "Zoom Out", role: "zoomOut" },
        { label: "Reset Zoom", role: "resetZoom" }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  controlWindow.on("closed", () => {
    controlWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("in.sriexplainer.controlcenter");
  }
  createControlWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

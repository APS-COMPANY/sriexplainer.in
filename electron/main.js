const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  const iconPath = process.platform === "win32"
    ? path.join(__dirname, "icon.ico")
    : path.join(__dirname, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Sri Explainer",
    icon: iconPath,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Remove "Electron" from User-Agent so Google OAuth does not block with "disallowed_useragent"
  const defaultUA = mainWindow.webContents.getUserAgent();
  const cleanUA = defaultUA
    .replace(/Electron\/\S+\s?/gi, "")
    .replace(/sri-explainer\/\S+\s?/gi, "");
  mainWindow.webContents.setUserAgent(cleanUA);

  // Target local server during development or production URL
  const targetUrl = process.env.ELECTRON_START_URL || "https://sriexplainer.in";
  mainWindow.loadURL(targetUrl);

  // Handle popups & OAuth flows safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 1. Allow Google OAuth, Cashfree, and internal app popups directly inside the app
    if (
      url.includes("accounts.google.com") ||
      url.includes("google.com/o/oauth2") ||
      url.includes("apis.google.com") ||
      url.includes("cashfree.com") ||
      url.includes("sriexplainer.in")
    ) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          backgroundColor: "#000000",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        }
      };
    }

    // 2. Open external links (Twitter, Discord, Rumble, YouTube, etc.) in default Windows browser
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

// Ensure clean User-Agent on all child windows/popups so Google OAuth works seamlessly
app.on("web-contents-created", (event, contents) => {
  const defaultUA = contents.getUserAgent();
  const cleanUA = defaultUA
    .replace(/Electron\/\S+\s?/gi, "")
    .replace(/sri-explainer\/\S+\s?/gi, "");
  contents.setUserAgent(cleanUA);
});

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("in.sriexplainer.app");
  }
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

const fs = require("fs");
const path = require("path");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  screen,
} = require("electron");

const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");
const DEFAULT_SETTINGS = {
  enabled: true,
  displayId: null,
  spacing: 40,
  color: "#00ff00",
  opacity: 0.35,
};

const SPACING_OPTIONS = [8, 16, 24, 32, 40, 48, 64, 80];
const OPACITY_OPTIONS = [0.1, 0.2, 0.3, 0.35, 0.4, 0.5, 0.6, 0.8];
const COLOR_OPTIONS = [
  { label: "Green", value: "#00ff00" },
  { label: "Cyan", value: "#00ffff" },
  { label: "Magenta", value: "#ff00ff" },
  { label: "White", value: "#ffffff" },
  { label: "Yellow", value: "#ffff00" },
];

let overlayWindow = null;
let tray = null;
let isQuitting = false;
let settings = loadSettings();

function loadSettings() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`);
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

function createTrayIcon() {
  const traySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="#202124"/>
  <path d="M0 4.5h16M0 8h16M0 11.5h16M4.5 0v16M8 0v16M11.5 0v16" stroke="#32d74b" stroke-width="1"/>
</svg>`;
  return nativeImage
    .createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(traySvg)}`)
    .resize({ width: 16, height: 16 });
}

function getDisplayLabel(display, index) {
  const suffix = display.label ? `: ${display.label}` : "";
  return `Display ${index + 1}${suffix} (${display.bounds.width}x${display.bounds.height})`;
}

function getResolvedDisplay() {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    return null;
  }

  const selected = displays.find((item) => String(item.id) === String(settings.displayId));
  if (selected) {
    return selected;
  }

  const primary = screen.getPrimaryDisplay();
  settings.displayId = primary.id;
  saveSettings();
  return primary;
}

function ensureWindowBounds() {
  if (!overlayWindow) {
    return;
  }

  const targetDisplay = getResolvedDisplay();
  if (!targetDisplay) {
    overlayWindow.hide();
    return;
  }

  overlayWindow.setBounds(targetDisplay.bounds);
}

function sendOverlayConfig() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send("overlay:config", {
    spacing: settings.spacing,
    color: settings.color,
    opacity: settings.opacity,
  });
}

function refreshOverlayVisibility() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  ensureWindowBounds();
  if (settings.enabled) {
    overlayWindow.showInactive();
    sendOverlayConfig();
  } else {
    overlayWindow.hide();
  }
}

function createOverlayWindow() {
  const targetDisplay = getResolvedDisplay() || screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setMenuBarVisibility(false);

  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));

  overlayWindow.webContents.on("did-finish-load", () => {
    refreshOverlayVisibility();
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("Grid Overlay");
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) {
    return;
  }

  const displays = screen.getAllDisplays();
  const displaySubmenu = displays.map((display, index) => ({
    label: getDisplayLabel(display, index),
    type: "radio",
    checked: String(display.id) === String(settings.displayId),
    click: () => {
      settings.displayId = display.id;
      saveSettings();
      refreshOverlayVisibility();
      rebuildTrayMenu();
    },
  }));

  if (displaySubmenu.length === 0) {
    displaySubmenu.push({
      label: "No display available",
      enabled: false,
    });
  }

  const template = [
    {
      label: "Show Grid",
      type: "checkbox",
      checked: settings.enabled,
      click: (menuItem) => {
        settings.enabled = menuItem.checked;
        saveSettings();
        refreshOverlayVisibility();
      },
    },
    { type: "separator" },
    {
      label: "Display",
      submenu: displaySubmenu,
    },
    {
      label: "Grid Spacing",
      submenu: SPACING_OPTIONS.map((value) => ({
        label: `${value}px`,
        type: "radio",
        checked: settings.spacing === value,
        click: () => {
          settings.spacing = value;
          saveSettings();
          sendOverlayConfig();
          rebuildTrayMenu();
        },
      })),
    },
    {
      label: "Grid Color",
      submenu: COLOR_OPTIONS.map((item) => ({
        label: item.label,
        type: "radio",
        checked: settings.color.toLowerCase() === item.value.toLowerCase(),
        click: () => {
          settings.color = item.value;
          saveSettings();
          sendOverlayConfig();
          rebuildTrayMenu();
        },
      })),
    },
    {
      label: "Grid Opacity",
      submenu: OPACITY_OPTIONS.map((value) => ({
        label: `${Math.round(value * 100)}%`,
        type: "radio",
        checked: settings.opacity === value,
        click: () => {
          settings.opacity = value;
          saveSettings();
          sendOverlayConfig();
          rebuildTrayMenu();
        },
      })),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function setupDisplayEvents() {
  const handleDisplayChange = () => {
    ensureWindowBounds();
    rebuildTrayMenu();
    refreshOverlayVisibility();
  };
  screen.on("display-added", handleDisplayChange);
  screen.on("display-removed", handleDisplayChange);
  screen.on("display-metrics-changed", handleDisplayChange);
}

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  setupDisplayEvents();
  refreshOverlayVisibility();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("activate", () => {
  refreshOverlayVisibility();
});

app.on("browser-window-created", (_event, window) => {
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
});

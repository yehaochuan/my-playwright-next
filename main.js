import { app, BrowserWindow } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { fork } from "child_process";
import { existsSync } from "fs";
import http from "http";

// 全局变量：存储 Next.js 服务进程
let mainWindow = null;
let nextServer = null;

// 配置：Next.js 服务端口和 URL
const NEXT_PORT = 6688;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// 把 app 根路径注入环境变量，供 Next.js API route 使用
process.env.APP_ROOT = __dirname;

// 轮询等待 Next 服务就绪
function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error("等待 Next 服务超时"));
        } else {
          setTimeout(tryOnce, 500);
        }
      });
    };
    tryOnce();
  });
}

// 启动 Next.js 服务（standalone 模式：fork 独立 server.js）
async function startNextServer() {
  const standaloneServer = join(__dirname, ".next/standalone/server.js");

  // 有 standalone 产物则 fork 启动；否则认为是开发模式（next dev 已在 6688 运行）
  if (existsSync(standaloneServer)) {
    nextServer = fork(standaloneServer, [], {
      cwd: join(__dirname, ".next/standalone"),
      env: {
        ...process.env,
        PORT: String(NEXT_PORT),
        HOSTNAME: "localhost",
        APP_ROOT: __dirname,
        ELECTRON_RUN_AS_NODE: "1", // 让 electron 以纯 Node 方式运行 server.js
      },
    });
    nextServer.on("error", (err) => {
      console.error("Next standalone server 启动失败:", err);
    });
  }

  await waitForServer(NEXT_URL);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  mainWindow.loadURL(NEXT_URL).catch((err) => {
    mainWindow.loadURL(
      `data:text/html,<p>createWindow error: ${err.message}</p>`,
    );
  });
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await startNextServer();
    createWindow();
  }
});

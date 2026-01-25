import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import treeKill from 'tree-kill';
import waitOn from 'wait-on';

// 全局变量：存储 Next.js 服务进程
let nextProcess = null;
let mainWindow = null;

// 配置：Next.js 服务端口和 URL
const NEXT_PORT = 3000;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

// 判断环境：开发/生产
const isDev = process.env.NODE_ENV === 'development';

// 启动 Next.js 服务
function startNextServer() {
  return new Promise((resolve, reject) => {
    // 确定 Next.js 启动命令（开发/生产区分）
    const cmd = isDev ? 'next' : 'node';
    const args = isDev 
      ? ['dev', '-p', NEXT_PORT] // 开发环境：next dev -p 3000
      : [join(__dirname, 'node_modules/next/dist/bin/next'), 'start', '-p', NEXT_PORT]; // 生产环境：next start -p 3000

    // 启动子进程
    nextProcess = spawn(cmd, args, {
      cwd: __dirname, // 工作目录为项目根目录
      stdio: isDev ? 'inherit' : 'ignore', // 开发环境打印日志，生产环境忽略
      env: {
        ...process.env,
        PORT: NEXT_PORT,
        NODE_ENV: isDev ? 'development' : 'production',
      },
    });

    // 监听进程错误
    nextProcess.on('error', (err) => {
      console.error('Next.js 服务启动失败：', err);
      reject(err);
    });

    // 等待 Next.js 服务端口可用
    waitOn({ 
      resources: [`tcp:localhost:${NEXT_PORT}`],
      timeout: 10000, // 超时时间 10 秒
    }, (err) => {
      if (err) {
        console.error('等待 Next.js 服务超时：', err);
        reject(err);
      } else {
        console.log('Next.js 服务启动成功：', NEXT_URL);
        resolve();
      }
    });
  });
}

// 创建 Electron 窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 生产环境建议开启，开发环境可关闭
    },
  });

  // 加载 Next.js 服务的 URL（核心）
  mainWindow.loadURL(NEXT_URL);

  // 开发环境打开调试工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用启动逻辑
app.whenReady().then(async () => {
  try {
    // 先启动 Next.js 服务，再创建窗口
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('应用启动失败：', err);
    app.quit();
  }
});

// 所有窗口关闭时终止 Next.js 服务
app.on('window-all-closed', () => {
  // 杀死 Next.js 子进程（包括子进程的子进程）
  if (nextProcess) {
    treeKill(nextProcess.pid);
    nextProcess = null;
  }
  // Mac 下保留应用，其他系统退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Mac 点击 Dock 图标重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出时确保杀死 Next.js 服务
app.on('before-quit', () => {
  if (nextProcess) {
    treeKill(nextProcess.pid);
  }
});
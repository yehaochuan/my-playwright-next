import { app, BrowserWindow } from 'electron';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)



let nextProcess = null;
let mainWindow = null;
const NEXT_URL = 'http://localhost:3000';


// 创建 Electron 窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true, // 安全最佳实践：关闭 Node 集成
            contextIsolation: false, // 开启上下文隔离
            enableRemoteModule: true, 
        }
    });

    mainWindow.loadURL(NEXT_URL).catch(err => {
        console.error('加载 Next.js 服务失败：', err);
        mainWindow.loadURL('data:text/html,<p> server error </p>')
    });

    mainWindow.webContents.openDevTools(); // 开发者工具

    // 窗口关闭时，终止 Next.js 服务进程
    mainWindow.on('closed', () => {
        if (nextProcess) {
            nextProcess.kill(); // 杀死 Next 服务进程
            nextProcess = null;
        }
    });
}

async function startNextProductionServer() {
    const next = (await import('next')).default
    const nextApp = next({
        dev: false,
        dir: __dirname,
        quiet: true,
    })

    await nextApp.prepare()

    const handle = nextApp.getRequestHandler()
    const { createServer } = await import('http')
    const server = createServer((req, res) => {
        handle(req, res)
    })
    return new Promise((resolve, reject) => {
        server.listen(3000, "localhost", (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

app.whenReady().then(async () => {
    await startNextProductionServer();
    createWindow();
});

// 关闭所有窗口时退出应用（并清理 Next 服务）
app.on('window-all-closed', () => {
    if (nextProcess) {
        nextProcess.kill();
    }
    if (process.platform !== 'darwin') app.quit();
});

// 重新点图标
app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await startNextProductionServer();
        createWindow();
    }
})
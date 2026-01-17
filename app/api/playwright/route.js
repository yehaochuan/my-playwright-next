// app/api/hello/route.js
// 处理 GET 请求

import { chromium } from 'playwright'


export async function GET(request) {
    try {


        const browser = await chromium.launch({
            headless: true,
            // 关键：手动指定本地 Chrome 可执行路径（Mac 系统默认路径）
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: false,
            args: [
                '--no-sandbox', // 解决权限问题
                '--disable-gpu', // 禁用GPU加速（macOS 必加）
                '--no-first-run', // 跳过首次运行引导
                '--no-default-browser-check', // 跳过默认浏览器检查
                '--disable-blink-features=AutomationControlled', // 避免检测
                '--window-size=1920,1080', // 强制设置窗口尺寸（防止空白）
                '--app=https://www.baidu.com', // 可选：直接以应用模式打开URL（窗口更稳定）
            ],
            handleSIGINT: true,
        });
        const page = await browser.newPage({
            viewport: { width: 1200, height: 800 }, // 页面独立视口（优先级高于上下文）
            locale: 'zh-CN', // 页面语言
        });
        console.log(page, 'page');

        await page.goto('https://www.baidu.com')
    } catch (error) {
        console.log(error);

    }


    return Response.json({
        code: 200,
        message: `GET 请求成功`,
        data: {}
    });
}

// 处理 POST 请求
// export async function POST(request) {
//   try {
//     // 1. 解析请求体（JSON 格式）
//     const body = await request.json(); // 若为表单数据：await request.formData()
//     const { username, password } = body;

//     // 2. 模拟业务逻辑（如验证、数据库操作）
//     if (!username || !password) {
//       return Response.json(
//         { code: 400, message: '用户名/密码不能为空' },
//         { status: 400 } // 设置 HTTP 状态码
//       );
//     }

//     // 3. 返回成功响应
//     return Response.json({
//       code: 200,
//       message: 'POST 请求成功',
//       data: { username, token: 'mock-token-123456' }
//     });
//   } catch (error) {
//     // 4. 错误处理
//     return Response.json(
//       { code: 500, message: '服务器内部错误', error: error.message },
//       { status: 500 }
//     );
//   }
// }
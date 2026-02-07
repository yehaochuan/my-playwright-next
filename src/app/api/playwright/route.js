
export async function GET(request) {

}

// 处理 POST 请求
export async function POST(request) {
    try {

        const obj = await import("playwright")

        return Response.json({
            code: 200,
            message: `1 请求成功`,
            data: {
                obj
            }
        });

        // const browser = await chromium.launch({ headless: false });



        // const page = await browser.newPage();
        // await page.goto('https://www.baidu.com')



    } catch (error) {
        return Response.json({
            code: 200,
            message: `GET 请求成功`,
            data: {
                error
            }
        });

    }

}
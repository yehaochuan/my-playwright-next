import type { NextRequest } from "next/server";
import type { Browser } from "playwright";
import type { ServiceConfig } from "@/app/consts";

interface DeployBody {
  config: ServiceConfig;
  path: string;
  userName: string;
  passWord: string;
  type?: string;
  env?: string;
}

type DeployStatus = "start" | "pending" | "success";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

let status: DeployStatus = "start";
let browser: Browser | null = null;
let textList: string[] = [];

export async function GET() {
  return Response.json({ success: "true" });
}

export async function POST(request: NextRequest) {
  const { config, path, userName, passWord, type, env } =
    (await request.json()) as DeployBody;
  if (type === "end") {
    textList.push("结束任务");
    await closeAllPage();
    return Response.json({ success: true, status: "success", textList });
  }
  if (status === "pending") {
    return Response.json({ success: true, status, textList });
  }
  if (status === "success") {
    status = "start";
    return Response.json({ success: true, status: "success", textList });
  }
  status = "pending";
  textList = [];

  const { chromium } = await import("playwright");
  browser = await chromium.launch({
    // headless: false,
  });
  const page = await browser.newPage();
  let mirrorText = "";

  await page.goto("https://jenkins.precas.webullbroker.com/login");

  // step1 => Login
  async function jenkinsLogin() {
    textList.push("登陆中...");
    await page.locator("#j_username").fill(userName);
    await page.locator("#j_password").fill(passWord);
    await page.locator('button:has-text("登录")').click();
    await delay(3000);
    textList.push("登陆完成...");
  }
  await jenkinsLogin();

  // step2 => build
  async function gotoBuildHistory() {
    textList.push("跳转jenkins页面中...");
    await page.goto(config.value);
    await page.selectOption("#gitParameterSelect", { value: path });

    if (env === "uat") {
      const targetDiv = page.locator(
        '.jenkins-form-description:has-text("测试环境部署选项(Test环境|UAT环境|同时部署)")',
      );
      const selectInput = targetDiv
        .locator("xpath=following-sibling::*[1]")
        .locator(".jenkins-select__input");
      await selectInput.selectOption({ value: "uat" });
    }
    const div = await page.$("#bottom-sticker");
    const btn = await div!.$('button:has-text("Build")');
    await btn!.click();
    textList.push("到达页面，等待获取镜像中...");
    await delay(3000);
  }
  await gotoBuildHistory();

  // step3 等待 获取镜像
  async function getJenkinsLog() {
    await page
      .locator("#jenkins-build-history")
      .locator(".app-progress-bar")
      .first()
      .click();

    let currentText = "";
    let timer = setInterval(async () => {
      const targetSpan = await page
        .locator("span")
        .filter({ hasText: "[Pre-harbor-addr]" })
        .first();

      if (targetSpan && targetSpan.textContent) {
        try {
          currentText = (await targetSpan.textContent({ timeout: 3000 })) ?? "";

          if (currentText) {
            clearInterval(timer);
            textList.push("获取成功，等待跳转 Rancher 页...");
            mirrorText = currentText.split(":")?.[1].trim();

            gotoRancherLogin();
          }
        } catch (error) {
          console.log("打包未完成，过3秒后重新获取镜像");
        }
      } else {
        currentText = "";
      }
    }, 3000);
  }
  await getJenkinsLog();

  // step4 去 Rancher 登陆
  async function gotoRancherLogin() {
    await page.goto(
      "https://pre-eks-rancher.webullbroker.com/dashboard/auth/login",
    );
    await page
      .locator(".labeled-input")
      .first()
      .locator("input")
      .fill(userName);
    await page.locator(".labeled-input").last().locator("input").fill(passWord);

    await page
      .locator("span")
      .filter({ hasText: "Log in with OpenLDAP" })
      .click();

    await delay(3000);

    goToImageUrl(config?.buildUrlList?.filter((item) => item.checked));
  }

  //  step5 去获取镜像地址
  async function goToImageUrl(regionList: ServiceConfig["buildUrlList"]) {
    await page.goto(regionList[0]?.value);
    try {
      await page.locator(".role-multi-action").first().click();

      await page.locator(".icon-edit").first().click();

      goToSetImage(regionList);
    } catch (error) {
      console.log("rancher 加载中...", error);
    }
  }

  async function goToSetImage(regionList: ServiceConfig["buildUrlList"]) {
    textList.push(`替换${regionList[0]?.label}中...`);

    try {
      let timer = setInterval(async () => {
        try {
          const item = await page.getByPlaceholder("e.g. nginx:latest", {
            timeout: 3000,
          } as never);
          const text = await item.inputValue();
          const newText = `${text?.split(":")?.[0]}:${mirrorText || ""}`;

          await item.fill(newText);
          page
            .locator(".cru-resource-footer")
            .locator("button")
            .locator("span")
            .filter({ hasText: "Save" })
            .click();

          clearInterval(timer);
          textList.push(`${regionList[0]?.label} 设置完成!`);

          await delay(3000);

          const newRegionList = regionList.slice(1);

          if (newRegionList.length > 0) {
            goToImageUrl(newRegionList);
            return;
          }
          closeAllPage();
        } catch (error) {
          console.log("页面加载超时", error);
        }
      }, 5000);
    } catch (error) {
      console.log("页面加载超时，未登陆或未找到该元素");
    }
  }

  async function closeAllPage() {
    // if (page) await page.close();
    if (browser) await browser.close();
    status = "success";
  }

  return Response.json({ success: true });
}

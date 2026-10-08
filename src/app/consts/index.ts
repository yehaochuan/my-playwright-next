// 各地区 Rancher 部署地址
export const REGION_URL: Record<string, string> = {
  US: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-qgbmk5d4/explorer/apps.deployment/web/web-webull-inst-bo#pods",
  HK: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/hk-web/web-webull-inst-bo#pods",
  AU: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/au-fin-web/web-webull-inst-bo#pods",
  JP: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/jp-web/web-webull-inst-bo#pods",
  MY: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/my-fin-web/web-webull-inst-bo#pods",
  WS: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/us-pt2/web-webull-inst-bo#pods",
  SG: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/sg-web/web-webull-inst-bo#pods",
  TH: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/th-fin-web/web-webull-inst-bo#pods",
  GB: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/uk-fin-web/web-webull-inst-bo#pods",
  BR: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/br-fin-web/web-webull-inst-bo-br#pods",
  MX: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/br-fin-web/web-webull-inst-bo-mx#pods",
  ZA: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-rzfrmpbs/explorer/apps.deployment/za-web/web-webull-inst-bo#pods",
  EU: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-ppztfwfn/explorer/apps.deployment/eu-web/web-webull-inst-bo#pods",
};

// UAT 环境 Rancher 部署地址
export const UAT_REGION_URL: Record<string, string> = {
  US: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/us-fin-web/web-webull-inst-bo#pods",
  HK: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/hk-fin-web/web-webull-inst-bo#pods",
  JP: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/jp-fin-web/web-webull-inst-bo#pods",
  AU: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/au-fin-web/web-webull-inst-bo#pods",
  MY: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-2xv59mgn/explorer/apps.deployment/my-fin-web/web-webull-inst-bo#pods",
  SG: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/sg-fin-web/web-webull-inst-bo#pods",
  TH: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/th-fin-web/web-webull-inst-bo#pods",
  WS: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-2xv59mgn/explorer/apps.deployment/us-pts/web-webull-inst-bo#pods",
  GB: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/uk-fin-web/web-webull-inst-bo#pods",
  BR: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-2xv59mgn/explorer/apps.deployment/br-fin-web/web-webull-inst-bo-br#pods",
  MX: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-2xv59mgn/explorer/apps.deployment/br-fin-web/web-webull-inst-bo-mx#pods",
  ZA: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-8chnl8gg/explorer/apps.deployment/za-web/web-webull-inst-bo#pods",
  EU: "https://pre-eks-rancher.webullbroker.com/dashboard/c/c-m-2xv59mgn/explorer/apps.deployment/eu-web/web-webull-inst-bo#pods",
};

// 单个部署地址项
export interface BuildTarget {
  label: string;
  value: string;
  checked?: boolean;
}

// 单个服务配置项
export interface ServiceConfig {
  label: string;
  value: string;
  checked: boolean;
  buildUrlList: BuildTarget[];
}

// UAT 环境默认服务配置
export const UAT_DEFAULT_CONFIG: ServiceConfig[] = [
  {
    label: "web-inst-bo-service",
    checked: true,
    value:
      "https://jenkins.precas.webullbroker.com/job/web-webull-inst-bo-pipeline/build?delay=0sec",
    buildUrlList: Object.entries(UAT_REGION_URL).map(([key, url]) => ({
      label: key,
      value: url,
      checked: false,
    })),
  },
];

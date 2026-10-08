

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


export interface PathControllerConfig {
  doubleClickTime: number;
  autoLoadSplineTemplates: boolean;
  doubleClickHoldTime: number;
  DEBUG: Record<string, boolean>;
}

export const config: PathControllerConfig = {
  doubleClickTime: 500,

  //auto load 1d bspline templates, can hurt startup time
  autoLoadSplineTemplates: true,

  //timeout for press-and-hold (touch) version of double clicking
  doubleClickHoldTime: 750,
  DEBUG              : {},
};

export function setConfig(obj: Partial<PathControllerConfig>): void {
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const key = k as keyof PathControllerConfig;
      config[key] = obj[key] as never;
    }
  }
}

export default config;

export type InjectionConfig = {
  type: string;
  url: string;
  rootElementId?: string;
  appId?: string;
  origin?: string;
  customElementTagName?: string;
  customElementDataProperty?: string;
  onBeforeInjected?: (appInstanceId: string) => {};
  onAfterInjected?: (appInstanceId: string) => {};
  onInitialized?: (appInstanceId: string, eventId: string) => {};
  onReady?: (appInstanceId: string, eventId: string, eventName: string, isReady: boolean) => {};
  onBeforeURLUpdate?: (appInstanceId: string) => {}
  onError?: (appInstanceId: string, eventId: string) => {};
  onTerminate?: (appInstanceId: string, eventId: string) => {};
  onBeforeRemoved?: (id: string) => {};
  onRemoved?: (id: string) => {};
  contentWindow?: Window;
}

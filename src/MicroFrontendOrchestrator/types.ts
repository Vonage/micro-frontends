export type InjectionConfig = {
  type: string;
  url: string;
  rootElementId?: string;
  appId?: string;
  origin?: string;
  customElementTagName?: string;
  customElementDataProperty?: string;
  customEvents?: {
    [eventName: string]: (appInstanceId: string, eventId: string, eventName: string, payload: any) => any
  }
  onBeforeInjected?: (appInstanceId: string) => any;
  onAfterInjected?: (appInstanceId: string) => any;
  onInitialized?: (appInstanceId: string, eventId: string) => any;
  onReady?: (appInstanceId: string, eventId: string, eventName: string, isReady: boolean) => any;
  onBeforeURLUpdate?: (appInstanceId: string) => any;
  onError?: (appInstanceId: string, eventId: string) => any;
  onTerminate?: (appInstanceId: string, eventId: string) => any;
  onBeforeRemoved?: (id: string) => any;
  onRemoved?: (id: string) => any;
  contentWindow?: Window;
};

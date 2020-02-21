export type EventHandlerFunction = (...args: any) => any;

export type ConstructorOptions = { instance?: HTMLElement; eventCallback?: EventHandlerFunction; validateIframeParentOrigin?: boolean, environmentMapping?: { [env: string]: string} };

export type Options = {
  requestTimeout?: number;
}

export type MicroFrontendRequest = {
  eventId: string;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
  requestTimeout: ReturnType<typeof setTimeout>;
}

export enum MicroFrontEndComponentType {
  IFRAME,
  WEB_COMPONENT
}

export interface MicroFrontendComponentConstructor {
  new (options: ConstructorOptions): IMicroFrontendComponent;
}

export interface IMicroFrontendComponent {
  send: (eventId: string, event: string, payload: any) => void;
}


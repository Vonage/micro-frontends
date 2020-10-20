import { ConstructorOptions } from '../types';

export type MicroFrontendComponentConstructor = new (options: ConstructorOptions) => IMicroFrontendComponent;

export interface IMicroFrontendComponent {
  sendEventToHost: (eventId: string, event: string, payload: any) => void;
}

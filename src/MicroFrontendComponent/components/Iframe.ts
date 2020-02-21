import get from 'lodash.get';
import {
  ConstructorOptions,
  IMicroFrontendComponent,
  EventHandlerFunction
} from "../types";
import {getQueryString} from "../utils";

export class MicroFrontendIframe implements IMicroFrontendComponent {
  private readonly parentOrigin: string;
  private readonly validateIframeParentOrigin: boolean;
  private readonly cb: EventHandlerFunction;

  constructor(options: ConstructorOptions) {
    const parentOriginMapping = get(options, 'parentOriginMapping');
    this.parentOrigin = get(parentOriginMapping, [getQueryString('environment')]);
    this.validateIframeParentOrigin = this.parentOrigin && get(options, 'validateIframeParentOrigin', false);

    this.cb = get(options, 'eventCallback', () => {});
    window.addEventListener('message', (e: MessageEvent & { detail?: any }) => this.handleIframeParentMessage(e), false);
  }

  send(eventId: string, event: string, payload: any) {
    const sentObject = { eventId, event, payload };
    window.parent.postMessage(sentObject, this.validateIframeParentOrigin ? '*' : this.parentOrigin);
  }

  private handleIframeParentMessage(e: MessageEvent & { detail?: any }): void {
    if (!this.validateIframeParentOrigin && (!e.origin || e.origin !== this.parentOrigin)) {
      return;
    }

    const data = e.data || e.detail;

    if (typeof data !== 'object' || !data || !data.eventId) {
      console.warn('Missing data for sending Iframe post message');
      return;
    }

    this.cb(data);
  }

}

import get from 'lodash.get';
import { CUSTOM_ELEMENT_DATA_PROPERTY } from '../../consts';
import { ConstructorOptions, EventHandlerFunction } from '../types';
import { IMicroFrontendComponent } from './types';

export class MicroFrontendWebComponent implements IMicroFrontendComponent {
  private readonly customElement: HTMLElement;
  private readonly dataProperty: any;
  private readonly cb: EventHandlerFunction;

  constructor(options: ConstructorOptions) {
    // Keep a reference to the web-component HTMLElement instance.
    const context = get(options, 'instance');

    if (context && context instanceof HTMLElement) {
      this.customElement = context;
    } else if ((window as any).Vue && context && context instanceof (window as any).Vue) {
      // Check if we are running in a Vue compiled web-component.
      // Vue should be defined globally and the parent node should have a reference to the web-component custom element HTMLElement.
      this.customElement = get(context, '$parent.$options.customElement');
    }

    if (!this.customElement) {
      throw new Error(
        'Mandatory option "context" is missing. The context object must be an instance of HTMLElement or a Vue compiled WebComponent'
      );
    }

    this.dataProperty = null;
    this.cb = get(options, 'eventCallback', () => {});

    // define a custom propety on the webcomponent HTMLElement that will trigger event handling.
    const self = this;
    Object.defineProperty(this.customElement, CUSTOM_ELEMENT_DATA_PROPERTY, {
      get: () => self.dataProperty,
      set: this.cb
    });
  }

  public sendEventToHost(eventId, event, payload): void {
    const sentObject = { eventId, event, payload };
    this.customElement.dispatchEvent(
      new CustomEvent(event, {
        bubbles: false,
        cancelable: false,
        detail: sentObject
      })
    );
  }
}

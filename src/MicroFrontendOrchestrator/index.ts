import uuid from 'uuid/v4';

import { LIFECYCLE_HOOKS } from './consts';
import {CUSTOM_ELEMENT_DATA_PROPERTY} from '../consts';
import {
  generateUniqueDOMId,
  getElementByIdWithError,
  getOriginFromURL,
  loadScript
} from './dom-utils';
import { InjectionConfig } from './types';
import { addValueToMappedArray, removeValueFromMappedArray } from './utils';

class MicroFrontendOrchestrator {
  private readonly appConfigByAppId: { [appId: string]: InjectionConfig };
  private readonly appsIdsByRootElementId: {
    [rootElementId: string]: string[];
  };
  private readonly appInstancesElementIdsByAppId: { [appId: string]: string[] };
  private readonly registeredEvents: { [eventName: string]: any };

  constructor() {
    if (!window || !document) {
      throw new Error('window or document does not exist');
    }

    this.appConfigByAppId = {};
    this.appsIdsByRootElementId = {};
    this.appInstancesElementIdsByAppId = {};
    this.registeredEvents = {};
    window.addEventListener(
      'message',
      e => this.handleIframeMessage(e),
      false
    );
  }

  public async inject(rootElementId: string, appId: string, options: InjectionConfig): Promise<string> {
    if (document.readyState === 'loading') {
      throw new Error(
        'Please wait for the DOM to be ready for interaction before injecting an app'
      );
    }

    if (!rootElementId || !appId || !options) {
      throw new Error('inject Missing arguments');
    }

    if (!options.type || !options.url) {
      throw new Error(
        'inject Missing application type or url configuration'
      );
    }

    const id = generateUniqueDOMId(appId);

    if (options.onBeforeInjected) {
      options.onBeforeInjected(id);
    }

    options.rootElementId = rootElementId;
    options.appId = appId;
    this.appConfigByAppId[id] = options;

    addValueToMappedArray(this.appsIdsByRootElementId, rootElementId, id);
    addValueToMappedArray(this.appInstancesElementIdsByAppId, appId, id);

    // Subscribe expected lifecycle events emitted from child applications.
    this.subscribeLifeCycleEvents(options);

    try {
      if (options.type === 'webcomponent') {
        console.info(`injectWebComponent ${id}`);
        await this.injectWebComponent({ rootElementId, id, options });
      } else if (options.type === 'iframe') {
        console.info(`injectIframe ${id}`);
        const iframeElement = this.injectIframe({
          rootElementId,
          id,
          options
        });
        options.contentWindow = iframeElement.contentWindow;
      }
    } catch (error) {
      this.remove(id);
      throw new Error(`Failed to load application. ${error}`);
    }

    this.hideSiblingNodes(id);
    if (options.onAfterInjected) {
      options.onAfterInjected(id);
    }

    return id;
  }

  public show(id: string): void {
    const appElement = getElementByIdWithError(id);
    appElement.setAttribute('style', 'display:inherit;flex:1;border:none;');
    this.hideSiblingNodes(id);
  }

  public async updateInjectedApplication(id: string, uiSettings: any): Promise<void> {
    if (!id) {
      throw new Error(
        'updateInjectedApplication: Missing application element id'
      );
    }

    if (!uiSettings || !uiSettings.type || !uiSettings.url) {
      // Should we throw new error here or just return... ?
      throw new Error(
        'updateInjectedApplication: Missing application type or url configuration'
      );
    }

    const appConfig = this.appConfigByAppId[id];
    if (!appConfig) {
      throw new Error(
        `updateInjectedApplication: Missing previous configuration for application with id "${id}"`
      );
    }

    if (uiSettings.type !== appConfig.type) {
      this.remove(id);
      this.resetAppConfigData(appConfig);

      await this.inject(appConfig.rootElementId, appConfig.appId, {
        ...appConfig,
        ...uiSettings
      });
    } else {
      this.appConfigByAppId[id] = {
        ...appConfig,
        ...uiSettings
      };

      if (uiSettings.url !== appConfig.url) {
        if (appConfig.onBeforeURLUpdate) {
          appConfig.onBeforeURLUpdate(id);
        }
        await this.updateInjectedApplicationUrl(
          id,
          appConfig.rootElementId,
          this.appConfigByAppId[id]
        );
      }
    }
  }

  /**
   *
   * @param {String} id
   */
  public remove(id: string): void {
    if (!id) {
      return;
    }
    const appConfig = this.appConfigByAppId[id];
    const appId = appConfig.appId;
    const rootElementId = appConfig.rootElementId;
    const rootElement = document.getElementById(rootElementId);
    const appElement = document.getElementById(id);

    if (rootElement && appElement) {
      if (appConfig.onBeforeRemoved) {
        appConfig.onBeforeRemoved(id);
      }
      rootElement.removeChild(appElement);
    }

    removeValueFromMappedArray(this.appsIdsByRootElementId, rootElementId, id);
    removeValueFromMappedArray(this.appInstancesElementIdsByAppId, appId, id);

    delete this.registeredEvents[id];
    delete this.appConfigByAppId[id];

    if (appConfig.onRemoved) {
      appConfig.onRemoved(id);
    }
  }

  public send(id: string, eventId: string, event: string, payload: any, error?: string): void {
    if (!id) {
      return;
    }

    const appConfig = this.appConfigByAppId[id];
    const appElement = document.getElementById(id);
    if (!appConfig || !appElement) {
      return;
    }

    const actualEventId = eventId || uuid();
    if (appConfig.type === 'iframe') {
      (appElement as HTMLIFrameElement).contentWindow.postMessage(
        { eventId: actualEventId, event, payload, error },
        appConfig.origin
      );
    } else if (appConfig.type === 'webcomponent') {
      if (appElement[appConfig.customElementDataProperty] === undefined) {
        console.error(
          'Make sure that the selected component is initialized before you start sending data'
        );
        return;
      }

      appElement[appConfig.customElementDataProperty] = {
        eventId: actualEventId,
        event,
        payload,
        error
      };
    }
  }

  public registerEvent(id: string, eventName: string, cb: (...args: any) => {}): void {
    if (!id || !eventName || !cb) {
      return;
    }

    const appConfig = this.appConfigByAppId[id];
    const appElement = document.querySelector(`#${id}`);
    if (!appConfig || !appElement) {
      return;
    }

    if (appConfig.type === 'iframe') {
      if (!this.registeredEvents[id]) {
        this.registeredEvents[id] = {};
      }
      this.registeredEvents[id][eventName] = {
        name: eventName,
        origin: appConfig.origin,
        action: cb
      };
    } else if (appConfig.type === 'webcomponent') {
      appElement.addEventListener(
        eventName,
        e => {
          const data = (e as any).detail;
          if (data) {
            cb(id, data.eventId, data.eventName, data.payload);
          } else {
            cb(id);
          }
        },
        false
      );
    }
  }

  public unregisterEvent(id: string, eventName: string): void {
    if (!id || !eventName) {
      return;
    }

    const config = this.appConfigByAppId[id];
    if (!config) {
      return;
    }

    if (!this.registeredEvents[id]) {
      return;
    }
    delete this.registeredEvents[id][eventName];
    // TODO: Remove event listener for webcomponent
  }

  public getInstancesIds(appId: string, rootElementId?: string): string[] {
    if(rootElementId){
      return this.appsIdsByRootElementId[rootElementId].filter(appInstanceId => this.appInstancesElementIdsByAppId[appId].indexOf(appInstanceId) >= 0);
    }
    return this.appInstancesElementIdsByAppId[appId] || [];
  }

  private handleIframeMessage(event): void {
    if (!event || !event.data) {
      return;
    }

    const data = event.data;
    const eventName = data.event;
    const eventId = data.eventId;
    const payload = data.payload;

    if (!eventId) {
      return;
    }

    // Find the appId corresponding the iframe that sent the event.
    const id = Object.keys(this.appConfigByAppId).find(
      appId => this.appConfigByAppId[appId].contentWindow === event.source
    );
    if (!id || !this.registeredEvents[id] || !eventName) {
      return;
    }

    const registeredEvent = this.registeredEvents[id][eventName];
    // Make sure that we actually care about this event, from this specifc origin.
    if (!registeredEvent || event.origin !== registeredEvent.origin) {
      console.warn(`Got unsubscribed event ${eventName} from Iframe ${id}`);
      return;
    }

    if (registeredEvent.action) {
      registeredEvent.action(id, eventId, eventName, payload);
    }
  }

  private hideSiblingNodes(id: string): void {
    let siblingElement;
    const rootElementId = this.appConfigByAppId[id].rootElementId;
    const siblingsIds = this.appsIdsByRootElementId[rootElementId].filter(
      item => item !== id
    );
    siblingsIds.forEach(siblingId => {
      siblingElement = document.querySelector(`#${siblingId}`);
      if (siblingElement) {
        siblingElement.setAttribute('style', 'display:none;');
      }
    });
  }

  private injectIframe({ rootElementId, id, options }): HTMLIFrameElement {
    if (!rootElementId || !id || !options.url) {
      throw new Error('injectIframe invalid arguments');
    }

    options.origin = getOriginFromURL(options.url);
    const rootElement = getElementByIdWithError(rootElementId);
    const iframe = document.createElement('iframe');
    iframe.src = options.url;
    iframe.setAttribute('id', id);
    iframe.setAttribute('style', 'border:none; flex:1;');

    // Register custom events before the node is appended to the DOM.
    if (options.customEvents) {
      Object.keys(options.customEvents).forEach(event => {
        if (!this.registeredEvents[id]) {
          this.registeredEvents[id] = {};
        }
        this.registeredEvents[id][event] = {
          name: event,
          origin: options.origin,
          action: options.customEvents[event]
        };
      });
    }

    rootElement.appendChild(iframe);
    return iframe;
  }

  private async injectWebComponent({ rootElementId, id, options }): Promise<void> {
    if (
      !rootElementId ||
      !id ||
      !options.url ||
      !options.customElementTagName
    ) {
      throw new Error('injectWebComponent invalid arguments');
    }
    options.customElementDataProperty =
      options.customElementDataProperty || CUSTOM_ELEMENT_DATA_PROPERTY;
    const rootElement = getElementByIdWithError(rootElementId);
    await loadScript(options.url);

    const webComponent = document.createElement(options.customElementTagName);
    webComponent.setAttribute('id', id);
    webComponent.setAttribute('style', 'flex:1;');

    // Register Initial events before the node is appended to the DOM.
    if (options.customEvents) {
      Object.keys(options.customEvents).forEach(event => {
        webComponent.addEventListener(
          event,
          e => {
            const data = e.detail;
            if (data) {
              options.customEvents[event](
                id,
                data.eventId,
                data.eventName,
                data.payload
              );
            } else {
              options.customEvents[event](id);
            }
          },
          false
        );
      });
    }

    rootElement.appendChild(webComponent);
  }

  private defaultLifecycleCallback(id: string, eventId: string) {
    this.send(id, eventId, null, 'ACK');
  }

  private subscribeLifeCycleEvents(options): void {
    if (!options.customEvents) {
      options.customEvents = {};
    }
    Object.keys(LIFECYCLE_HOOKS).forEach(hook => {
      options.customEvents[LIFECYCLE_HOOKS[hook]] = options[hook] || this.defaultLifecycleCallback.bind(this);
    });
  }

  private async updateInjectedApplicationUrl(id, rootElementId, appConfig): Promise<void> {
    if (appConfig.type === 'iframe') {
      const iframeElement = getElementByIdWithError(id);
      (iframeElement as HTMLIFrameElement).src = appConfig.url;
    } else if (appConfig.type === 'webcomponent') {
      // remove existing web component element
      const rootElement = getElementByIdWithError(rootElementId);
      const webComponent = document.getElementById(id);
      if (webComponent) {
        rootElement.removeChild(webComponent);
      }

      try {
        await this.injectWebComponent({
          rootElementId,
          id,
          options: appConfig
        });
      } catch (error) {
        this.remove(id);
        throw new Error(
          'Failed to load application using webcomponent injection'
        );
      }
    }
  }

  private resetAppConfigData(appConfig: InjectionConfig): void {
    delete appConfig.customElementDataProperty;
    delete appConfig.customElementTagName;
    delete appConfig.contentWindow;
    delete appConfig.origin;
  }
}

const instance = new MicroFrontendOrchestrator();

export default instance;

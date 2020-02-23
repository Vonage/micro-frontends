import uuid from 'uuid';
import {
  MicroFrontendRequest,
  Options,
  EventHandlerFunction,
  ConstructorOptions
} from './types';
import { IMicroFrontendComponent } from "./DOMWrappers/types";
import { detectComponentType, extractOptions } from './utils';
import { DEFAULT_REQUEST_TIMEOUT, NOT_INITIALIZED_ERROR, NOT_SUPPORTED_TYPE_ERROR, REQUEST_TIMED_OUT_ERROR } from './consts';
import { LIFECYCLE } from "../consts";
import { MicroFrontendComponentFactory } from './DOMWrappers';

export default class MicroFrontendComponent {
  private isInitialized: boolean;
  private readonly component: IMicroFrontendComponent;
  private readonly waitingRequests: { [requestId: string]: MicroFrontendRequest };
  private readonly registeredEvents: { [eventName: string]: EventHandlerFunction };

  constructor(options?: ConstructorOptions) {
    this.isInitialized = false;
    this.waitingRequests = {};
    this.registeredEvents = {};
    const injectionType = detectComponentType();

    options = options || {};
    options.eventCallback = this.handleWaitingRequest.bind(this);

    this.component = MicroFrontendComponentFactory.create(injectionType, options);

    if(!this.component) {
      throw new Error(NOT_SUPPORTED_TYPE_ERROR);
    }
  }

  public initialize(options?: Options): Promise<any> {
    return this.createRequest(LIFECYCLE.INITIALIZE, {
      ...extractOptions(options),
      onResolve: () => {
        this.isInitialized = true;
      }
    });
  }

  public ready(options?: Options, isReady: Boolean = true): Promise<void> {
    return this.createRequest(LIFECYCLE.READY,{
      ...extractOptions(options),
      enforceInitialization: true,
      payload: isReady
    });
  }

  public error(error: any, options?: Options): Promise<void> {
    return this.createRequest(LIFECYCLE.ERROR, {
      ...extractOptions(options),
      payload: error
    });
  }

  public terminate(options?: Options): Promise<void> {
    return this.createRequest(LIFECYCLE.TERMINATE, {
      ...extractOptions(options),
      enforceInitialization: true
    });
  }

  public registerEvent(eventName: string, cb: (...args: any) => any): void {
    if (!this.isInitialized) {
      throw new Error(NOT_INITIALIZED_ERROR);
    }
    this.registeredEvents[eventName] = cb;
  }

  public createRequest(requestType: string, {
    payload,
    onResolve,
    onReject,
    requestTimeout,
    enforceInitialization = false
  }: {
    payload?: any;
    onResolve?: (data?: any) => any;
    onReject?: (data?: any) => any;
    requestTimeout?: number;
    enforceInitialization?: boolean;
  }): Promise<any> {
    if (enforceInitialization && !this.isInitialized) {
      return Promise.reject(NOT_INITIALIZED_ERROR);
    }
    return new Promise((resolve, reject) => {
      const resolveFunc = (data: any) => {
        resolve(data);
        if (onResolve) {
          onResolve(data);
        }
      };
      const rejectFunc = (data: any) => {
        reject(data);
        if (onReject) {
          onReject(data);
        }
      };
      const eventId = this.registerRequest(resolveFunc, rejectFunc, requestTimeout || DEFAULT_REQUEST_TIMEOUT);
      this.component.sendEventToHost(eventId, requestType, payload);
    });
  }

  private handleWaitingRequest(data: any): void {
    if (typeof data !== 'object' || !data || !data.eventId) {
      return;
    }

    const registeredEvent = this.registeredEvents[data.event];
    if (registeredEvent) {
      return registeredEvent(data.payload);
    }

    const waitingRequest = this.waitingRequests[data.eventId];
    if (!waitingRequest) {
      return;
    }

    clearTimeout(waitingRequest.requestTimeout);
    if (data.error) {
      waitingRequest.reject(data.error);
      delete this.waitingRequests[data.eventId];
    } else {
      waitingRequest.resolve(data.payload || null);
      delete this.waitingRequests[data.eventId];
    }
  }

  private registerRequest(resolve: (a: any) => any, reject: (a: any) => any, requestTimeout: number): any {
    const self = this;
    const eventId = uuid();
    const timeout = setTimeout(() => {
      self.handleWaitingRequest({ eventId, error: REQUEST_TIMED_OUT_ERROR });
    }, requestTimeout);

    this.waitingRequests[eventId] = {
      eventId,
      reject,
      requestTimeout: timeout,
      resolve
    };
    return eventId;
  }
}

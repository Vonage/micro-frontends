import get from 'lodash.get';
import MicroFrontendComponent from '../../src/MicroFrontendComponent';
import { MicroFrontEndComponentType } from '../../src/MicroFrontendComponent/types';
import { LIFECYCLE } from "../../src/consts";
import { DEFAULT_REQUEST_TIMEOUT, NOT_INITIALIZED_ERROR } from "../../src/MicroFrontendComponent/consts";
import { CUSTOM_ELEMENT_DATA_PROPERTY } from '../../src/consts';
import { detectComponentType } from '../../src/MicroFrontendComponent/utils';

let addEventListenerSpy = null;
const oldPostMessage = window.parent.postMessage;
const postMessageMock = jest.fn();
const MOCK_EVENT_ID = '123';

jest.mock('../../src/MicroFrontendComponent/utils', () => {
  return {
    getQueryString: jest.fn(() => ''),
    detectComponentType: jest.fn(() => MicroFrontEndComponentType.IFRAME),
    extractOptions: jest.fn((options) => { return { requestTimeout: get(options, 'requestTimeout', DEFAULT_REQUEST_TIMEOUT) } })
  };
});

// The uuid function will always return the same id = MOCK_EVENT_ID
jest.mock('uuid/v4', () => () => MOCK_EVENT_ID);
jest.useFakeTimers();

async function initHelper(): Promise<MicroFrontendComponent> {
  const mfc = new MicroFrontendComponent();
  const initializePromise = mfc.initialize();
  window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: { someInitData: 'abc' } } }));
  await initializePromise;
  postMessageMock.mockClear();
  return mfc;
}

describe('MicroFrontendComponent Tests', () => {
  describe('Iframe Tests', () => {
    beforeAll(() => {
      addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      window.parent.postMessage = postMessageMock;
    });

    beforeEach(() => {
      addEventListenerSpy.mockClear();
      postMessageMock.mockClear();
      process.env = { ...process.env, ALLOW_IFRAME_CORS: 'true' };
    });

    test('Contructor', () => {
      new MicroFrontendComponent();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function), false);
    });

    describe('initialize', () => {
      test('Should resolve the promise', async () => {
        const mfc = new MicroFrontendComponent();

        const waitingPromise = mfc.initialize();
        // Simulate answer event fired from the Parent window.
        window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: 'ack' } }));

        expect(postMessageMock).toHaveBeenCalledWith({ eventId: MOCK_EVENT_ID, event: LIFECYCLE.INITIALIZE }, '*');
        await expect(waitingPromise).resolves.toEqual('ack');
      });
    });

    describe('ready', () => {
      test('Should resolve the promise when called without parameters', async () => {
        const mfc = await initHelper();

        const waitingPromise = mfc.ready();
        // Simulate answer event fired from the Parent window.
        window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: 'ack' } }));

        expect(postMessageMock).toHaveBeenCalledWith({ eventId: MOCK_EVENT_ID, event: LIFECYCLE.READY, payload: true }, '*');
        await expect(waitingPromise).resolves.toEqual('ack');
      });

      test('Should resolve the promise when called with parameter', async () => {
        const mfc = await initHelper();

        const waitingPromise = mfc.ready(undefined, false);
        // Simulate answer event fired from the Parent window.
        window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: 'ack' } }));

        expect(postMessageMock).toHaveBeenCalledWith({ eventId: MOCK_EVENT_ID, event: LIFECYCLE.READY, payload: false }, '*');
        await expect(waitingPromise).resolves.toEqual('ack');
      });

      test('Should reject the promise if the MicroFrontendComponent class was not initialized', async () => {
        const mfc = new MicroFrontendComponent();

        await expect(mfc.ready()).rejects.toEqual(NOT_INITIALIZED_ERROR);
      });

      test('Should reject the promise if no answer was sent after the given timeout', async () => {
        const mfc = await initHelper();
        const waitingPromise = mfc.ready({ requestTimeout: 1000 });
        // Simulate Request Timeout
        jest.runOnlyPendingTimers();

        await expect(waitingPromise).rejects.toEqual('Request Timed Out');
      });
    });

    describe('error', () => {
      test('Should resolve the promise', async () => {
        const mfc = await initHelper();
        const waitingPromise = mfc.error('someError');
        // Simulate answer event fired from the Parent window.
        window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: 'ack' } }));

        expect(postMessageMock).toHaveBeenCalledWith({ eventId: MOCK_EVENT_ID, event: LIFECYCLE.ERROR, payload: 'someError' }, '*');
        await expect(waitingPromise).resolves.toEqual('ack');
      });

      test('Should reject the promise if no answer was sent after the given timeout', async () => {
        const mfc = await initHelper();
        const waitingPromise = mfc.error('someError', { requestTimeout: 1000 });
        // Simulate Request Timeout
        jest.runOnlyPendingTimers();

        await expect(waitingPromise).rejects.toEqual('Request Timed Out');
      });
    });

    describe('terminate', () => {
      test('Should resolve the promise', async () => {
        const mfc = await initHelper();
        const waitingPromise = mfc.terminate();
        // Simulate answer event fired from the Parent window.
        window.dispatchEvent(new CustomEvent('message', { detail: { eventId: MOCK_EVENT_ID, payload: 'ack' } }));

        expect(postMessageMock).toHaveBeenCalledWith({ eventId: MOCK_EVENT_ID, event: LIFECYCLE.TERMINATE }, '*');
        await expect(waitingPromise).resolves.toEqual('ack');
      });

      test('Should reject the promise if the VBC object was not initialized', async () => {
        const mfc = new MicroFrontendComponent();
        await expect(mfc.terminate()).rejects.toEqual(NOT_INITIALIZED_ERROR);
      });

      test('Should reject the promise if no answer was sent after the given timeout', async () => {
        const mfc = await initHelper();
        const waitingPromise = mfc.terminate({ requestTimeout: 1000 });
        // Simulate Request Timeout
        jest.runOnlyPendingTimers();

        await expect(waitingPromise).rejects.toEqual('Request Timed Out');
      });
    });

    describe('registerEvent', () => {
      test('Should register custom events', async () => {
        const mfc = await initHelper();
        const callback = jest.fn(() => {});
        const payload = { customEventPayload: '123 '};
        mfc.registerEvent('customEvent', callback);
        window.dispatchEvent(new CustomEvent('message', { detail: {eventId: MOCK_EVENT_ID, event: 'customEvent', payload } }));

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(payload);
      });

      test('Should throw an error if the MicroFrontendComponent was not initialized', async () => {
        const mfc = new MicroFrontendComponent();
        await expect(() => mfc.registerEvent('custom-event', () => console.info('callback'))).toThrowError(NOT_INITIALIZED_ERROR);
      });
    });

    afterAll(() => {
      window.parent.postMessage = oldPostMessage;
    })
  });

  describe('WebComponent Tests', () => {
    beforeAll(() => {
      document.body.innerHTML = '<div></div>';
      detectComponentType.mockImplementationOnce(() => MicroFrontEndComponentType.WEB_COMPONENT);
    });

    test('Contructor', () => {
      const objectDefinePropertySpy = jest.spyOn(Object, 'defineProperty');
      new MicroFrontendComponent({ instance: document.querySelector('div')});

      expect(objectDefinePropertySpy).toHaveBeenCalledTimes(1);
      expect(objectDefinePropertySpy).toHaveBeenCalledWith(expect.any(HTMLElement), CUSTOM_ELEMENT_DATA_PROPERTY, expect.any(Object));
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});

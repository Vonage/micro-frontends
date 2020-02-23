import cuid from 'cuid';

jest.mock('cuid', () => jest.fn(() => 'cga123bcs'));

let MFO;
let removeSpy;

describe('MicroFrontendOrchestrator Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rootId"></div>';
    jest.isolateModules(() => {
      MFO = require('../../src/MicroFrontendOrchestrator').default;
      removeSpy = jest.spyOn(MFO, 'remove');
    });
  });

  describe('inject', () => {
    test('Throws an error for missing rootId', async () => {
      await expect(MFO.inject(null, 'appId', {})).rejects.toEqual(new Error('inject Missing arguments'));
    });

    test('Throws an error for missing appId', async () => {
      await expect(MFO.inject('rootId', null, {})).rejects.toEqual(new Error('inject Missing arguments'));
    });

    test('Throws an error for missing appConfig', async () => {
      await expect(MFO.inject('rootId', 'appId')).rejects.toEqual(new Error('inject Missing arguments'));
    });

    test('Throws an error for missing url in appConfig', async () => {
      await expect(MFO.inject('rootId', 'appId', { type: 'iframe' })).rejects.toEqual(new Error('inject Missing application type or url configuration'));
    });

    test('Throws an error for missing type in appConfig', async () => {
      await expect(MFO.inject('rootId', 'appId', { url: 'abc' })).rejects.toEqual(new Error('inject Missing application type or url configuration'));
    });

    test('Throws an error for failing to load app when missing customElementTagName in appConfig for webcomponents', async () => {
      await expect(MFO.inject('rootId', 'appId', { url: 'abc', type: 'webcomponent' })).rejects.toEqual(new Error('Failed to load application. Error: injectWebComponent invalid arguments'));
    });

    test('Throws an error for non existing rootElement', async () => {
      document.body.innerHTML = '<div></div>';
      await expect(MFO.inject('rootId', 'appId', { url: 'abc', type: 'iframe' })).rejects.toEqual(new Error('Failed to load application. Error: Element with id rootId could not be found on DOM'));
    });

    test('Injects an Iframe', async () => {
      const id = cuid();
      await expect(MFO.inject('rootId', 'appId', { url: 'https://app.vonage.com', type: 'iframe' })).resolves.toEqual(`${id}__appId`);

      const expectedIframe = document.querySelector(`#${id}__appId`);
      expect(expectedIframe).toBeDefined();
      expect(expectedIframe.nodeName).toEqual('IFRAME');
      expect(expectedIframe.src).toEqual('https://app.vonage.com/');
    });

    test('Injects a webcomponent', async () => {
      const loadingPromise = MFO.inject('rootId', 'appId', { url: '/static/tests.js', type: 'webcomponent', customElementTagName: 'mock-custom-element' });

      // Force the mock loading script to load.
      const loadingScript = document.querySelector('script');
      loadingScript.onload();

      const id = cuid();
      await expect(loadingPromise).resolves.toEqual(`${id}__appId`);

      const expectedWebComponent = document.querySelector(`#${id}__appId`);
      expect(expectedWebComponent).toBeDefined();
      expect(expectedWebComponent.nodeName).toEqual('MOCK-CUSTOM-ELEMENT');
    });

    test('Hides Sibling nodes whenever multiple apps are injected with the same root', async () => {
      const id = cuid();
      let loadingPromise = MFO.inject('rootId', 'app1', { url: '/static/tests.js', type: 'webcomponent', customElementTagName: 'mock-custom-element' });
      // Force the mock loading script to load.
      let loadingScript = document.querySelector('script');
      loadingScript.onload();
      // Show the webcomponent
      await loadingPromise;
      const expectedWebComponent1 = document.querySelector(`#${id}__app1`);

      // Show the Iframe
      await MFO.inject('rootId', 'app2', { url: 'https://app.vonage.com', type: 'iframe' });
      const expectedIframe = document.querySelector(`#${id}__app2`);

      expect(expectedWebComponent1.parentElement.id).toEqual('rootId');
      expect(expectedIframe.parentElement.id).toEqual('rootId');

      expect(expectedWebComponent1.style.display).toBe('none');
      expect(expectedIframe.style.display).toBe('');

      // Inject a 3rd app under same root element id
      loadingPromise = MFO.inject('rootId', 'app3', { url: '/static/tests.js', type: 'webcomponent', customElementTagName: 'mock-custom-element' });

      loadingScript = document.querySelectorAll('script').item(1);
      loadingScript.onload();
      // Show the webcomponent
      await loadingPromise;
      const expectedWebComponent2 = document.querySelector(`#${id}__app3`);

      expect(expectedWebComponent2.parentElement.id).toEqual('rootId');

      expect(expectedWebComponent2.style.display).toBe('');
      expect(expectedIframe.style.display).toBe('none');
      expect(expectedWebComponent1.style.display).toBe('none');

    });
  });

  describe('remove', () => {
    test('Does nothing for missing appId', () => {
      MFO.remove();
      expect(removeSpy).toHaveReturnedWith();
    });


    test('Cleans the MFO state even if the app element does not exist', () => {
      MFO.appConfigByAppId['rootId-appId'] = { rootElementId: 'rootId' };
      MFO.remove('rootId-appId');
      expect(removeSpy).toHaveReturnedWith();
      expect(MFO.appConfigByAppId).toEqual({});
    });

    test('Remove an app from the DOM and from the MFO state', () => {
      // Setup
      const id = cuid();
      const domId = `${id}__appId`;
      document.body.innerHTML = `<div id="rootId"><div id="${domId}"></div></div>`;
      MFO.appConfigByAppId[domId] = { appId: 'appId', rootElementId: 'rootId' };
      MFO.appsIdsByRootElementId.rootId = [domId];

      // Test
      MFO.remove(domId);

      // Validate
      expect(removeSpy).toHaveReturnedWith();
      expect(document.querySelector(`#${domId}`)).toEqual(null);
      expect(MFO.appConfigByAppId[domId]).toEqual(undefined);
      // expect(MFO.appsIdsByRootElementId.rootId).toEqual([]);
      expect(MFO.appsIdsByRootElementId.rootId).not.toBeDefined();
    });
  });

  describe('updateInjectedApplication', () => {
    test('Throws an error for missing application element id', async () => {
      await expect(MFO.updateInjectedApplication()).rejects.toEqual(new Error('updateInjectedApplication: Missing application element id'));
    });

    test('Throws an error if missing application uiSettings parameter', async () => {
      await expect(MFO.updateInjectedApplication('appDomId')).rejects.toEqual(new Error('updateInjectedApplication: Missing application type or url configuration'));
    });

    test('Throws an error if missing url field in application uiSettings parameter', async () => {
      await expect(MFO.updateInjectedApplication('appDomId', { type: 'iframe' })).rejects.toEqual(new Error('updateInjectedApplication: Missing application type or url configuration'));
    });

    test('Throws an error if missing type field in application uiSettings parameter', async () => {
      await expect(MFO.updateInjectedApplication('appDomId', { url: 'https://app.vonage.com' })).rejects.toEqual(new Error('updateInjectedApplication: Missing application type or url configuration'));
    });

    test('Throws an error if missing app config for application', async () => {
      await expect(MFO.updateInjectedApplication('appDomId', { url: 'https://app.vonage.com', type: 'iframe' })).rejects.toEqual(new Error('updateInjectedApplication: Missing previous configuration for application with id "appDomId"'));
    });

    test('Replace application when app config type has changed', async () => {
      const id = cuid();
      const appDomId = `${id}__appId`;
      await MFO.inject('rootId', 'appId', { type: 'iframe', url: 'https://app.vonage.com' });

      const loadingPromise = MFO.updateInjectedApplication(appDomId, { type: 'webcomponent', url: '/static/tests.js', customElementTagName: 'mock-custom-element' });
      const loadingScript = document.querySelector('script');
      loadingScript.onload();
      // // // Show the webcomponent
      await loadingPromise;
      console.log(MFO.appConfigByAppId[appDomId]);
      expect(document.querySelector(`#${appDomId}`)).toBeDefined();
      expect(MFO.appsIdsByRootElementId.rootId).toEqual([appDomId]);
      expect(MFO.appConfigByAppId[appDomId]).toEqual({
        type: 'webcomponent',
        url: '/static/tests.js',
        customElementTagName: 'mock-custom-element',
        customElementDataProperty: 'microFrontEndDataBridge',
        rootElementId: 'rootId',
        appId: 'appId',
        customEvents: {
          'MFOAppError': expect.any(Function),
          'MFOAppInitialize': expect.any(Function),
          'MFOAppReady': expect.any(Function),
          'MFOAppTerminate': expect.any(Function)
        }
      });
    });

    test('Update application URL when ui settings type is the same but URL is different', async () => {
      const id = cuid();
      const appDomId = `${id}__appId`;
      await MFO.inject('rootId', 'appId', { type: 'iframe', url: 'https://app.vonage.com' });

      let iframeElement = document.querySelector(`#${appDomId}`);
      expect(iframeElement).toBeDefined();
      expect(iframeElement.nodeName).toEqual('IFRAME');
      expect(iframeElement.src).toEqual('https://app.vonage.com/');

      const appConfig = MFO.appConfigByAppId[appDomId];
      await MFO.updateInjectedApplication(appDomId,{ type: 'iframe', url: 'https://app.qa7.vocal-qa.com' });

      iframeElement = document.querySelector(`#${appDomId}`);
      expect(iframeElement).toBeDefined();
      expect(iframeElement.nodeName).toEqual('IFRAME');
      expect(iframeElement.src).toEqual('https://app.qa7.vocal-qa.com/');

      expect(MFO.appConfigByAppId[appDomId]).toEqual({ ...appConfig, url: 'https://app.qa7.vocal-qa.com' });
    });
  });

  describe('getInstancesIds', () => {
    test('Returns an empty array if there are no app instances for the requested appId', () => {
      const instancesIds = MFO.getInstancesIds();
      expect(instancesIds).toEqual([]);
    });

    test('returns specific app instances ids under all root elements', async () => {
      cuid.mockImplementationOnce(() => 'csrg45wgwetwetg')
          .mockImplementationOnce(() => 'c34tb343g34b34')
          .mockImplementationOnce(() => 'cdfgba94v9ba9a9a2345')
          .mockImplementationOnce(() => 'cb222bb09ewlbdfbdbdfb');


      document.body.innerHTML = '<div id="rootId"></div><div id="rootId2"></div><div id="rootId3"></div>';
      // inject 4 apps
      await MFO.inject('rootId', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId', 'appId123', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId2', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId3', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });

      // remove one instance
      MFO.remove('cdfgba94v9ba9a9a2345__appId');

      // should have 2 instances left alive for appId
      expect(MFO.getInstancesIds('appId')).toEqual(['csrg45wgwetwetg__appId', 'cb222bb09ewlbdfbdbdfb__appId']);
    });

    test('returns specific app instances ids under a specific root element', async () => {
      cuid.mockImplementationOnce(() => 'csrg45wgwetwetg')
        .mockImplementationOnce(() => 'c34tb343g34b34')
        .mockImplementationOnce(() => 'cdfgba94v9ba9a9a2345')
        .mockImplementationOnce(() => 'cb222bb09ewlbdfbdbdfb');


      document.body.innerHTML = '<div id="rootId"></div><div id="rootId2"></div><div id="rootId3"></div>';
      // inject 4 apps
      await MFO.inject('rootId', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId2', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });
      await MFO.inject('rootId3', 'appId', { url: 'https://app.vonage.com', type: 'iframe' });

      expect(MFO.getInstancesIds('appId', 'rootId')).toEqual(['csrg45wgwetwetg__appId', 'c34tb343g34b34__appId']);
    });
  });
});

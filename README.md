# @vonage/micro-frontends

##About
A simple solution for Micro Frontends orchestration.

Use the MicroFrontendOrchestrator in your host application, along with the MicroFrontendComponent in the hosted components.
Create your custom communication API between the host and the hosted components, and use the built in lifecycle events.
Supported Micro frontend implementations are both Iframe and Web Components (native as well as Vue.js compiled web components). 

## Installation

```bash
npm install @vonage/micro-frontends
```

# MicroFrontendOrchestrator (MFO) 

Use the MFO to inject and manage multiple instances of your micro frontend components.

## Usage Example

### Injecting a component
DOM Before Injection:
```html
<div id="someDiv"></div>
```

```javascript
import { MicroFrontendOrchestrator as MFO } from '@vonage/micro-frontends';
const myComponentDOMId = await MFO.inject('someDiv', 'myComponent', config); // more info on the config object below
console.log(myComponentDOMId); // prints 12345__myComponent
```

DOM After injection:
```html
<div id="someDiv">
    <iframe id="12345__myComponent" src="https://example.com" />
</div>
```

## API

### inject(parentId: string, componentId: string, config: InjectionConfig): instanceId: string
Injects a new micro frontend application into the DOM.
#### Arguments
parentId - the DOM Id of the element into which the micro front end component is injected.   
componentId - An Id/name that represents the injected component.    
config - InjectionConfig, explained below.
#### return value 
instanceId - a unique id given to the specific injected component instance.

### show(componentId: string): void
Shows the selected component instance.
All sibling DOM nodes are automatically hidden.
#### Arguments
componentId - the DOM Id of the component instance you to be visible on the DOM.

### remove(componentId: string)
Removes an injected component from the DOM.
#### Arguments
componentId - the DOM Id of the component instance to be shown.

### send(componentId: string, eventId: string, eventName: string, payload: object, error: string)
Sends an event to the application.
#### Arguments
componentId - the DOM Id of the component instance you wish to send the event to.   
eventId - a unique Id for the event, the MFO will generate it for you if you dont send any value.
This argument is used to track responses sent back from hosted components.    
eventName - a name that describes the type of event sent.    
payload - an object passed along to the hosted component. Do not pass along functions since this object is serialized.

### registerEvent(componentId, eventName, callback)
Subscribe for any event sent by the selected component instance.
#### Arguments
componentId - the DOM Id of the component instance from which the event is sent.   
eventName - the name of the event you wish to componentId to.  
callback - a function called when the event is triggered.

### unsregisterEvent(componentId, eventName, callback)
Unsubscribe a previously registered event.
#### Arguments
componentId - the DOM Id of the component instance from which the event was sent.   
eventName - the name of the event you wish to register to.     
callback - a function called when the event is triggered.

### getInstancesIds(componentId: string, parentId?: string): string[]
Get all instances Ids belonging to a specific componentId.
#### Arguments
componentId - the original componentId sent when the component was injected.   
parentId - use this argument to search for all instances of a component under a specific parent element.

### InjectionConfig

This is the config object used to define the injected component.

```javascript
{
  // `type` is the type of micro frontend component you want to inject, either 'iframe' or 'webcomponent'.
  type: 'webcomponent',
 
  // `url` is the url used to load the remote resource, either a domain (for iframes), or a js file (for webcomponents).
  url: 'http://somedomain.com',
 
  // `customElementTagName` the name of the tag represents the webcomponent or custom element loaded.
  // Only needed when loading a web component.
  customElementTagName: 'my-web-component',
 
  // `customEvents` custom event mapping to their handler functions.
  //  you can alternatively use the registerEvent function to add custom event handlers later.
  customEvents: {
    someCustomEventName: (eventData) => { console.log (eventData) } 
  },
 
  // `onBeforeInjected` - Function - called before the hosted component is injected into the DOM (also before the needed js code is fetched - for webcomponents).
  onBeforeInjected: (componentInstanceId) => { } // some custom logic before the component instance is loaded 
 
  // `onAfterInjected` - Function - called right after the hosted component is injected into the DOM
  onAfterInjected: (componentInstanceId) => { } // some custom logic after the component instance is loaded

  // `onInitialized` - Function - called when the hosted component calls the initialize method, and is usually used to communicate component initialization and token exchange to the hosted component.
  onInitialized: (componentInstanceId, eventId, ) => {
    // some initialization logic
    MFO.send(componentInstanceId, eventId, null, { userToken: '123', otherData: 'abc' }); // Dont forget to send back to the component it's initialization data. This resolves the promise for the 'initialize' method in the hosted component.
  }
  
  // `onReady` - Function - called when the hosted component calls the ready method. Usually when the hosted component is ready to be displayed.
  onReady: (componentInstanceId, eventId, eventName, isReady) => {
    // some custom logic.
    MFO.send(componentInstanceId, eventId, null, 'ACK'); // Dont forget to ack back to the component that it is now dispalyed. This resolves the promise for the 'ready' method in the hosted component.
  }

  // `onError` - Function - called when the hosted component calls the ready method, or a global error occurred in the hosted component's content window(iframe only).
  // Used to show a generic error screen instead of the hosted component, and report errors for the host application.
  onError: (componentInstanceId, eventId) => { 
    // handle errors
  }

  // `onTerminate` - Function - called when the hosted component whishes to be terminated.
  onTerminate: (componentInstanceId, eventId) => {
    // Any custom logic.
    MFO.remove(componentInstanceId);
  }

  // `onBeforeRemoved` - Function - called right before the hosted component is removed from the DOM.
  onBeforeRemoved: (componentInstanceId, eventId) => { }

  // `onRemoved`- Function - called after a hosted component is removed from the DOM.
  onRemoved: (componentInstanceId, eventId) => { }
}
```

# MicroFrontendComponent (MFC)
  
Use the MFC in your micro frontend components to report basic lifecycle events, send custom events and subscribe to host custom events.

## Usage Example

```javascript
import { MicroFrontendComponent } from '@vonage/micro-frontends';

const mfc = new MicroFrontendComponent();
const initialData = await mfc.initialize(); // get some inital data from the host app
// do some verification on your end...
verifyInitialData(initialData);
// your component is ready to be presented.
await mfc.ready();
// your component is now displayed.
```

## API

All functions (except one) return a Promise.
All function accept the options object with the following fields:

- requestTimeout (ms) - The promise is rejected if no answer was received from the host applicaiton after this time. 
 Default value is 10 seconds.
 
 More options soon...
 
### Component Lifecycle

#### initialize

Tell the host application you want to initialize a new component.
This method is usually used to pass some initial verification data from the host application, such as a token.

Parameters: options
Returns a Promise resolved or rejected with whatever data sent back from the host application.

```javascript
const initialData = await mfc.initialize(); // The host application should use the onInitialized hook to respond to this event. 
```

#### ready

Tell the host application that the component is ready to be presented.
Call this function only after the call to the initialize method was successful.
Parameters: options

```javascript
await mfc.ready(options); // The host application should use the onReady hook to respond to this event.
```

#### error

Report an error to the host application.
Parameters: options
-- error - any

```javascript
mfc.error(error, options);
```

#### terminate

Ask the host app to remove the component from the DOM, ending it's lifecycle.
Call this function only after the call to the initialize method was successful.

Parameters: options

```javascript
mfc.terminate(options);
````

### Create a custom API between your component and the host application.
#### createRequest 

Sends a custom request to the host application.
The Promise returned by this function is resolved only when the host app sends back an answer event with the same Id as the event sent by the hosted component.
The Promise is rejected when the host app sends an error, or the request times out.
```javascript
const customData = await mfc.createRequest('myCustomEvent', { payload: { field1: '123', field2: '456'} })
```

a more common usage would be to extend the MicroFrontendComponent class and use the createRequest function to expose other functions.
Example:

```javascript
class myComponent extends MicroFrontendComponent {
    constructor() { super({}); }

    someCustomFunction(arg1, arg2, arg3) {
        // some custom logic
        return this.createRequest('someCustomEvent', {payload: { a: arg1, b: arg2, c: arg3 }, requestTimeout: 500})
    }
}
```
To resolve or reject the promise, the host applicaiton should:
1. use the customEvents option to map the event sent by the hosted component to a callback function.
2. The host callback function should eventually use the mfc.send(eventId, eventName, payload) function to respond to the request.

#### registerEvent

This is the only function that does not return a Promise.
Use this function to register to events that were initiated by the host application. 
The callback is called with the payload sent by the host application.
 
Parameters:

- eventName - the event to be registered to.
- callBack - function to be executed when the event is sent.

```javascript
mfc.registerEvent('someCustomEvent', (eventData) => { console.log(eventData) });
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

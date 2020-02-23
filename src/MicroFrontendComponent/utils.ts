import get from 'lodash.get';
import {MicroFrontEndComponentType, Options} from "./types";
import {DEFAULT_REQUEST_TIMEOUT} from './consts';

function isIframeRuntime(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function detectComponentType(): MicroFrontEndComponentType {
  if(isIframeRuntime()) {
    return MicroFrontEndComponentType.IFRAME;
  } else {
    return MicroFrontEndComponentType.WEB_COMPONENT;
  }
}

// We use this method instead of the URL.searchParams API to support all browsers (mainly IE11 and Edge).
export function getQueryString(...args: any): string {
  let key: boolean | string = false;
  const res = '';
  let itm = null;

  // get the query string without the ?
  const qs = location.search.substring(1);

  // check for the key as an argument
  if (args.length > 0 && args[0].length > 1) {
    key = args[0];
  }

  // make a regex pattern to grab key/value
  const pattern = /([^&=]+)=([^&]*)/g;

  // loop the items in the query string, either
  // find a match to the argument, or build an object
  // with key/value pairs
  // tslint:disable-next-line:no-conditional-assignment
  while ((itm = pattern.exec(qs))) {
    // eslint-disable-line
    if (key !== false && decodeURIComponent(itm[1]) === key) {
      return decodeURIComponent(itm[2]);
    } else if (key === false) {
      res[decodeURIComponent(itm[1])] = decodeURIComponent(itm[2]);
    }
  }

  return key === false ? res : null;
}

export function extractOptions(options: Options) {
  return { requestTimeout: get(options, 'requestTimeout', DEFAULT_REQUEST_TIMEOUT) }
}

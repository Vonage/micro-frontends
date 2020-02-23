import { ConstructorOptions, MicroFrontEndComponentType } from '../types';
import { IMicroFrontendComponent, MicroFrontendComponentConstructor } from './types';
import { MicroFrontendIframe } from './Iframe';
import { MicroFrontendWebComponent } from './WebComponent';

export class MicroFrontendComponentFactory {

  private static callCtor(ctor: MicroFrontendComponentConstructor, options: ConstructorOptions): IMicroFrontendComponent {
    return new ctor(options);
  }

  static create(type: MicroFrontEndComponentType, options: ConstructorOptions): IMicroFrontendComponent{
    switch (type) {
      case MicroFrontEndComponentType.IFRAME:
        return this.callCtor(MicroFrontendIframe, options);
      case MicroFrontEndComponentType.WEB_COMPONENT:
        return this.callCtor(MicroFrontendWebComponent, options);
      default:
        return null;
    }
  }
}


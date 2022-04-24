import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { EspresenseHomebridgePlatform } from './platform';
import { EspresensePlatformPluginConstructor } from './interfaces/config';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, EspresenseHomebridgePlatform as unknown as EspresensePlatformPluginConstructor);
};

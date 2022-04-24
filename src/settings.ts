/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'ESPresense';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-espresense';

/**
 * This is used to get telemetry data of the ESPresense nodes.
 */
export const TELEMETRY_TOPIC = 'espresense/rooms/+/telemetry';

/**
 * This is used to identify the wildcard pattern and extract the room name upon initialization.
 */
export const TELEMETRY_TOPIC_REGEX = /espresense\/rooms\/([^/]+)\/telemetry/;

/**
 * This is the topic used to retrieve device presence data from the nodes. Has to have the {ROOM_NAME} placeholder.
 */
export const DEVICE_TOPIC = 'espresense/devices/+/{ROOM_NAME}';

/**
 * This is used to identify the wildcard pattern and extract the device name. Has to have the {ROOM_NAME} placeholder.
 */
// eslint-disable-next-line no-useless-escape
export const DEVICE_TOPIC_REGEX = 'espresense\/devices\/([^/]+)\/{ROOM_NAME}';

/**
 * This is used to set the max distance on the nodes. Has to have the {ROOM_NAME} placeholder.
 */
export const DEVICE_SET_MAX_DISTANCE_TOPIC = 'espresense/rooms/{ROOM_NAME}/max_distance/set';

/**
 * This is used to set the max distance on the nodes. Has to have the {ROOM_NAME} placeholder.
 */
export const DEVICE_SET_ACTIVE_SCAN_TOPIC = 'espresense/rooms/{ROOM_NAME}/active_scan/set';

/**
 * This is used to set the absorption value on the nodes. Has to have the {ROOM_NAME} placeholder.
 */
export const DEVICE_SET_ABSORPTION_TOPIC = 'espresense/rooms/{ROOM_NAME}/absorption/set';

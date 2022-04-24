import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { EspresenseHomebridgePlatform } from './platform';
import {
  DEVICE_SET_ABSORPTION_TOPIC,
  DEVICE_SET_ACTIVE_SCAN_TOPIC,
  DEVICE_SET_MAX_DISTANCE_TOPIC,
  DEVICE_TOPIC,
  DEVICE_TOPIC_REGEX,
} from './settings';
import Device from './interfaces/device';
import { RoomConfig } from './interfaces/config';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class EspresensePlatformAccessory {
  private service: Service;

  private deviceList: { [ key: string ]: Device } = {};

  private foundDebugMessage = '';

  private deviceTimeouts: { [ key: string ]: NodeJS.Timeout } = {};

  private presenceHandlerDebounceTimeout: NodeJS.Timeout | null = null;

  private occupancyDetected = false;


  constructor(
    private readonly platform: EspresenseHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'ESPresense')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.telemetry.firm || '-')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.telemetry.ip || '-');

    // Fetch or create occupancy sensor service
    this.service =
      this.accessory.getService(this.platform.Service.OccupancySensor) ||
      this.accessory.addService(this.platform.Service.OccupancySensor);

    // Set room name as default sensor name in homekit
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.roomName);

    this.platform.log.info('Initialized Characteristics for room ' + this.accessory.context.roomName);

    // Apply settings to node, subscribe to device topic, etc.
    this.setupDevice().then(() => {
      // Listen on device topic for present devices. This will trigger homekit changes if necessary.
      this.listen();
    });
  }

  setupDevice(): Promise<void> {
    return new Promise<void>((resolve) => {
      const roomName: string = this.accessory.context.roomName;
      const roomSettings: RoomConfig | null = this.getRoomSettings();

      const activeScanPayload: string = roomSettings?.activeScan ? 'ON' : 'OFF';
      const activeScanCondition: boolean = roomSettings?.activeScan !== null;

      // Configure active_scan on node
      this.publishIf(
        this.addRoomName(DEVICE_SET_ACTIVE_SCAN_TOPIC),
        activeScanPayload,
        activeScanCondition,
      ).then(() => {
        if (activeScanCondition) {
          this.platform.log.info(`[${roomName}] Turned active_scan ${activeScanPayload}`);
        }

        const absorptionSetting: number | null = roomSettings?.absorption || null;
        const absorptionCondition: boolean = absorptionSetting !== null;

        // Configure absorption level on node
        this.publishIf(
          this.addRoomName(DEVICE_SET_ABSORPTION_TOPIC),
          absorptionSetting + '',
          absorptionCondition,
        ).then(() => {
          if (absorptionCondition) {
            this.platform.log.info(`[${roomName}] Set absorption to ${absorptionSetting}`);
          }

          const maxDistanceSetting: number | null = roomSettings?.maxDistance || null;
          const maxDistanceCondition: boolean = maxDistanceSetting !== null;

          // Configure max device distance on node
          this.publishIf(
            this.addRoomName(DEVICE_SET_MAX_DISTANCE_TOPIC),
            maxDistanceSetting + '',
            maxDistanceCondition,
          ).then(() => {
            if (maxDistanceCondition) {
              this.platform.log.info(`[${roomName}] Set max_distance to ${maxDistanceSetting}`);
            }

            // Subscribe to node device topic
            this.platform.mqttClient.subscribe(this.addRoomName(DEVICE_TOPIC)).then(() => {
              let debugMessage = `[${roomName}] Subscribed to device topic.`;
              debugMessage += `Room ready. Device timeout: ${this.getDeviceTimeout()}`;

              this.platform.log.info(debugMessage);

              resolve();
            });
          });
        });
      });
    });
  }

  listen(): void {
    const roomName: string = this.accessory.context.roomName;

    const devicesToWatch: string[] = this.getRoomSettings()?.devices || [];
    const devicesString: string = JSON.stringify(devicesToWatch);

    this.platform.log.info(`[${roomName}] Listening to presence data. Watched devices: ${devicesString}`);

    this.platform.mqttClient.on('message', (topic: string, payload: Buffer) => {
      const regExp = new RegExp(this.addRoomName(DEVICE_TOPIC_REGEX));
      const matches: RegExpMatchArray | null = topic.match(regExp);

      if (matches) {
        const deviceName: string | null = matches[1] || null;
        const device: Device = JSON.parse(payload.toString()) || null;

        if (deviceName && device && devicesToWatch.includes(device.id)) {
          this.addDevice(device);
        }

        this.handlePresence();
      }
    });
  }

  handlePresence(): void {
    if (this.presenceHandlerDebounceTimeout) {
      clearTimeout(this.presenceHandlerDebounceTimeout);
    }

    this.presenceHandlerDebounceTimeout = setTimeout(() => {
      const presence: boolean = this.hasPresence();

      if (this.occupancyDetected === presence) {
        return;
      }

      this.occupancyDetected = presence;

      let value: CharacteristicValue;

      if (this.occupancyDetected) {
        value = this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
      } else {
        value = this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
      }

      this.service.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, value);

      this.platform.log.info(`[${this.accessory.context.roomName}] Updated sensor to "${value}"`);
    }, 50);
  }

  hasPresence(): boolean {
    const devices: string[] = Object.keys(this.deviceList).map(k => this.deviceList[k].id);

    const foundDebugMessage = `[${this.accessory.context.roomName}] Found: ${JSON.stringify(devices)}`;

    if (foundDebugMessage !== this.foundDebugMessage) {
      this.foundDebugMessage = foundDebugMessage;

      this.platform.log.info(this.foundDebugMessage);
    }

    return devices.length > 0;
  }

  addDevice(device) {
    clearTimeout(this.deviceTimeouts[device.id]);

    this.deviceList[device.id] = device;

    this.deviceTimeouts[device.id] = setTimeout(() => {
      delete this.deviceList[device.id];

      this.platform.log.info(`[${this.accessory.context.roomName}] Device "${device.id}" timed out`);

      this.handlePresence();
    }, this.getDeviceTimeout());
  }

  getDeviceTimeout(): number {
    return this.getRoomSettings()?.timeout || 5000;
  }

  publishIf(topic: string, payload: string, condition: boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!condition) {
        resolve();

        return;
      }

      this.platform.mqttClient.publish(topic, payload).then(() => {
        resolve();
      });
    });
  }

  getRoomSettings(): RoomConfig | null {
    const settings: RoomConfig[] = this.platform.config?.roomSettings || [];

    return settings.find(room => room.name === this.accessory.context.roomName) || null;
  }

  addRoomName(string: string): string {
    return string.replace('{ROOM_NAME}', this.accessory.context.roomName);
  }
}

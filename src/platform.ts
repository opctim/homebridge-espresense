import { API, APIEvent, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME, TELEMETRY_TOPIC, TELEMETRY_TOPIC_REGEX } from './settings';
import { EspresensePlatformAccessory } from './platformAccessory';
import { AsyncMqttClient } from 'async-mqtt';
import * as mqtt from 'async-mqtt';
import { Observable, Subscriber } from 'rxjs';
import Telemetry from './interfaces/telemetry';
import { EspresenseConfig } from './interfaces/config';


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EspresenseHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public mqttClient: AsyncMqttClient;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public readonly accessoryInstances: EspresensePlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: EspresenseConfig,
    public readonly api: API,
  ) {
    this.log.debug(`Finished initializing platform: ${this.config.name}`);

    this.mqttClient = mqtt.connect(
      this.config.mqtt.url || 'mqtt://127.0.0.1:1883',
      this.config.mqtt.options,
    );

    this.api.on(APIEvent.SHUTDOWN, () => {
      this.mqttClient.end();
    });

    this.mqttClient.on('connect', () => {
      log.info('Connected to MQTT.');
    });

    this.mqttClient.on('error', (error: Error) => {
      throw error;
    });

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      this.mqttClient.subscribe(TELEMETRY_TOPIC);

      this.discoverAccessories().subscribe({
        next: ({ roomName, telemetry }) => {
          const uuid: string = this.api.hap.uuid.generate(roomName + '#');

          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (existingAccessory) {
            const existingAccessoryInstance = this.accessoryInstances.find(
                accessoryInstance => accessoryInstance.accessory.UUID === uuid
            );

            if (!existingAccessoryInstance) {
              this.accessoryInstances.push(new EspresensePlatformAccessory(this, existingAccessory));
            }
          } else {
            // the accessory does not yet exist, so we need to create it
            this.log.info(`Adding new accessory "${roomName}"`);

            // create a new accessory
            const accessory = new this.api.platformAccessory(roomName, uuid);

            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.roomName = roomName;
            accessory.context.telemetry = telemetry;

            // create the accessory handler for the newly create accessory
            // this is imported from `platformAccessory.ts`
            this.accessoryInstances.push(new EspresensePlatformAccessory(this, accessory));

            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ accessory ]);

            this.accessories.push(accessory);
          }
        },
      });
    });
  }

  discoverAccessories(): Observable<{ roomName: string; telemetry: Telemetry }> {
    return new Observable<{ roomName: string; telemetry: Telemetry }>(
      (subscriber: Subscriber<{ roomName: string; telemetry: Telemetry }>) => {
        this.mqttClient.on('message', (topic: string, payload: Buffer) => {
          const matches: RegExpMatchArray | null = topic.match(TELEMETRY_TOPIC_REGEX);

          if (!matches) {
            return;
          }

          const roomName: string | null = matches?.[1] || null;
          const telemetry: Telemetry = JSON.parse(payload.toString());

          if (roomName && telemetry) {
            subscriber.next({
              roomName,
              telemetry,
            });
          }
        });
      },
    );
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory "${accessory.displayName}" from cache.`);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }
}

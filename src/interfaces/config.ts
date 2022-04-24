import { PlatformConfig } from 'homebridge';
import { IClientOptions } from 'mqtt';
import { PlatformPluginConstructor } from 'homebridge';
import { Logging } from 'homebridge/lib/logger';
import { API, DynamicPlatformPlugin, IndependentPlatformPlugin, StaticPlatformPlugin } from 'homebridge/lib/api';

export interface EspresensePlatformPluginConstructor extends PlatformPluginConstructor {
  new (logger: Logging, config: EspresenseConfig, api: API): DynamicPlatformPlugin | StaticPlatformPlugin | IndependentPlatformPlugin;
}

export interface EspresenseConfig extends PlatformConfig {
  mqtt: MqttConfig;
  roomSettings: RoomConfig[];
}

export interface MqttConfig {
  url?: string | 'mqtt://127.0.0.1:1883';
  options?: IClientOptions;
}

export interface RoomConfig {
  name: string;
  maxDistance?: number;
  absorption?: number;
  activeScan?: boolean;
  timeout: number;
  devices: string[];
}

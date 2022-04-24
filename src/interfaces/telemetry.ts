export default interface Telemetry {
  ip: string;
  uptime: number;
  firm: 'esp32' | string;
  rssi: number;
  ver: string;
  adverts: number;
  seen: number;
  reported: number;
  freeHeap: number;
  maxAllocHeap: number;
  memFrag: number;
  resetReason: string;
  scanHighWater: number;
  reportHighWater: number;
}

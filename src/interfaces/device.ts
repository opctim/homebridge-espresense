export default interface Device {
  id: string;
  disc: string;
  idType: number;
  'rssi@1m': number;
  rssi: number;
  raw: number;
  distance: number;
  speed: number;
  mac: string;
  interval: number;
}

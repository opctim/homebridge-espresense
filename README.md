# ESPresense Homebridge Plugin

## Intro
Homebridge implementation for using ESPresense node data as occupancy sensors in HomeKit.
This plugin is an alternative to using HomeAssistant, as ESPresense is primarily built for HA.

## Example configuration

```json5
{
    "bridge": {
        "name": "Homebridge",
        "username": "0E:0D:02:79:BE:DE",
        "port": 51643,
        "pin": "111-11-111"
    },
    "accessories": [],
    "platforms": [
        {
            "name": "homebridge-espresense", // mandatory, has to be this value
            "platform": "ESPresense", // mandatory, has to be this value
            "mqtt": { // mandatory
                "url": "mqtt://192.168.2.1:1883", // see https://github.com/mqttjs/MQTT.js#mqttconnecturl-options
                "options": {} // see https://github.com/mqttjs/MQTT.js#mqttconnecturl-options
            },
            "roomSettings": [ // contains configuration for each ESPresense node
                {
                    "name": "kueche", // mandatory, has to match the node's room name that you configured in its web interface
                    "maxDistance": 2, // maximum distance in meters to detect devices. will be set on the node.
                    "absorption": 3.5, // absorption value. consult ESPresense docs. will be set on the node.
                    "activeScan": true, // sets the node into activeScan mode. will consume more power, but faster and more precise if enabled. 
                    "timeout": 6000, // timeout in ms to set homekit sensor occupancy to false. any value above 5000ms is recommended 
                    "devices": [
                      // device ids for devices to be recognised. 
                      // if no ids are set, presence will be detected. 
                      // To find the devices, you can use https://espresense.com/firmware and open the console.
                      // Once open, you can see the device ids coming in. Try to identify your devices and put them here.
                      
                      "apple:1005:9-24", // Apple Watch Series 5
                      "apple:1007:11-8" // Apple iPhone 12 Pro
                    ]
                }
            ]
        }
    ],
    "plugins": [
        "homebridge-espresense", // You'll have to add the plugin name here. 
        // [...]
    ]
}
```

## UI Configuration

Configuring this plugin via the UI is still WIP. Feel free to support, the config.schema.json is almost finished.

## Troubleshooting

If you encounter any problems, please consult the ESPresense docs or open an issue. Feel free to submit Pull-Requests, I appreciate any support.

https://espresense.com

# @spotsize/js-sdk

The spotsize Javascript SDK enables the integration of the [spotsize](https://spotsize.io) service into a browser based flow.

---

## Installation

To use with a bundler / ESM

`npm i @spotsize/js-sdk -S`

Import via script tag

`<script src="https://unpkg.com/@spotsize/js-sdk/dist/spotsize.min.js"></script>`

---

## Usage

#### ESM

```Javascript
import {init, start, events} from '@spotsize/js-sdk';

init('{{YOUR_ORGANIZATION_ID}}');

events.onQRShown = () => {
    console.log('QR code shown');
}

try {
    const recommendation = await start('{{MODEL_ID}}', qrContainer);
    console.log(recommendation);
} catch (error) {
    console.log('Error', error);
}
```

#### UMD

```Javascript
spotsize.init('{{YOUR_ORGANIZATION_ID}}');

spotsize.events.onQRShown = function() {
    console.log('QR code shown');
}

spotsize.start(modelId, qr, false)
    .then((recommendation) => {
        console.log(recommendation);
    })
    .catch((error) => {
        console.log('error', error);
    });
```

### Events

The following events are supported:

`event.onQRShown`

`event.onQRRemoved`

`event.onStart`

`event.onStop`

`event.onError`

`event.onComplete`

```Javascript
import {events} from '@spotsize/js-sdk';

events.onError = (error) => {
    console.log('Error', error);
}
```

---

## Examples

https://github.com/spotsize/spotsize-js-sdk-examples


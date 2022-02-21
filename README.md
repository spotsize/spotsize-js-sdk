# @spotsize/js-sdk

The spotsize Javascript SDK enables the integration of the [spotsize](https://spotsize.io) service into a browser based flow.

## Usage

### UMD

Import via script tag

`<script src="https://unpkg.com/@spotsize/js-sdk/dist/spotsize.min.js"></script>`

#### Single product

To request a size for a single product, just pass your according `productId`:

```Javascript
spotsize.init('YOUR_ORGANIZATION_ID');

spotsize.events.onQRShown = function() {
    console.log('QR code shown');
}

spotsize.start('YOUR_PRODUCT_ID', qrCodeContainer, false)
    .then((result) => {
        if (result.status == 'SUCCESS') {
            //Get default size
            const sizeInfo = result.getSize();
            const value = sizeInfo.value; // e.g. "42"
            const category = sizeInfo.category; // e.g. "EU"
            const label = sizeInfo.label; // e.g. "EU 42"
        } else {
            //No matching size/product found                    
        }
    })
    .catch((error) => {
        //An error occured
        console.log('error', error);
    });
```

#### Multiple products

Pass a `list of productIds` to request sizes for multiple products in one call:

```Javascript
spotsize.init('YOUR_ORGANIZATION_ID');

spotsize.start(['YOUR_PRODUCT_ID1', 'YOUR_PRODUCT_ID2'], qrCodeContainer, false)
    .then((result) => {
        if (result.status == 'SUCCESS') {
            console.log(result.products);
            const product = result.getProduct('YOUR_PRODUCT_ID2');
            
            const sizeInfo = product.getSize();
            const value = sizeInfo.value; // e.g. "42"
            const category = sizeInfo.category; // e.g. "EU"
            const label = sizeInfo.label; // e.g. "EU 42"
        } else {
            //No matching sizes/products found                    
        }
    })
    .catch((error) => {
        //An error occured
        console.log('error', error);
    });
```


### ESM

To use with a bundler

#### Installation
`npm i @spotsize/js-sdk -S`

```Javascript
import {init, start, events} from '@spotsize/js-sdk';

init('YOUR_ORGANIZATION_ID');

events.onQRShown = () => {
    console.log('QR code shown');
}

try {
    const result = await start('YOUR_PRODUCT_ID', qrCodeContainer);
    if (result.status == 'SUCCESS') {
        //Get default size
        const sizeInfo = result.getSize();
       
        const value = sizeInfo.value; // e.g. "42"
        const category = sizeInfo.category; // e.g. "EU"
        const label = sizeInfo.label; // e.g. "EU 42"
    } else {
        //No matching size/product found                    
    }
} catch (error) {
    console.log('Error', error);
}
```

---

### Result Object

The `result` object has the following properties and methods

```Javascript
spotsize.start('YOUR_PRODUCT_ID', qrCodeContainer, false)
    .then((result) => {
    })
```

`status` *(String)* The status of the recommendation request

- `SUCCESS`: Matching Product/size found
- `NO_PRODUCT_FOUND`: No matching product found

`length` *(Number)* Length of the scanned foot

`width` *(Number)* Width of the scanned foot

`getSize(category)` *(Object)* The default size info `{value:, category:}`
```Javascript
const sizeInfo = result.getSize();
```

returns default category, e.g.

```Javascript
{
    value: "42",
    category: "EU",
    label: "EU 42"    
}
```

---

```Javascript
const sizeInfo = result.getSize('uk');
```

returns requested category if available, e.g.

```Javascript
{
    value: "41",
    category: "UK"    
}
```

---

__*(Only relevant if multiple products are queried):*__ 

`getProduct(productId)` *(Object)* Returns the according product
```Javascript
const product = result.getProduct('YOUR_PRODUCT_ID');
const sizeInfo = product.getSize();
```

`products` *(Array)* A list of all matched products

---

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


## Examples

https://github.com/spotsize/spotsize-js-sdk-examples


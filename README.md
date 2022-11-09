# @spotsize/js-sdk

The spotsize Javascript SDK enables the integration of the [spotsize](https://spotsize.io) service into a browser based
flow.

## Usage

### UMD

Import via script tag

`<script src="https://unpkg.com/@spotsize/js-sdk/dist/spotsize.min.js"></script>`

### Using HTML data attributes

You can use special HTML data attributes to integrate spotsize without the need of writing Javascript code.

#### Attributes

| Attribute                           | Description                                                                                                                                    |
|:------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------|
| `data-spotsize-organization-id`     | Your organizationId                                                                                                                            |    
| `data-spotsize-product-id`          | The productId of the shoe for which a size recommendation is to be generated.                                                                  |
| `data-spotsize-product-name`        | _(optional)_ The product name to be shown in the native app result screen.                                                                     |
| `data-spotsize-use-mock-data`       | _(optional)_ Directly receive mock data and bypass the actual scan flow.                                                                       |
| `data-spotsize-button`              | HTML element that triggers the spotsize service.                                                                                               |
| `data-spotsize-qr-container`        | HTML element where the generated QR code shall be added to.<br/> Hidden by default. Use `data-spotsize-qr-container="visible"` to not hide it. |
| `data-spotsize-result-container`    | HTML element that shows the recommendation result.<br/> Hidden by default. Use `data-spotsize-result-container="visible"` to not hide it.      |
| `data-spotsize-no-result-container` | HTML element that is shown in case of no recommendation could be created.                                                                      |
| `data-spotsize-error-container`     | _(optional)_ HTML element that is shown in case of an error                                                                                    |

#### Placeholders

The following placeholder can be used to display the returned recommendation result.   
The placeholders will be replaced with the according values, when the result element is shown.

| Placeholder             | Description                                                                          |
|:------------------------|:-------------------------------------------------------------------------------------|
| `{length}`                | Length in millimeters                                                                |     
| `{width}`                 | Width in millimeters                                                                 |     
| `{size}`                  | Default size, renders e.g. "42"                                                      |     
| `{size_label}`            | Default size label, renders e.g. "42 EU"                                             |     
| `{size_[category]}`       | Size for the according catergory, e.g. `{size_uk}` `{size_us}` ...                   |     
| `{size_label_[category]}` | Size label for the according catergory, e.g. `{size_label_uk}` `{size_label_us}` ... |     

The data attributes could be added to any tag.

Setup `organizationId`, `productId`, the QR code container and the spotsize button, that starts the scan flow.

```HTML

<div data-spotsize-organization-id="YOUR_ORGANIZATION_ID" data-spotsize-product-id="YOUR_PRODUCT_ID"></div>

<div data-spotsize-qr-container></div> <!-- Will be hidden by default -->

<div data-spotsize-button>Spot Your Size</div>
```

Define result elements

```HTML
<!-- Will be hidden by default -->
<div data-spotsize-result-container>
    <div>Length: {length} Width: {width}</div>
    <div>Your recommended size is {size_label}</div>
</div>

<!-- Will be hidden by default -->
<div data-spotsize-no-result-container>
    Sorry, but we couldn't find a size.
</div>
```

<details>
  <summary><b>Example</b></summary>

  ```HTML
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>SDK Test</title>
    <script src="https://unpkg.com/@spotsize/js-sdk/dist/spotsize.min.js"></script>
</head>
<body>
<h1>spotsize JS-SDK</h1>

<div data-spotsize-organization-id="YOUR_ORGANIZATION_ID" data-spotsize-product-id="YOUR_PRODUCT_ID"></div>

<button data-spotsize-button>Spot Your Size</button>

<div data-spotsize-qr-container></div>

<div data-spotsize-result-container>
    <h3>Your recommended size</h3>
    <p>{length} {width}</p>
    <p>{size_label}</p>
</div>

<div data-spotsize-no-result-container>Sorry, but we couldn't find a size.</div>
<div data-spotsize-error-container>{error}</div>

</body>
</html>
  ```

</details>

### Using the Javascript API

The JS SDK lets you control

#### Single product

To request a size for a single product, just pass your according `productId`:

```Javascript
spotsize.init('YOUR_ORGANIZATION_ID');

spotsize.events.onQRShown = function () {
    console.log('QR code shown');
}

spotsize.start('YOUR_PRODUCT_ID', qrCodeContainer)
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

spotsize.start(['YOUR_PRODUCT_ID1', 'YOUR_PRODUCT_ID2'], qrCodeContainer)
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

You can also pass the following options:

```Javascript
const options = {
    productName: 'The product name',
    payload: {},
    useMockData: true
}

spotsize.start('YOUR_PRODUCT_ID', qrCodeContainer, options)
````

`productName` *(String)* The product name to be shown in the native app result screen.

`useMockData` *(Boolean)* Set to 'true' to directly receive mock data and bypass the actual scan flow

`payload` *(Object)* Custom payload that is returned along with the recommendation.


---

### ESM

To use with a bundler (only Javascript API)

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
spotsize.start('YOUR_PRODUCT_ID', qrCodeContainer)
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
        category
:
    "EU",
        label
:
    "EU 42"
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
        category
:
    "UK"
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


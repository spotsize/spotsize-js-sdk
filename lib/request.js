let _controller;
if (typeof AbortController != 'undefined')  {
    _controller = new AbortController();
}

export const cancelAllRequests = () => {
    if (_controller) {
        _controller.abort();
        _controller = new AbortController();
    }
}

export class Request {
    constructor(url, controller) {
        controller = controller || _controller;
        this.url = url;
        this.options = {
            method: 'GET',
            headers: {},
            signal: controller.signal
        }
    }

    post() {
        this.options.method = 'POST';
        return this;
    }

    get() {
        this.options.method = 'GET';
        return this;
    }

    put() {
        this.options.method = 'PUT';
        return this;
    }

    json() {
        this.header('Content-Type', 'application/json');
        return this;
    }

    header(name, value) {
        this.options.headers[name] = value;
        return this;
    }

    body(payload) {
        this.options.body = JSON.stringify(payload);
        return this;
    }

    send() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(this.url, this.options);
                if (!response.ok) {
                    reject(response.status);
                    return;
                }
                resolve(await response.json());
            } catch (error) {
              if (error.name.toLowerCase() != 'aborterror') {
                  reject(error);
              }
            }
        });
    }
}

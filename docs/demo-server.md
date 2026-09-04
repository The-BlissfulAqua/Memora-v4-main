# Demo Server and Multi-Device Setup

The `demo-server/` directory contains Memora's minimal Express and WebSocket relay for trusted, multi-device presentations. It broadcasts demo actions between Patient, Caregiver, and Family views; it is not production-hardened and accepts any demo credentials.

## Start locally

Install the relay dependencies and start the server on port `8081`:

```bash
npm --prefix demo-server install
npm --prefix demo-server start
```

Confirm it is available:

```bash
curl http://localhost:8081/health
```

For AI Companion and quote endpoints, set `GROQ_API_KEY` in your shell or in an uncommitted `demo-server/.env` file. `GROQ_MODEL` is optional. Never commit API keys or `.env` files.

On devices connected to the same network, set the realtime URL before the app loads or through the in-app Demo Login control:

```js
window.__DEMO_REALTIME_URL = 'ws://YOUR_LAPTOP_IP:8081';
```

Allow inbound traffic to port `8081` through the laptop firewall.

## Use ngrok for remote devices

When devices cannot reach the laptop over a LAN, authenticate ngrok once and expose the local relay:

```bash
ngrok authtoken YOUR_AUTH_TOKEN
ngrok http 8081
```

Copy the HTTPS forwarding URL and replace `https://` with `wss://` in the app:

```js
window.__DEMO_REALTIME_URL = 'wss://abcd-1234.ngrok.io';
```

The optional helper prints active local ngrok tunnels:

```bash
npm --prefix demo-server run print-ngrok
```

Only share the ngrok URL with trusted devices for the duration of a demo. Secure pages require `wss://`; mixed-content errors usually mean the URL scheme is incorrect.

## Demo checklist

1. Start the relay and verify `/health`.
2. Set the same LAN or ngrok realtime URL on each device.
3. Sign in with distinct Patient, Caregiver, and Family roles through Demo Login.
4. Verify an action such as a reminder, voice message, or SOS alert reaches the other role views.

## Android builds

For native packaging and device-validation scenarios, see [Android QA](android-qa.md).

# Signal Lab: CORS Before / After

A small REST API and browser client that makes CORS visible. The client is served from `http://localhost:5173`; two identical API processes expose `GET /profile`:

- `http://localhost:4000/profile` has no CORS response header, so the browser blocks JavaScript from reading it.
- `http://localhost:4001/profile` allows exactly `http://localhost:5173` and the `GET` method, so the browser releases the JSON response.

## Run the lab

Install dependencies:

```powershell
npm install
```

Open three PowerShell terminals in this folder and run:

```powershell
npm run api:blocked
```

```powershell
npm run api:enabled
```

```powershell
npm run frontend
```

Open `http://localhost:5173`. Click both **Send request** buttons. The first request reaches the API but becomes an opaque browser-side failure; the second succeeds and displays the profile.

## What changed

The enabled API uses the `cors` middleware with:

```js
origin: 'http://localhost:5173'
methods: ['GET']
```

CORS is enforced by browsers, not by the API as authentication. A specific allowlist reduces accidental exposure to browser scripts from unrelated origins, but it does not replace authentication, authorization, rate limiting, or input validation. `curl` and server-to-server clients can still call either endpoint.

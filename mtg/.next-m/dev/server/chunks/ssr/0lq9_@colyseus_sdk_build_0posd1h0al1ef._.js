(()=>{"use strict";module.exports = [
"[project]/mtg/node_modules/@colyseus/sdk/build/Auth.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Auth",
    ()=>Auth
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Storage$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Storage.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$nanoevents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/nanoevents.mjs [app-ssr] (ecmascript)");
;
;
class Auth {
    settings = {
        path: "/auth",
        key: "colyseus-auth-token"
    };
    #_initialized = false;
    #_signInWindow = null;
    #_events = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$nanoevents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createNanoEvents"])();
    http;
    constructor(http){
        this.http = http;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Storage$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getItem"])(this.settings.key, (token)=>this.token = token);
    }
    set token(token) {
        this.http.authToken = token;
    }
    get token() {
        return this.http.authToken;
    }
    onChange(callback) {
        const unbindChange = this.#_events.on("change", callback);
        if (!this.#_initialized) {
            this.getUserData().then((userData)=>{
                this.emitChange({
                    ...userData,
                    token: this.token
                });
            }).catch((e)=>{
                // user is not logged in, or service is down
                this.emitChange({
                    user: null,
                    token: undefined
                });
            });
        }
        this.#_initialized = true;
        return unbindChange;
    }
    async getUserData() {
        if (this.token) {
            return (await this.http.get(`${this.settings.path}/userdata`)).data;
        } else {
            throw new Error("missing auth.token");
        }
    }
    async registerWithEmailAndPassword(email, password, options) {
        const data = (await this.http.post(`${this.settings.path}/register`, {
            body: {
                email,
                password,
                options
            }
        })).data;
        this.emitChange(data);
        return data;
    }
    async signInWithEmailAndPassword(email, password) {
        const data = (await this.http.post(`${this.settings.path}/login`, {
            body: {
                email,
                password
            }
        })).data;
        this.emitChange(data);
        return data;
    }
    async signInAnonymously(options) {
        const data = (await this.http.post(`${this.settings.path}/anonymous`, {
            body: {
                options
            }
        })).data;
        this.emitChange(data);
        return data;
    }
    async sendPasswordResetEmail(email) {
        return (await this.http.post(`${this.settings.path}/forgot-password`, {
            body: {
                email
            }
        })).data;
    }
    async signInWithProvider(providerName, settings = {}) {
        return new Promise((resolve, reject)=>{
            const w = settings.width || 480;
            const h = settings.height || 768;
            // forward existing token for upgrading
            const upgradingToken = this.token ? `?token=${this.token}` : "";
            // Capitalize first letter of providerName
            const title = `Login with ${providerName[0].toUpperCase() + providerName.substring(1)}`;
            const url = this.http['sdk']['getHttpEndpoint'](`${settings.prefix || `${this.settings.path}/provider`}/${providerName}${upgradingToken}`);
            const left = screen.width / 2 - w / 2;
            const top = screen.height / 2 - h / 2;
            this.#_signInWindow = window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
            const onMessage = (event)=>{
                // TODO: it is a good idea to check if event.origin can be trusted!
                // if (event.origin.indexOf(window.location.hostname) === -1) { return; }
                // require 'user' and 'token' inside received data.
                if (event.data.user === undefined && event.data.token === undefined) {
                    return;
                }
                clearInterval(rejectionChecker);
                this.#_signInWindow?.close();
                this.#_signInWindow = null;
                window.removeEventListener("message", onMessage);
                if (event.data.error !== undefined) {
                    // Reject with an Error so consumers' `catch (e) {
                    // ... e.message }` reads as expected. Attach the
                    // structured payload (reason / until / etc.) as
                    // properties so callers that want to render a
                    // richer message (e.g. "banned until X for Y")
                    // can pull them off without re-parsing.
                    const err = new Error(String(event.data.error));
                    err.code = event.data.error;
                    if (event.data.reason !== undefined) {
                        err.reason = event.data.reason;
                    }
                    if (event.data.until !== undefined) {
                        err.until = event.data.until;
                    }
                    reject(err);
                } else {
                    resolve(event.data);
                    this.emitChange(event.data);
                }
            };
            const rejectionChecker = setInterval(()=>{
                if (!this.#_signInWindow || this.#_signInWindow.closed) {
                    this.#_signInWindow = null;
                    reject("cancelled");
                    window.removeEventListener("message", onMessage);
                }
            }, 200);
            window.addEventListener("message", onMessage);
        });
    }
    async signOut() {
        this.emitChange({
            user: null,
            token: null
        });
    }
    emitChange(authData) {
        if (authData.token !== undefined) {
            this.token = authData.token;
            if (authData.token === null) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Storage$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["removeItem"])(this.settings.key);
            } else {
                // store key in localStorage
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Storage$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setItem"])(this.settings.key, authData.token);
            }
        }
        this.#_events.emit("change", authData);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/Client.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Client",
    ()=>Client,
    "ColyseusSDK",
    ()=>ColyseusSDK
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/errors/Errors.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Room$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Room.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$HTTP$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/HTTP.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Auth$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Auth.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Connection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Connection.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/debug-channel.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
// - React Native does not provide `window.location`
// - Cocos Creator (Native) does not provide `window.location.hostname`
const DEFAULT_ENDPOINT = ("TURBOPACK compile-time value", "undefined") !== "undefined" && typeof window?.location?.hostname !== "undefined" ? "TURBOPACK unreachable" : "ws://127.0.0.1:2567";
class ColyseusSDK {
    static VERSION = "0.18";
    /**
     * The HTTP client to make requests to the server.
     */ http;
    /**
     * The authentication module to authenticate into requests and rooms.
     */ auth;
    /**
     * The settings used to connect to the server.
     */ settings;
    urlBuilder;
    constructor(settings = DEFAULT_ENDPOINT, options){
        if (typeof settings === "string") {
            //
            // endpoint by url
            //
            const url = settings.startsWith("/") ? new URL(settings, DEFAULT_ENDPOINT) : new URL(settings);
            const secure = url.protocol === "https:" || url.protocol === "wss:";
            const port = Number(url.port || (secure ? 443 : 80));
            this.settings = {
                hostname: url.hostname,
                pathname: url.pathname,
                port,
                secure,
                searchParams: url.searchParams.toString() || undefined
            };
        } else {
            //
            // endpoint by settings
            //
            if (settings.port === undefined) {
                settings.port = settings.secure ? 443 : 80;
            }
            if (settings.pathname === undefined) {
                settings.pathname = "";
            }
            this.settings = settings;
        }
        // make sure pathname does not end with "/"
        if (this.settings.pathname.endsWith("/")) {
            this.settings.pathname = this.settings.pathname.slice(0, -1);
        }
        // specify room connection protocol if provided
        if (options?.protocol) {
            this.settings.protocol = options.protocol;
        }
        this.http = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$HTTP$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HTTP"](this, {
            headers: options?.headers || {}
        }, options?.fetchFn);
        this.auth = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Auth$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Auth"](this.http);
        this.urlBuilder = options?.urlBuilder;
        //
        // Discord Embedded SDK requires a custom URL builder
        //
        if (!this.urlBuilder && ("TURBOPACK compile-time value", "undefined") !== "undefined" && window?.location?.hostname?.includes("discordsays.com")) //TURBOPACK unreachable
        ;
    }
    /**
     * Select the endpoint with the lowest latency.
     * @param endpoints Array of endpoints to select from.
     * @param options Client options.
     * @param latencyOptions Latency measurement options (protocol, pingCount, timeout) — forwarded to each {@link getLatency} call.
     * @returns The client with the lowest latency.
     */ static async selectByLatency(endpoints, options, latencyOptions = {}) {
        const clients = endpoints.map((endpoint)=>new ColyseusSDK(endpoint, options));
        const latencies = (await Promise.allSettled(clients.map((client, index)=>client.getLatency(latencyOptions).then((latency)=>{
                const settings = clients[index].settings;
                console.log(`🛜 Endpoint Latency: ${latency}ms - ${settings.hostname}:${settings.port}${settings.pathname}`);
                return [
                    index,
                    latency
                ];
            })))).filter((result)=>result.status === 'fulfilled').map((result)=>result.value);
        if (latencies.length === 0) {
            throw new Error('All endpoints failed to respond');
        }
        return clients[latencies.sort((a, b)=>a[1] - b[1])[0][0]];
    }
    // Implementation
    async joinOrCreate(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('joinOrCreate', roomName, options, rootSchema);
    }
    // Implementation
    async create(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('create', roomName, options, rootSchema);
    }
    // Implementation
    async join(roomName, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('join', roomName, options, rootSchema);
    }
    // Implementation
    async joinById(roomId, options = {}, rootSchema) {
        return await this.createMatchMakeRequest('joinById', roomId, options, rootSchema);
    }
    // Implementation
    async reconnect(reconnectionToken, rootSchema) {
        if (typeof reconnectionToken === "string" && typeof rootSchema === "string") {
            throw new Error("DEPRECATED: .reconnect() now only accepts 'reconnectionToken' as argument.\nYou can get this token from previously connected `room.reconnectionToken`");
        }
        const [roomId, token] = reconnectionToken.split(":");
        if (!roomId || !token) {
            throw new Error("Invalid reconnection token format.\nThe format should be roomId:reconnectionToken");
        }
        return await this.createMatchMakeRequest('reconnect', roomId, {
            reconnectionToken: token
        }, rootSchema);
    }
    async consumeSeatReservation(response, rootSchema) {
        const room = this.createRoom(response.name, rootSchema);
        room.roomId = response.roomId;
        room.sessionId = response.sessionId;
        const options = {
            sessionId: room.sessionId
        };
        // forward "reconnection token" in case of reconnection.
        if (response.reconnectionToken) {
            options.reconnectionToken = response.reconnectionToken;
        }
        room.connect(this.buildEndpoint(response, options), // `protocol` lives on client settings, not the matchmake response — inject it so
        // Room.connect picks the right transport. Without this it silently falls back to ws.
        {
            ...response,
            protocol: this.settings.protocol
        }, this.http.options.headers);
        return new Promise((resolve, reject)=>{
            const onError = (code, message)=>reject(new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ServerError"](code, message));
            room.onError.once(onError);
            room['onJoin'].once(()=>{
                room.onError.remove(onError);
                // Surface the connected room to `@colyseus/sdk/debug` (buffered
                // until the overlay loads). This is the single choke point for
                // join/create/joinById/reconnect, so every room gets a panel —
                // and one joined before a late debug import is adopted on replay,
                // not missed like the old consumeSeatReservation monkey-patch.
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["publishDebug"])("room", room);
                resolve(room);
            });
        });
    }
    /**
     * Create a new connection with the server, and measure the latency.
     *
     * Always settles: resolves with the (average) round-trip time, or rejects on
     * connection error, server-side close before all pongs arrive, or timeout.
     *
     * @param options Latency measurement options (protocol, pingCount, timeout).
     */ getLatency(options = {}) {
        const protocol = options.protocol ?? "ws";
        const pingCount = options.pingCount ?? 1;
        const timeout = options.timeout ?? 1500;
        return new Promise((resolve, reject)=>{
            const conn = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Connection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Connection"](protocol);
            const latencies = [];
            let pingStart = 0;
            let settled = false;
            let timeoutId;
            // run exactly once — guards against late events after resolve/reject
            // (e.g. our own conn.close() firing onclose, or a stray onclose/onerror pair)
            const settle = (run)=>{
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeoutId);
                try {
                    conn.close();
                } catch (e) {}
                run();
            };
            const fail = (message)=>settle(()=>reject(new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ServerError"](__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].ABNORMAL_CLOSURE, `Failed to get latency: ${message}`)));
            // bound blackholed/filtered hosts that never fire onopen/onerror within the OS TCP timeout
            timeoutId = setTimeout(()=>fail(`timed out after ${timeout}ms`), timeout);
            conn.events.onopen = ()=>{
                pingStart = Date.now();
                conn.send(new Uint8Array([
                    __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].PING
                ]));
            };
            conn.events.onmessage = (_)=>{
                latencies.push(Date.now() - pingStart);
                if (latencies.length < pingCount) {
                    // Send another ping
                    pingStart = Date.now();
                    conn.send(new Uint8Array([
                        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].PING
                    ]));
                } else {
                    // Done, calculate average and close
                    const average = latencies.reduce((sum, l)=>sum + l, 0) / latencies.length;
                    settle(()=>resolve(average));
                }
            };
            // server closed the socket before all pongs arrived — fires without onerror on a clean close
            conn.events.onclose = (event)=>fail(`connection closed${event?.code ? ` (${event.code})` : ""}${event?.reason ? `: ${event.reason}` : ""}`);
            conn.events.onerror = (event)=>fail(event.message);
            try {
                conn.connect(this.getHttpEndpoint());
            } catch (e) {
                fail(e?.message ?? "failed to connect");
            }
        });
    }
    async createMatchMakeRequest(method, roomName, options = {}, rootSchema) {
        try {
            if (!roomName) {
                throw new Error("Must provide a room name");
            }
            const httpResponse = await this.http.post(`/matchmake/${method}/${roomName}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: options
            });
            const response = httpResponse.data;
            // forward reconnection token during "reconnect" methods.
            if (method === "reconnect") {
                response.reconnectionToken = options.reconnectionToken;
            }
            return await this.consumeSeatReservation(response, rootSchema);
        } catch (error) {
            if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ServerError"]) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MatchMakeError"](error.message, error.code);
            }
            throw error;
        }
    }
    createRoom(roomName, rootSchema) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Room$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Room"](roomName, rootSchema);
    }
    buildEndpoint(seatReservation, options = {}) {
        let protocol = this.settings.protocol || "ws";
        let searchParams = this.settings.searchParams || "";
        // forward authentication token
        if (this.http.authToken) {
            options['_authToken'] = this.http.authToken;
        }
        // append provided options
        for(const name in options){
            if (!options.hasOwnProperty(name)) {
                continue;
            }
            searchParams += (searchParams ? '&' : '') + `${name}=${options[name]}`;
        }
        if (protocol === "h3") {
            protocol = "http";
        }
        let endpoint = this.settings.secure ? `${protocol}s://` : `${protocol}://`;
        if (seatReservation.publicAddress) {
            endpoint += `${seatReservation.publicAddress}`;
        } else {
            endpoint += `${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}`;
        }
        const endpointURL = `${endpoint}/${seatReservation.processId}/${seatReservation.roomId}?${searchParams}`;
        return this.urlBuilder ? this.urlBuilder(new URL(endpointURL)) : endpointURL;
    }
    getHttpEndpoint(segments = '') {
        const path = segments.startsWith("/") ? segments : `/${segments}`;
        let endpointURL = `${this.settings.secure ? "https" : "http"}://${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}${path}`;
        if (this.settings.searchParams) {
            endpointURL += `?${this.settings.searchParams}`;
        }
        return this.urlBuilder ? this.urlBuilder(new URL(endpointURL)) : endpointURL;
    }
    getEndpointPort() {
        return this.settings.port !== 80 && this.settings.port !== 443 ? `:${this.settings.port}` : "";
    }
}
const Client = ColyseusSDK;
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/Connection.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Connection",
    ()=>Connection
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$transport$2f$H3Transport$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/transport/H3Transport.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$transport$2f$WebSocketTransport$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/transport/WebSocketTransport.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
;
;
;
const onOfflineListeners = [];
const hasGlobalEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
if (hasGlobalEventListeners) {
    /**
     * Detects when the network is offline and closes all connections.
     * (When switching wifi networks, etc.)
     */ addEventListener("offline", ()=>{
        console.warn(`@colyseus/sdk: 🛑 Network offline. Closing ${onOfflineListeners.length} connection(s)`);
        onOfflineListeners.forEach((listener)=>listener());
    }, false);
}
class Connection {
    transport;
    events = {};
    url;
    options;
    #_offlineListener = hasGlobalEventListeners ? ()=>this.close(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].MAY_TRY_RECONNECT) : null;
    constructor(protocol){
        switch(protocol){
            case "h3":
                this.transport = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$transport$2f$H3Transport$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["H3TransportTransport"](this.events);
                break;
            default:
                this.transport = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$transport$2f$WebSocketTransport$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WebSocketTransport"](this.events);
                break;
        }
    }
    connect(url, options) {
        if (hasGlobalEventListeners) {
            const onOpen = this.events.onopen;
            this.events.onopen = (ev)=>{
                onOfflineListeners.push(this.#_offlineListener);
                onOpen?.(ev);
            };
            const onClose = this.events.onclose;
            this.events.onclose = (ev)=>{
                onOfflineListeners.splice(onOfflineListeners.indexOf(this.#_offlineListener), 1);
                onClose?.(ev);
            };
        }
        this.url = url;
        this.options = options;
        this.transport.connect(url, options);
    }
    send(data) {
        this.transport.send(data);
    }
    sendUnreliable(data) {
        this.transport.sendUnreliable(data);
    }
    reconnect(queryParams) {
        // h3/WebTransport carries the session params (roomId/sessionId/reconnectionToken/
        // skipHandshake) in the bidi seat-reservation message, NOT the URL — appending
        // them as query params yields an invalid WebTransport path (ERR_METHOD_NOT_SUPPORTED).
        // So reconnect to the same origin and merge the params into the connect options.
        if (this.transport instanceof __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$transport$2f$H3Transport$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["H3TransportTransport"]) {
            this.transport.connect(this.url, {
                ...this.options,
                ...queryParams
            });
            return;
        }
        const url = new URL(this.url);
        // override query params
        for(const key in queryParams){
            url.searchParams.set(key, queryParams[key]);
        }
        this.transport.connect(url.toString(), this.options);
    }
    close(code, reason) {
        this.transport.close(code, reason);
    }
    get isOpen() {
        return this.transport.isOpen;
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/HTTP.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HTTP",
    ()=>HTTP,
    "detectResponseType",
    ()=>detectResponseType,
    "isJSONSerializable",
    ()=>isJSONSerializable
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/errors/Errors.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$fetchXHR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/fetchXHR.mjs [app-ssr] (ecmascript)");
;
;
function isJSONSerializable(value) {
    if (value === undefined) {
        return false;
    }
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean" || t === null) {
        return true;
    }
    if (t !== "object") {
        return false;
    }
    if (Array.isArray(value)) {
        return true;
    }
    if (value.buffer) {
        return false;
    }
    return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(request) {
    const _contentType = request.headers.get("content-type");
    const textTypes = new Set([
        "image/svg",
        "application/xml",
        "application/xhtml",
        "application/html"
    ]);
    if (!_contentType) {
        return "json";
    }
    const contentType = _contentType.split(";").shift() || "";
    if (JSON_RE.test(contentType)) {
        return "json";
    }
    if (textTypes.has(contentType) || contentType.startsWith("text/")) {
        return "text";
    }
    return "blob";
}
function getURLWithQueryParams(url, option) {
    const { params, query } = option || {};
    // Parse the URL and extract existing query parameters
    const [urlPath, urlQuery] = url.split("?");
    let path = urlPath;
    // Handle params substitution
    if (params) {
        if (Array.isArray(params)) {
            const paramPaths = path.split("/").filter((p)=>p.startsWith(":"));
            for (const [index, key] of paramPaths.entries()){
                const value = params[index];
                path = path.replace(key, value);
            }
        } else {
            for (const [key, value] of Object.entries(params)){
                path = path.replace(`:${key}`, String(value));
            }
        }
    }
    // Merge query parameters from URL and options
    const queryParams = new URLSearchParams(urlQuery);
    if (query) {
        for (const [key, value] of Object.entries(query)){
            if (value == null) continue;
            queryParams.set(key, String(value));
        }
    }
    // Build final URL
    let queryParamString = queryParams.toString();
    queryParamString = queryParamString.length > 0 ? `?${queryParamString}`.replace(/\+/g, "%20") : "";
    return `${path}${queryParamString}`;
}
class HTTP {
    authToken;
    options;
    sdk;
    _fetchFn;
    // alias "del()" to "delete()"
    del = this.delete;
    constructor(sdk, baseOptions, fetchFn){
        this.sdk = sdk;
        this.options = baseOptions;
        this._fetchFn = fetchFn;
    }
    /**
     * Lazily resolve the fetch implementation.
     * Falls back to XMLHttpRequest when fetch is unavailable (e.g. Cocos Creator Native).
     */ get fetchFn() {
        if (!this._fetchFn) {
            this._fetchFn = typeof globalThis.fetch !== 'undefined' ? globalThis.fetch.bind(globalThis) : __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$fetchXHR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["xhrFetch"];
        }
        return this._fetchFn;
    }
    async request(method, path, options) {
        return this.executeRequest(method, path, options);
    }
    get(path, options) {
        return this.request("GET", path, options);
    }
    post(path, options) {
        return this.request("POST", path, options);
    }
    delete(path, options) {
        return this.request("DELETE", path, options);
    }
    patch(path, options) {
        return this.request("PATCH", path, options);
    }
    put(path, options) {
        return this.request("PUT", path, options);
    }
    async executeRequest(method, path, requestOptions) {
        //
        // FIXME: if FormData is provided, merging "baseOptions.body" with
        // "options.body" will not work as intended
        //
        let body = this.options.body ? {
            ...this.options.body,
            ...requestOptions?.body || {}
        } : requestOptions?.body;
        const query = this.options.query ? {
            ...this.options.query,
            ...requestOptions?.query || {}
        } : requestOptions?.query;
        const params = this.options.params ? {
            ...this.options.params,
            ...requestOptions?.params || {}
        } : requestOptions?.params;
        const headers = new Headers(this.options.headers ? {
            ...this.options.headers,
            ...requestOptions?.headers || {}
        } : requestOptions?.headers);
        // Add Authorization header if authToken is set
        if (this.authToken && !headers.has("authorization")) {
            headers.set("authorization", `Bearer ${this.authToken}`);
        }
        // Stringify JSON-serializable objects for fetch() body
        if (isJSONSerializable(body) && typeof body === 'object' && body !== null) {
            if (!headers.has("content-type")) {
                headers.set("content-type", "application/json");
            }
            for (const [key, value] of Object.entries(body)){
                if (value instanceof Date) {
                    body[key] = value.toISOString();
                }
            }
            body = JSON.stringify(body);
        }
        const mergedOptions = {
            credentials: requestOptions?.credentials || "include",
            ...this.options,
            ...requestOptions,
            query,
            params,
            headers,
            body,
            method
        };
        const url = getURLWithQueryParams(this.sdk['getHttpEndpoint'](path.toString()), mergedOptions);
        let raw;
        try {
            raw = await this.fetchFn(url, mergedOptions);
        } catch (err) {
            // If it's an AbortError, re-throw as-is
            if (err.name === 'AbortError') {
                throw err;
            }
            // Re-throw with network error code at top level (e.g. ECONNREFUSED)
            const networkError = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ServerError"](err.cause?.code || err.code, err.message);
            networkError.response = raw;
            networkError.cause = err.cause;
            throw networkError;
        }
        const contentType = raw.headers.get("content-type");
        let data;
        if (contentType?.includes("json")) {
            data = await raw.json();
        } else if (contentType?.includes("text")) {
            data = await raw.text();
        } else {
            data = await raw.blob();
        }
        if (!raw.ok) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$errors$2f$Errors$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ServerError"](raw.status, data.message ?? data.error ?? raw.statusText, {
                headers: raw.headers,
                status: raw.status,
                response: raw,
                data
            });
        }
        return {
            raw,
            data,
            headers: raw.headers,
            status: raw.status,
            statusText: raw.statusText
        };
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/Reconnection.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createReconnection",
    ()=>createReconnection,
    "enqueueMessage",
    ()=>enqueueMessage,
    "exponentialBackoff",
    ()=>exponentialBackoff
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/** Fresh per-room reconnection config + buffer state (defaults). One per `Room`
 *  instance — `enqueuedMessages` must not be shared. */ function createReconnection() {
    return {
        enabled: true,
        retryCount: 0,
        maxRetries: 15,
        delay: 100,
        minDelay: 100,
        maxDelay: 5000,
        minUptime: 5000,
        backoff: exponentialBackoff,
        maxEnqueuedMessages: 10,
        enqueuedMessages: [],
        isReconnecting: false
    };
}
const exponentialBackoff = (attempt, delay)=>{
    return Math.floor(Math.pow(2, attempt) * delay);
};
/** Buffer a message to flush on (re)connect, evicting the oldest past the cap. */ function enqueueMessage(room, message) {
    room.reconnection.enqueuedMessages.push({
        data: message
    });
    if (room.reconnection.enqueuedMessages.length > room.reconnection.maxEnqueuedMessages) {
        room.reconnection.enqueuedMessages.shift();
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/Room.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Room",
    ()=>Room
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$RoomInput$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/input/RoomInput.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$node$2d$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/msgpackr/node-index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$pack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/msgpackr/pack.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$unpack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/msgpackr/unpack.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Connection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Connection.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/serializer/Serializer.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$nanoevents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/nanoevents.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/signal.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$SchemaSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/serializer/SchemaSerializer.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/RoomClock.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Reconnection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Reconnection.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomRequest$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/RoomRequest.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/utils.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
class Room {
    roomId;
    sessionId;
    reconnectionToken;
    name;
    connection;
    // Public signals
    onStateChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    onError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    onLeave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    onReconnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    onDrop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    onJoin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$signal$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSignal"])();
    serializerId;
    serializer;
    // reconnection logic
    reconnection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Reconnection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createReconnection"])();
    joinedAtTime = 0;
    /**
     * Server-time + RTT estimator, driven by the {@link ProtocolModifier.TIMED}
     * prefix that servers emit when `defineInput()` was called.
     *
     * PRESENCE CONTRACT: `clock` is never `undefined` and always satisfies
     * {@link RoomClock} — every member, including `renderNow()`, is callable
     * with no optional chaining and no fallback.
     *
     * - Defaults to a shared frozen {@link NULL_CLOCK} so `room.clock.serverNow()`
     *   always works. The shim returns the client's own `performance.now()` and
     *   reports `0` for RTT. Rooms that never call `defineInput()` keep this
     *   stub for the whole session — zero allocation cost for chat / lobby /
     *   turn-based rooms.
     * - After handshake on an input room, a default {@link RoomClockImpl} is
     *   instantiated. Users can swap their own implementation in via
     *   `room.clock = new MyClock()` between `await joinOrCreate(...)` and
     *   the first state message (any state-message arrival is on a future
     *   microtask, so a synchronous swap is race-free). A custom clock with no
     *   slew state of its own satisfies the `renderNow` guarantee by aliasing:
     *   `renderNow() { return this.serverNow(); }`.
     */ clock = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NULL_CLOCK"];
    onMessageHandlers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$nanoevents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createNanoEvents"])();
    packr;
    sharedBuffer;
    #lastPingTime = 0;
    #pingCallback = undefined;
    /**
     * Default time (ms) a `room.request()` / `room.send(..., callback)` waits
     * for a reply before rejecting. Class-level default — tune globally via
     * `Room.defaultRequestTimeout = ms`; override per-call with the `timeout` option.
     */ static defaultRequestTimeout = 10000;
    /** Monotonic id correlating a {@link Protocol.ROOM_REQUEST} with its reply. @internal */ #nextRequestId = 0;
    /**
     * In-flight round-trips awaiting a {@link Protocol.ROOM_RESPONSE}, keyed by the
     * monotonic request id. `onReply` receives the decoded outcome `(ok, payload,
     * faulted)`; `onClose` (optional) rejects on disconnect — its absence drops the
     * registration silently. @internal
     */ #pending = new Map();
    /**
     * Per-room input state — schema ctor, server-advertised stamp/rate flags,
     * and the cached {@link InputHandle} — all grouped in {@link RoomInput}.
     * Lazily created only when the room declares input (an `INPUT_*` handshake
     * section arrives) or `input()` is called; stays `undefined` for chat /
     * lobby / turn-based rooms — zero allocation.
     * @internal
     */ #input;
    /**
     * Seq of the newest {@link ProtocolModifier.UNRELIABLE} patch applied, so a
     * reordered datagram can be dropped rather than write a stale value. Wraps
     * at 65536; `0` is the post-`ROOM_STATE` baseline. Stays `0` forever on
     * rooms whose state declares no `@unreliable` field.
     * @internal
     */ #lastUnreliableSeq = 0;
    constructor(name, rootSchema){
        this.name = name;
        this.packr = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$pack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Packr"]();
        this.sharedBuffer = new Uint8Array(8192);
        if (rootSchema) {
            const serializer = new ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSerializer"])("schema"));
            this.serializer = serializer;
            const state = new rootSchema();
            serializer.state = state;
            serializer.decoder = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Decoder"](state);
        }
        this.onLeave(()=>{
            this.removeAllListeners();
            this.destroy();
        });
    }
    connect(endpoint, options, headers) {
        this.connection = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Connection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Connection"](options.protocol);
        this.connection.events.onmessage = this.onMessageCallback.bind(this);
        this.connection.events.onclose = (e)=>{
            // the in-flight requests can't be answered on a closed socket
            this.#rejectAllPending("connection closed before a response was received.");
            if (this.joinedAtTime === 0) {
                console.warn?.(`Room connection was closed unexpectedly (${e.code}): ${e.reason}`);
                this.onError.invoke(e.code, e.reason);
                return;
            }
            if (e.code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].NO_STATUS_RECEIVED || e.code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].ABNORMAL_CLOSURE || e.code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].GOING_AWAY || e.code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].MAY_TRY_RECONNECT) {
                this.onDrop.invoke(e.code, e.reason);
                this.handleReconnection(e.code, e.reason);
            } else {
                this.onLeave.invoke(e.code, e.reason);
            }
        };
        this.connection.events.onerror = (e)=>{
            this.onError.invoke(e.code, e.reason);
        };
        /**
         * if local serializer has state, it means we don't need to receive the
         * handshake from the server
         */ const skipHandshake = this.serializer?.getState() !== undefined;
        if (options.protocol === "h3") {
            // FIXME: refactor this.
            const url = new URL(endpoint);
            this.connection.connect(url.origin, {
                ...options,
                skipHandshake
            });
        } else {
            this.connection.connect(`${endpoint}${skipHandshake ? "&skipHandshake=1" : ""}`, headers);
        }
    }
    leave(consented = true) {
        return new Promise((resolve)=>{
            this.onLeave((code)=>resolve(code));
            if (this.connection) {
                if (consented) {
                    this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].LEAVE_ROOM;
                    this.connection.send(this.sharedBuffer.subarray(0, 1));
                } else {
                    this.connection.close();
                }
            } else {
                this.onLeave.invoke(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].CONSENTED);
            }
        });
    }
    onMessage(type, callback) {
        return this.onMessageHandlers.on(this.getMessageHandlerKey(type), callback);
    }
    ping(callback) {
        // skip if connection is not open
        if (!this.connection?.isOpen) {
            return;
        }
        this.#lastPingTime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
        this.#pingCallback = callback;
        this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].PING;
        this.connection.send(this.sharedBuffer.subarray(0, 1));
    }
    send(messageType, payload, callback) {
        // Request/response form: defer to `request()` and adapt to a
        // (response, error) callback.
        if (callback !== undefined) {
            this.request(messageType, payload).then((response)=>callback(response, undefined), (error)=>callback(undefined, error));
            return;
        }
        const it = {
            offset: 1
        };
        this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_DATA;
        if (typeof messageType === "string") {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(this.sharedBuffer, messageType, it);
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.sharedBuffer, messageType, it);
        }
        const headerLength = it.offset;
        let data;
        if (payload !== undefined) {
            // Reserve `headerLength` writable bytes at the front of msgpackr's
            // output and prepend the protocol header into them.
            data = this.packr.pack(payload, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$pack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["RESERVE_START_SPACE"] | headerLength);
            data.set(this.sharedBuffer.subarray(0, headerLength), 0);
        } else {
            data = this.sharedBuffer.subarray(0, headerLength);
        }
        // If connection is not open, buffer the message
        if (!this.connection.isOpen) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Reconnection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["enqueueMessage"])(this, new Uint8Array(data));
        } else {
            this.connection.send(data);
        }
    }
    request(messageType, payload, options) {
        if (!this.connection.isOpen) {
            return Promise.reject(new Error(`cannot send request "${messageType}": connection is not open.`));
        }
        const timeoutMs = options?.timeout ?? Room.defaultRequestTimeout;
        // request = sendRequest + fail-fast-offline (above) + promise + timeout. The
        // timer lives in this closure, so the shared #pending registry stays unaware
        // of timeouts (a request-only concern); the reply callback and onClose both clear it.
        return new Promise((resolve, reject)=>{
            let timer;
            const id = this.sendRequest(messageType, payload, {
                mode: options?.mode
            }, (ok, replyPayload, faulted)=>{
                clearTimeout(timer);
                if (ok) {
                    resolve(replyPayload);
                } else {
                    reject((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomRequest$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toRequestError"])(replyPayload, faulted));
                }
            }, (reason)=>{
                clearTimeout(timer);
                reject(new Error(reason));
            });
            timer = setTimeout(()=>{
                this.cancelRequest(id);
                reject(new Error(`request "${messageType}" timed out after ${timeoutMs}ms.`));
            }, timeoutMs);
        });
    }
    /** Next correlation id (uint32) for a round-trip. @internal */ #mintRequestId() {
        const id = this.#nextRequestId;
        this.#nextRequestId = this.#nextRequestId + 1 >>> 0; // keep within uint32
        return id;
    }
    /** Encode a {@link Protocol.ROOM_REQUEST} frame (shared by `request` + `sendRequest`).
     *  The returned buffer aliases `sharedBuffer` for the payload-less case, so
     *  it must be transmitted (or copied) before the next encode. @internal */ #encodeRequestFrame(requestId, messageType, payload) {
        const it = {
            offset: 1
        };
        this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_REQUEST;
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.sharedBuffer, requestId, it);
        if (typeof messageType === "string") {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(this.sharedBuffer, messageType, it);
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.sharedBuffer, messageType, it);
        }
        const headerLength = it.offset;
        if (payload !== undefined) {
            const data = this.packr.pack(payload, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$pack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["RESERVE_START_SPACE"] | headerLength);
            data.set(this.sharedBuffer.subarray(0, headerLength), 0);
            return data;
        }
        return this.sharedBuffer.subarray(0, headerLength);
    }
    /**
     * Low-level round-trip primitive: register `onReply` (called once with the
     * decoded outcome when the server replies) and transmit a
     * {@link Protocol.ROOM_REQUEST} (`mode` picks the channel). {@link request}
     * wraps it with a promise + timeout. `onClose` (optional) is invoked on
     * disconnect — omit it to drop the registration silently. Returns the request
     * id, or `-1` if an unreliable send couldn't be transmitted (offline). @internal
     */ sendRequest(messageType, payload, opts, onReply, onClose) {
        const requestId = this.#mintRequestId();
        const data = this.#encodeRequestFrame(requestId, messageType, payload);
        if (opts.mode === "unreliable") {
            if (!this.connection.isOpen) {
                return -1;
            }
            // Sent once — no unreliable channel falls back to reliable inside the
            // transport.
            this.connection.sendUnreliable(data);
        } else if (this.connection.isOpen) {
            this.connection.send(data);
        } else {
            // Reliable + offline: buffer so it flushes on (re)connect.
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Reconnection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["enqueueMessage"])(this, new Uint8Array(data));
        }
        this.#pending.set(requestId, {
            onReply,
            onClose
        });
        return requestId;
    }
    /** Drop a pending round-trip (request timeout, or the predict layer's TTL/cancel
     *  path). Idempotent. @internal */ cancelRequest(id) {
        this.#pending.delete(id);
    }
    #rejectAllPending(reason) {
        if (this.#pending.size === 0) {
            return;
        }
        // request entries reject (their `onClose` clears the timer); entries with no
        // `onClose` drop silently.
        for (const entry of this.#pending.values()){
            entry.onClose?.(reason);
        }
        this.#pending.clear();
    }
    sendUnreliable(type, message) {
        // If connection is not open, skip
        if (!this.connection.isOpen) {
            return;
        }
        const it = {
            offset: 1
        };
        this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_DATA;
        if (typeof type === "string") {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(this.sharedBuffer, type, it);
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.sharedBuffer, type, it);
        }
        const headerLength = it.offset;
        let data;
        if (message !== undefined) {
            data = this.packr.pack(message, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$pack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["RESERVE_START_SPACE"] | headerLength);
            data.set(this.sharedBuffer.subarray(0, headerLength), 0);
        } else {
            data = this.sharedBuffer.subarray(0, headerLength);
        }
        this.connection.sendUnreliable(data);
    }
    sendBytes(type, bytes) {
        const it = {
            offset: 1
        };
        this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_DATA_BYTES;
        if (typeof type === "string") {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(this.sharedBuffer, type, it);
        } else {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.sharedBuffer, type, it);
        }
        const headerLength = it.offset;
        // grow the scratch buffer if needed, preserving the header bytes
        if (headerLength + bytes.byteLength > this.sharedBuffer.byteLength) {
            const newBuffer = new Uint8Array(headerLength + bytes.byteLength);
            newBuffer.set(this.sharedBuffer.subarray(0, headerLength));
            this.sharedBuffer = newBuffer;
        }
        this.sharedBuffer.set(bytes, headerLength);
        // If connection is not open, buffer the message
        if (!this.connection.isOpen) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Reconnection$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["enqueueMessage"])(this, this.sharedBuffer.subarray(0, headerLength + bytes.byteLength));
        } else {
            this.connection.send(this.sharedBuffer.subarray(0, headerLength + bytes.byteLength));
        }
    }
    /**
     * Get the per-room input handle. Lazily created on first call and cached;
     * subsequent calls return the same handle (options on later calls are
     * ignored — a warning fires once if they differ from the handle's config).
     *
     * Schema discovery, in order:
     * 1. `options.type` — explicit constructor (overrides everything).
     * 2. Server-sent reflection from the JOIN handshake — populated when the
     *    server room called `defineInput()`. The synthesized class has the
     *    same fields as the server's input schema; `instanceof YourInput`
     *    won't pass on it.
     *
     * Throws if neither source has produced a constructor.
     *
     * Inputs are always delta-encoded; every `send()` transmits one input
     * (a body-less frame when nothing changed). For rollback netcode, prefer
     * `{ mode: "unreliable", historySize: 4 }`: tiny per-tick payloads,
     * redundancy across drops, idempotent under reordering.
     *
     * @example
     * ```typescript
     * const room = await client.joinOrCreate<typeof FpsRoom>("fps");
     * const input = room.input({ mode: "unreliable" });   // type from server
     * // each simulation tick:
     * input.data.seq++;
     * input.data.vx = vx;
     * input.data.vy = vy;
     * input.send();
     * ```
     */ input(options) {
        return (this.#input ??= new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$RoomInput$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RoomInput"](this)).handle(options);
    }
    get state() {
        return this.serializer.getState();
    }
    removeAllListeners() {
        this.onJoin.clear();
        this.onStateChange.clear();
        this.onError.clear();
        this.onLeave.clear();
        this.onReconnect.clear();
        this.onDrop.clear();
        this.onMessageHandlers.events = {};
        if (this.serializer instanceof __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$SchemaSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SchemaSerializer"]) {
            // Remove callback references
            this.serializer.decoder.root.callbacks = {};
        }
    }
    onMessageCallback(event) {
        this.#dispatchFrame(new Uint8Array(event.data));
    }
    /** Decode + dispatch a single protocol frame. */ #dispatchFrame(buffer) {
        const it = {
            offset: 1
        };
        // Strip modifier bits (e.g. ProtocolModifier.TIMED). Consume any
        // modifier-attached prefix bytes here so the dispatch tree below
        // stays modifier-agnostic.
        const rawByte = buffer[0];
        const code = rawByte & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROTOCOL_CODE_MASK"];
        if (rawByte & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProtocolModifier"].TIMED) {
            // [uint32 sNow][uint32 inputSeq]  — sNow = ms since room start
            // (clock.elapsedTime); inputSeq = last PROCESSED input.
            //
            // Routing: the INPUT ack goes to the input handle (it owns the
            // round-trip — what you sent, what's acked); it returns an RTT
            // sample which, with sNow, feeds the time-only clock. `decode.*`
            // advance `it.offset`; read in declared byte order.
            const sNow = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].uint32(buffer, it);
            const inputSeq = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].uint32(buffer, it);
            const rttSample = this.#input ? this.#input.ackInput(inputSeq) : -1;
            this.clock.sample(sNow, rttSample);
        }
        if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].JOIN_ROOM) {
            const reconnectionToken = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].utf8Read(buffer, it, buffer[it.offset++]);
            this.serializerId = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].utf8Read(buffer, it, buffer[it.offset++]);
            // Instantiate serializer if not locally available.
            if (!this.serializer) {
                const serializer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSerializer"])(this.serializerId);
                this.serializer = new serializer();
            }
            // State reflection is length-prefixed (varint). The schema decoder
            // runs `while (offset < bytes.byteLength)` so without a boundary
            // it would read past the state reflection into the trailing
            // tagged-section bytes — see Protocol.ts for the wire layout.
            const stateReflectionLen = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
            if (stateReflectionLen > 0 && this.serializer.handshake) {
                const stateReflectionEnd = it.offset + stateReflectionLen;
                this.serializer.handshake(buffer.subarray(0, stateReflectionEnd), it);
                it.offset = stateReflectionEnd;
            }
            // Parse trailing tagged sections (forward-compatible: unknown tags
            // are skipped via length). See HandshakeSection in shared-types.
            while(it.offset < buffer.byteLength){
                const tag = buffer[it.offset++];
                const sectionLen = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
                const sectionEnd = it.offset + sectionLen;
                if (tag === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HandshakeSection"].INPUT_REFLECTION) {
                    (this.#input ??= new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$RoomInput$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RoomInput"](this)).applyReflection(buffer, it, sectionEnd);
                } else if (tag === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HandshakeSection"].INPUT_OPTIONS) {
                    (this.#input ??= new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$RoomInput$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RoomInput"](this)).applyOptions(buffer, it);
                }
                it.offset = sectionEnd;
            }
            // Hand the snapshot cadence to the clock (sections decode in any
            // order, so do it once the loop has both the clock and patchRate) —
            // interpolation reads it to tell an idle delta-encoded gap from the
            // normal patch interval.
            const patchRate = this.#input?.patchRate;
            if (patchRate !== undefined) {
                this.clock.setPatchInterval?.(patchRate);
            }
            if (this.joinedAtTime === 0) {
                this.joinedAtTime = Date.now();
                this.onJoin.invoke();
            } else {
                console.info(`[Colyseus reconnection]: ${String.fromCodePoint(0x2705)} reconnection successful!`); // ✅
                this.reconnection.isReconnecting = false;
                this.onReconnect.invoke();
            }
            this.reconnectionToken = `${this.roomId}:${reconnectionToken}`;
            // Acknowledge JOIN_ROOM.
            this.sharedBuffer[0] = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].JOIN_ROOM;
            this.connection.send(this.sharedBuffer.subarray(0, 1));
            // Send any enqueued messages that were buffered while disconnected
            if (this.reconnection.enqueuedMessages.length > 0) {
                for (const message of this.reconnection.enqueuedMessages){
                    this.connection.send(message.data);
                }
                // Clear the buffer after sending
                this.reconnection.enqueuedMessages = [];
            }
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ERROR) {
            const code = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
            const message = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].string(buffer, it);
            this.onError.invoke(code, message);
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].LEAVE_ROOM) {
            this.leave();
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_STATE) {
            // Full state re-baselines the unreliable timeline (join / resync).
            this.#lastUnreliableSeq = 0;
            this.serializer.setState(buffer, it);
            this.onStateChange.invoke(this.serializer.getState());
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_STATE_PATCH) {
            // The unreliable channel can reorder. `@unreliable` fields carry
            // absolute values, so a late frame would write a stale one that
            // survives until the field changes again — drop it instead.
            if (rawByte & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProtocolModifier"].UNRELIABLE) {
                const seq = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].uint16(buffer, it);
                // wrap-safe at 65536: a positive int16 delta means newer
                if (seq - this.#lastUnreliableSeq << 16 >> 16 <= 0) {
                    return;
                }
                this.#lastUnreliableSeq = seq;
            }
            this.serializer.patch(buffer, it);
            this.onStateChange.invoke(this.serializer.getState());
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_DATA) {
            const type = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].stringCheck(buffer, it) ? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].string(buffer, it) : __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
            const message = buffer.byteLength > it.offset ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$unpack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["unpack"])(buffer, {
                start: it.offset
            }) : undefined;
            this.dispatchMessage(type, message);
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_DATA_BYTES) {
            const type = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].stringCheck(buffer, it) ? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].string(buffer, it) : __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
            this.dispatchMessage(type, buffer.subarray(it.offset));
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_RESPONSE) {
            // reply to a pending `request()` / `send(..., callback)`.
            const requestId = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
            const status = buffer[it.offset++];
            const payload = buffer.byteLength > it.offset ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$msgpackr$2f$unpack$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["unpack"])(buffer, {
                start: it.offset
            }) : undefined;
            const entry = this.#pending.get(requestId);
            // already answered (e.g. timed out / cancelled) or unknown id — ignore
            if (entry !== undefined) {
                this.#pending.delete(requestId);
                // the ONE place the wire's three statuses collapse to (ok, payload, faulted):
                entry.onReply(status === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponseStatus"].OK, payload, status === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ResponseStatus"].ERROR);
            }
        } else if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].PING) {
            this.#pingCallback?.(Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])() - this.#lastPingTime));
            this.#pingCallback = undefined;
        }
    }
    dispatchMessage(type, message) {
        const messageType = this.getMessageHandlerKey(type);
        if (this.onMessageHandlers.events[messageType]) {
            this.onMessageHandlers.emit(messageType, message);
        } else if (this.onMessageHandlers.events['*']) {
            this.onMessageHandlers.emit('*', type, message);
        } else if (!messageType.startsWith("__")) {
            console.warn?.(`@colyseus/sdk: onMessage() not registered for type '${type}'.`);
        }
    }
    destroy() {
        if (this.serializer) {
            this.serializer.teardown();
        }
    }
    getMessageHandlerKey(type) {
        switch(typeof type){
            // string
            case "string":
                return type;
            // number
            case "number":
                return `i${type}`;
            default:
                throw new Error("invalid message type.");
        }
    }
    handleReconnection(code, reason) {
        if (!this.reconnection.enabled) {
            this.onLeave.invoke(code, reason);
            return;
        }
        if (Date.now() - this.joinedAtTime < this.reconnection.minUptime) {
            console.info(`[Colyseus reconnection]: ${String.fromCodePoint(0x274C)} Room has not been up for long enough for automatic reconnection. (min uptime: ${this.reconnection.minUptime}ms)`); // ❌
            this.onLeave.invoke(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].ABNORMAL_CLOSURE, "Room uptime too short for reconnection.");
            return;
        }
        if (!this.reconnection.isReconnecting) {
            this.reconnection.retryCount = 0;
            this.reconnection.isReconnecting = true;
            // The server allocates a FRESH input buffer for the reconnected client
            // (its consumed counter restarts at 0). Zero ours now so post-reconnect
            // seqs line up — otherwise every ack echo (≤ the old counter) is
            // discarded until the new counter catches up past it, and `sentCount`
            // stays permanently ahead. Reconcilers follow this reset on their own
            // (they poll the handle's `epoch`) — no `onReconnect` wiring needed.
            this.#input?.reset();
        }
        this.retryReconnection();
    }
    retryReconnection() {
        if (this.reconnection.retryCount >= this.reconnection.maxRetries) {
            // No more retries
            console.info(`[Colyseus reconnection]: ${String.fromCodePoint(0x274C)} ❌ Reconnection failed after ${this.reconnection.maxRetries} attempts.`); // ❌
            this.reconnection.isReconnecting = false;
            this.onLeave.invoke(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].FAILED_TO_RECONNECT, "No more retries. Reconnection failed.");
            return;
        }
        this.reconnection.retryCount++;
        const delay = Math.min(this.reconnection.maxDelay, Math.max(this.reconnection.minDelay, this.reconnection.backoff(this.reconnection.retryCount, this.reconnection.delay)));
        console.info(`[Colyseus reconnection]: ${String.fromCodePoint(0x023F3)} will retry in ${(delay / 1000).toFixed(1)} seconds...`); // 🔄
        // Wait before attempting reconnection
        setTimeout(()=>{
            try {
                console.info(`[Colyseus reconnection]: ${String.fromCodePoint(0x1F504)} Re-establishing sessionId '${this.sessionId}' with roomId '${this.roomId}'... (attempt ${this.reconnection.retryCount} of ${this.reconnection.maxRetries})`); // 🔄
                this.connection.reconnect({
                    reconnectionToken: this.reconnectionToken.split(":")[1],
                    skipHandshake: true
                });
            } catch (e) {
                this.retryReconnection();
            }
        }, delay);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/RoomClock.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NULL_CLOCK",
    ()=>NULL_CLOCK,
    "RoomClockImpl",
    ()=>RoomClockImpl
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/utils.mjs [app-ssr] (ecmascript)");
;
/**
 * Stub clock returned by {@link Room.clock} until the JOIN_ROOM handshake
 * reveals whether the room declared input.
 *
 * - `serverNow()` falls back to the client's own `performance.now()` — a
 *   monotonic, non-offset-corrected timestamp. Good enough for any consumer
 *   that just wants "a monotonic ms reading."
 * - `rtt()` / `smoothedRtt()` return `0` (no samples available).
 * - `sample()` is a no-op.
 *
 * Shared, frozen singleton — costs nothing to keep around for rooms that
 * never call `defineInput()`. The Room replaces it with a real
 * {@link RoomClockImpl} during handshake when input is declared.
 */ const NULL_CLOCK = Object.freeze({
    now: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])(),
    serverNow: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])(),
    renderNow: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])(),
    rtt: ()=>0,
    smoothedRtt: ()=>0,
    jitter: ()=>0,
    lastServerTime: ()=>0,
    patchInterval: ()=>0,
    setPatchInterval: (_ms)=>{},
    sample: (_sNow, _rttSample)=>{}
});
/**
 * Per-room clock-sync + RTT estimator, fed by the {@link ProtocolModifier.TIMED}
 * prefix the server prepends to state messages when the room declared input
 * via `defineInput()`.
 *
 * Two independent estimates are tracked:
 *
 * - **Clock offset** (`serverNow()`): the delta between server `performance.now()`
 *   and the client's. Seeded by the first sample (offset-only or RTT-valid)
 *   then EMA-smoothed. Used so client-side comparisons against
 *   server-stamped deadlines (`invulnUntil`, `hitTime`, etc.) line up.
 *
 * - **Round-trip time** (`rtt()` / `smoothedRtt()`): computed by correlating
 *   the server-echoed `lastInputSeq` with the client's own send-time table.
 *   Seeded *only* by the first RTT-valid sample (separate from the offset
 *   seed) — otherwise the first valid sample would EMA-blend from 0 and
 *   strand the smoothed value at ~10% of reality, after which the outlier
 *   guard would reject every subsequent real sample.
 *
 * Doesn't know about transports, schemas, input, or Room internals — the Room
 * calls {@link sample} when a TIMED prefix arrives, passing a pre-computed RTT
 * sample (the input round-trip is tracked by the InputHandle). Pure math.
 */ class RoomClockImpl {
    /** Default exponential-smoothing weight for offset + RTT EMA. */ static EMA_ALPHA = 0.1;
    /** Default slew time-constant (ms) for {@link renderNow}. ~250 ms: offset
     *  corrections smear over a few frames instead of popping, while the render
     *  timeline still tracks `serverNow()` closely in steady state. */ static RENDER_TAU = 250;
    /** Gap (ms) past which {@link renderNow} SNAPS to `serverNow()` instead of
     *  slewing. Slewing a large gap (join warmup while the offset EMA is still
     *  converging, a route-change offset jump, a tab-resume stall) would render
     *  a visible standing lag; only wobble-scale gaps get smoothed. */ static RENDER_SNAP = 250;
    /**
     * RTT samples greater than `outlierFactor × smoothedRtt` are rejected.
     * Catches tab-resume spikes once the smoothed value has converged; the
     * separate `_rttHasSample` seed prevents this from clamping early
     * legitimate samples to a stranded baseline.
     */ static RTT_OUTLIER_X = 4;
    /** RFC 3550 jitter EMA gain (1/16) — slower than the RTT/offset EMA so the
     *  reported jitter is a steady readout rather than a per-patch flicker. */ static JITTER_GAIN = 1 / 16;
    /** Arrival gaps beyond `JITTER_STALL_X ×` the cadence (a tab-resume stall), and
     *  sub-cadence bursts (mult 0), are skipped so they don't spike the jitter EMA. */ static JITTER_STALL_X = 4;
    /**
     * Clock-offset jitter gate. An offset sample is only folded into the EMA when
     * its RTT is within `RTT_GATE_FACTOR ×` the windowed-minimum RTT — i.e. the
     * packet traversed near-empty queues, so its `rtt/2` one-way estimate (and
     * thus the offset) is least corrupted by jitter. Higher-RTT samples carry
     * proportionally more jitter and are dropped (the offset just holds). This is
     * the NTP/QUIC pattern: EMA-smooth the value you report, but filter the input
     * by the low-delay floor — purely a VARIANCE reduction on `serverNow()`, which
     * is what steadies the stamped reckonTime. The held offset's small bias is
     * harmless (it cancels: predict + rewind share the stamped instant).
     */ static RTT_GATE_FACTOR = 1.2;
    /** Sliding window (ms) over which the RTT floor (gate reference) is tracked.
     *  Long enough to hold a good low-jitter sample; on a route change the stale
     *  floor expires within this horizon and the gate re-opens. */ static RTT_GATE_WINDOW = 10_000;
    /** Post-reset warmup: the first `RTT_GATE_WARMUP` RTT-valid samples BYPASS the
     *  gate (pure EMA), so the offset converges at baseline speed after a reset /
     *  reconnect. The gate drops samples, which otherwise stretches convergence —
     *  worst at high RTT, where it showed as an inflated offset.std until settled.
     *  ~3× the EMA time-constant (1/α = 10) ⇒ converged before the gate engages for
     *  steady-state variance reduction. `0` disables the warmup (gate from sample 1). */ static RTT_GATE_WARMUP = 30;
    _clockOffset = 0;
    _clockHasSample = false;
    _offsetCount = 0;
    // Sliding-window-minimum of RTT (monotonic deque: values increasing front→back,
    // front = windowed min). Parallel number arrays → no per-sample object alloc.
    _rttFloorT = [];
    _rttFloorV = [];
    _rtt = 0;
    _smoothedRtt = 0;
    _rttHasSample = false;
    _jitter = 0;
    _lastRecvTime = -1;
    _lastServerTime = 0;
    _patchInterval = 0;
    _renderTau = RoomClockImpl.RENDER_TAU;
    _renderSn = 0;
    _renderSnAt = 0;
    /** Estimated server clock: **milliseconds since room start** (the server's
     *  `clock.elapsedTime`, reconstructed via the wire `sNow` + local offset).
     *  NOT raw `performance.now()` — a portable integer-ms timeline the server's
     *  own time-keyed logic shares, so client-side reckon stays in phase.
     *  Returns the local clock until the first sample lands. */ serverNow() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])() + this._clockOffset;
    }
    /** Slew-limited render timeline — see {@link RoomClockLike.renderNow}.
     *  Free-runs at 1 ms/ms and servos toward {@link serverNow} with the
     *  time-constant set by {@link setRenderTau} (default {@link RENDER_TAU});
     *  `τ ≤ 0` disables the slew and returns `serverNow()` verbatim. Idempotent
     *  within a frame: it advances only on the first call each frame (guarded on
     *  the local clock), so reading it once per tracked entity doesn't over-step
     *  it. */ renderNow() {
        const target = this.serverNow();
        if (this._renderTau <= 0) {
            return target;
        }
        const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
        // Seed on first use — jump straight to the current server-present.
        if (this._renderSn === 0) {
            this._renderSn = target;
            this._renderSnAt = t;
            return this._renderSn;
        }
        const dt = Math.min(t - this._renderSnAt, 100); // clamp tab-resume stalls
        if (dt < 0.5) {
            return this._renderSn;
        } // same frame — advance once
        this._renderSnAt = t;
        this._renderSn += dt; // free-run at 1 ms/ms
        // Snap past large gaps rather than slew them (see RENDER_SNAP) — a
        // standing lag reads worse than one clean jump.
        if (Math.abs(target - this._renderSn) > RoomClockImpl.RENDER_SNAP) {
            this._renderSn = target;
            return this._renderSn;
        }
        this._renderSn += (target - this._renderSn) * (1 - Math.exp(-dt / this._renderTau)); // servo toward server-present
        return this._renderSn;
    }
    /** Set the {@link renderNow} slew time-constant (ms). `≤ 0` disables slewing
     *  (renderNow == serverNow). Larger = smoother, but offset corrections lag
     *  longer. */ setRenderTau(milliseconds) {
        this._renderTau = milliseconds > 0 ? milliseconds : 0;
    }
    /** Local monotonic clock (ms): the client's own reading WITHOUT the server
     *  offset — the base {@link serverNow} adds the offset to. Use it for
     *  self-imposed relative cooldowns (`now() - lastAction >= COOLDOWN_MS`): they
     *  need only a steady rate, not clock sync, so this avoids the offset-EMA
     *  jitter `serverNow()` carries. @see RoomClockLike.now */ now() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
    }
    /** Most recent RTT sample (ms). `0` until the first RTT-valid sample lands. */ rtt() {
        return this._rtt;
    }
    /** EMA-smoothed RTT (ms). `0` until the first RTT-valid sample lands. Prefer this for forward-prediction. */ smoothedRtt() {
        return this._smoothedRtt;
    }
    /** Connection jitter (ms): RFC 3550-style interarrival jitter — see
     *  {@link RoomClockLike.jitter}. `0` until the cadence is known and two patches land. */ jitter() {
        return this._jitter;
    }
    /** Server-encode time (raw `sNow`) of the most recent patch. Pair with
     *  {@link serverNow} for the snapshot age (`serverNow() − lastServerTime()`).
     *  `0` until the first sample. */ lastServerTime() {
        return this._lastServerTime;
    }
    /** Server snapshot cadence (`patchRate`, ms); `0` until the handshake
     *  advertises it. @see RoomClockLike.patchInterval */ patchInterval() {
        return this._patchInterval;
    }
    /** Set the server snapshot cadence (ms), from the input handshake's
     *  advertised `patchRate`. Non-positive values clear it back to `0`. */ setPatchInterval(milliseconds) {
        this._patchInterval = milliseconds > 0 ? milliseconds : 0;
    }
    /**
     * Feed a decoded TIMED sample. The input round-trip lives on the
     * {@link InputHandle} now — the Room hands us a pre-computed RTT sample.
     *
     * @param sNow       Server clock (ms since room start, `clock.elapsedTime`)
     *                   → clock offset.
     * @param rttSample  Round-trip time (ms) for the input ack this packet
     *                   carried, or `< 0` if none (no matching send / no input
     *                   yet). Filtered + EMA-smoothed here.
     */ sample(sNow, rttSample) {
        const tNow = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
        const a = RoomClockImpl.EMA_ALPHA;
        // Connection jitter (RFC 3550 interarrival): how far this patch's arrival
        // interval strays from the advertised cadence — measured against the cadence,
        // NOT `sNow` (only refreshed at the sim-tick rate, so a sim/patch rate mismatch
        // would beat in as phantom jitter). Idle/dropped patches round to a whole
        // multiple; bursts (mult 0) and stalls (> X) are skipped.
        const PI = this._patchInterval;
        if (this._lastRecvTime >= 0 && PI > 0) {
            const gap = tNow - this._lastRecvTime;
            const mult = Math.round(gap / PI);
            if (mult >= 1 && mult <= RoomClockImpl.JITTER_STALL_X) {
                this._jitter += (Math.abs(gap - mult * PI) - this._jitter) * RoomClockImpl.JITTER_GAIN;
            }
        }
        this._lastRecvTime = tNow;
        // Stamp the snapshot's server-encode time (raw, un-reconstructed).
        this._lastServerTime = sNow;
        // Reject impossible / outlier RTT (tab-resume spikes once converged).
        if (rttSample < 0) {
            rttSample = -1;
        } else if (this._smoothedRtt > 0 && rttSample > this._smoothedRtt * RoomClockImpl.RTT_OUTLIER_X) {
            rttSample = -1;
        }
        // Clock offset: refreshed every patch (sNow advances each patch). Prefer
        // the RTT-corrected estimate when a fresh sample exists, else OWL-biased.
        const offsetSample = rttSample >= 0 ? sNow + rttSample / 2 - tNow : sNow - tNow;
        if (!this._clockHasSample) {
            this._clockOffset = offsetSample;
            this._clockHasSample = true;
            if (rttSample >= 0) {
                this.pushRttFloor(rttSample, tNow);
                this._offsetCount = 1;
            }
        } else if (rttSample >= 0) {
            // Track the windowed-min RTT and gate: only low-jitter samples update the
            // offset (see RTT_GATE_FACTOR) — EXCEPT during the post-reset warmup, when
            // the gate is bypassed so convergence isn't stretched (see RTT_GATE_WARMUP).
            // rttSample<0 (no ack this packet) skips the offset entirely — an
            // uncorrected `sNow-tNow` is the noisiest kind, so let the offset hold.
            const floor = this.pushRttFloor(rttSample, tNow);
            const warming = this._offsetCount < RoomClockImpl.RTT_GATE_WARMUP;
            this._offsetCount++;
            if (warming || rttSample <= floor * RoomClockImpl.RTT_GATE_FACTOR) {
                this._clockOffset = this._clockOffset * (1 - a) + offsetSample * a;
            }
        }
        // RTT: seeded on the first valid sample (separate flag — see class doc).
        if (rttSample >= 0) {
            this._rtt = rttSample;
            if (!this._rttHasSample) {
                this._smoothedRtt = rttSample;
                this._rttHasSample = true;
            } else {
                this._smoothedRtt = this._smoothedRtt * (1 - a) + rttSample * a;
            }
        }
    }
    /**
     * Push an RTT sample into the sliding-window-minimum deque and return the
     * current windowed-min RTT (the jitter-free floor the offset gate references).
     * Standard monotonic-deque algorithm — O(1) amortized, the deque holds only
     * descending "record-low" candidates (typically 1–few entries).
     */ pushRttFloor(rttSample, tNow) {
        const T = this._rttFloorT, V = this._rttFloorV;
        // Drop back entries no lower than this sample — they can never be the min
        // again while this newer, ≤ sample is in the window.
        while(V.length > 0 && V[V.length - 1] >= rttSample){
            V.pop();
            T.pop();
        }
        V.push(rttSample);
        T.push(tNow);
        // Expire entries older than the window from the front.
        const cutoff = tNow - RoomClockImpl.RTT_GATE_WINDOW;
        while(T.length > 0 && T[0] < cutoff){
            T.shift();
            V.shift();
        }
        return V[0]; // front = windowed minimum
    }
    /** Reset all state. Useful on reconnect when the room rebuilds context. */ reset() {
        this._clockOffset = 0;
        this._clockHasSample = false;
        this._offsetCount = 0;
        this._rtt = 0;
        this._smoothedRtt = 0;
        this._rttHasSample = false;
        this._jitter = 0;
        this._lastRecvTime = -1;
        this._lastServerTime = 0;
        this._rttFloorT.length = 0;
        this._rttFloorV.length = 0;
        this._renderSn = 0; // τ is config, not state — it survives reset
        this._renderSnAt = 0;
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/RoomRequest.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toRequestError",
    ()=>toRequestError
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/** Build the Error a rejected `request` throws. `faulted:false` → a deliberate
 *  `ctx.reject(reason)`: `name:"rejected"`, `.reason` = the raw typed reason.
 *  `faulted:true` → a server fault: an Error rebuilt from the sanitized
 *  `{ name, message, code }` payload. */ function toRequestError(payload, faulted) {
    if (!faulted) {
        const error = new Error("request rejected");
        error.name = "rejected";
        error.reason = payload;
        return error;
    }
    const error = new Error(payload?.message ?? "request failed");
    if (payload?.name) {
        error.name = payload.name;
    }
    if (payload?.code !== undefined) {
        error.code = payload.code;
    }
    return error;
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/Storage.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getItem",
    ()=>getItem,
    "removeItem",
    ()=>removeItem,
    "setItem",
    ()=>setItem
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/// <reference path="../typings/cocos-creator.d.ts" />
/**
 * We do not assign 'storage' to window.localStorage immediatelly for React
 * Native compatibility. window.localStorage is not present when this module is
 * loaded.
 */ let storage;
function getStorage() {
    if (!storage) {
        try {
            storage = typeof cc !== 'undefined' && cc.sys && cc.sys.localStorage ? cc.sys.localStorage // compatibility with cocos creator
             : window.localStorage; // RN does have window object at this point, but localStorage is not defined
        } catch (e) {
        // ignore error
        }
    }
    if (!storage && typeof globalThis.indexedDB !== 'undefined') {
        storage = new IndexedDBStorage();
    }
    if (!storage) {
        // mock localStorage if not available (Node.js or RN environment)
        storage = {
            cache: {},
            setItem: function(key, value) {
                this.cache[key] = value;
            },
            getItem: function(key) {
                return this.cache[key];
            },
            removeItem: function(key) {
                delete this.cache[key];
            }
        };
    }
    return storage;
}
function setItem(key, value) {
    getStorage().setItem(key, value);
}
function removeItem(key) {
    getStorage().removeItem(key);
}
function getItem(key, callback) {
    const value = getStorage().getItem(key);
    if (typeof Promise === 'undefined' || // old browsers
    !(value instanceof Promise)) {
        // browser has synchronous return
        callback(value);
    } else {
        // react-native is asynchronous
        value.then((id)=>callback(id));
    }
}
/**
 * When running in a Web Worker, we need to use IndexedDB to store data.
 */ class IndexedDBStorage {
    dbPromise = new Promise((resolve)=>{
        const request = indexedDB.open('_colyseus_storage', 1);
        request.onupgradeneeded = ()=>request.result.createObjectStore('store');
        request.onsuccess = ()=>resolve(request.result);
    });
    async tx(mode, fn) {
        const db = await this.dbPromise;
        const store = db.transaction('store', mode).objectStore('store');
        return fn(store);
    }
    setItem(key, value) {
        return this.tx('readwrite', (store)=>store.put(value, key)).then();
    }
    async getItem(key) {
        const request = await this.tx('readonly', (store)=>store.get(key));
        return new Promise((resolve)=>{
            request.onsuccess = ()=>resolve(request.result);
        });
    }
    removeItem(key) {
        return this.tx('readwrite', (store)=>store.delete(key)).then();
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/core/nanoevents.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createNanoEvents",
    ()=>createNanoEvents
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/**
 * The MIT License (MIT)
 *
 * Copyright 2016 Andrey Sitnik <andrey@sitnik.ru>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */ const createNanoEvents = ()=>({
        emit (event, ...args) {
            let callbacks = this.events[event] || [];
            for(let i = 0, length = callbacks.length; i < length; i++){
                callbacks[i](...args);
            }
        },
        events: {},
        on (event, cb) {
            this.events[event]?.push(cb) || (this.events[event] = [
                cb
            ]);
            return ()=>{
                this.events[event] = this.events[event]?.filter((i)=>cb !== i);
            };
        }
    });
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/core/schema-reflect.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "$VALUES",
    ()=>$VALUES,
    "fieldIndexOf",
    ()=>fieldIndexOf,
    "makeUnrolledSnapshot",
    ()=>makeUnrolledSnapshot,
    "metadataOf",
    ()=>metadataOf,
    "refIdOf",
    ()=>refIdOf,
    "scalarFieldNamesOf",
    ()=>scalarFieldNamesOf,
    "scalarFieldsOf",
    ()=>scalarFieldsOf,
    "wireQuantizerOf",
    ()=>wireQuantizerOf
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
;
// -----------------------------------------------------------------------------
// Schema-native identity. The decoder assigns every instance a stable integer
// `refId` (own, non-enumerable `Symbol.for("$refId")` property) and exposes a
// field-name → field-index map on `constructor[Symbol.metadata]`. These two
// integers — refId and field index — are the SAME identity the wire protocol
// and any C / C# port use, so callers key their runtime state on them rather
// than on JS object identity (WeakMap) or field-name strings. The instance
// object and the field-name string never reach a hot path; they're resolved to
// `(refId, fieldId)` once at the API boundary.
//
// Reflection only — no prediction state lives here. Both `input/` and
// `predict/` read it, which is why it sits under `core/`.
// -----------------------------------------------------------------------------
// `$refId`/`$values` are imported (not re-declared) so they stay identical to the
// decoder's symbols; schema shares them via the process-wide Symbol Registry
// (`Symbol.for`), so the import is one value even across duplicate installs.
// `Symbol.metadata` is the TC39 decorator-metadata symbol, not a schema export.
const $METADATA = Symbol.metadata ?? Symbol.for("Symbol.metadata");
/** Schema's own SoA: a dense array of a decoded instance's field values, indexed
 *  by field index. Reading/writing it bypasses the per-field accessor and the
 *  megamorphic dynamic-key path — reckon's scratch refill + extract use it. */ const $VALUES = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["$values"];
/** Stable integer id the decoder assigned this instance, or undefined if it
 *  hasn't been decoded yet (attach/track called too early — see the Predictor
 *  file header). */ function refIdOf(instance) {
    return instance[__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["$refId"]];
}
function metadataOf(instance) {
    return instance.constructor[$METADATA];
}
/**
 * Field's declaration index from the schema's metadata, or -1 if unknown.
 * `metadata[name]` is the index. Only used on the COLD attach path (to stamp a
 * slot's SLOT_FIELD and seed reckon sim fields) — the hot `value()` read keys
 * its slot map by field NAME, so it never resolves an index per frame.
 */ function fieldIndexOf(instance, field) {
    const idx = metadataOf(instance)?.[field];
    return typeof idx === "number" ? idx : -1;
}
/** PRIMITIVE (scalar) field names in declaration order, read from the schema
 *  metadata. Empty for non-schema objects. Field indices are dense from 0, so
 *  walk until the first gap.
 *
 *  Only number / string / boolean (and the other primitive encodings — int8,
 *  float32, …) are returned: in the metadata a primitive's `type` is a STRING
 *  ("number", "string", …) whereas a collection (Map/Array/Set) or a nested
 *  Schema carries an OBJECT `type`. The reckon snapshot uses this to clone the
 *  SCALAR state a `step` reads — including string/enum discriminators (`kind`)
 *  and booleans (`grounded`), which steps routinely branch on — while skipping
 *  reference-typed fields. Those are structural, not forward-simulated, and
 *  shallow-copying their reference into a scratch that `step` mutates could
 *  corrupt the live tree; for the rare step that needs one, pass an explicit
 *  `snapshot`. (Schema fields live behind getters over `$values`, so a plain
 *  `{...instance}` spread copies nothing — hence the metadata walk.) */ function scalarFieldNamesOf(instance) {
    const meta = metadataOf(instance);
    if (!meta) return [];
    const names = [];
    for(let i = 0;; i++){
        const f = meta[i];
        if (!f || typeof f.name !== "string") break;
        if (typeof f.type === "string") names.push(f.name); // skip collections / child schemas (object type)
    }
    return names;
}
/** Scalar type strings that are NOT numbers on the decoded instance ("string",
 *  "boolean", and the bigint encodings, which decode to BigInt). Everything
 *  else — "number", the sized ints/floats, custom numeric encodings — is
 *  numeric and eligible for pose smoothing. */ const NON_NUMERIC_SCALAR = {
    string: true,
    boolean: true,
    bigint64: true,
    biguint64: true
};
/**
 * One metadata walk returning BOTH scalar sets a world binding needs:
 * `fields` — every primitive field, in declaration order (the adopt set,
 * same rule as {@link scalarFieldNamesOf}); `numeric` — the subset whose
 * decoded value is a number (the pose/smoothing set). Both empty for
 * non-schema objects.
 */ function scalarFieldsOf(instance) {
    const meta = metadataOf(instance);
    const fields = [];
    const numeric = [];
    if (meta) {
        for(let i = 0;; i++){
            const f = meta[i];
            if (!f || typeof f.name !== "string") break;
            if (typeof f.type !== "string") continue; // skip collections / child schemas
            fields.push(f.name);
            if (NON_NUMERIC_SCALAR[f.type] === undefined) numeric.push(f.name);
        }
    }
    return {
        fields,
        numeric
    };
}
// -----------------------------------------------------------------------------
// Wire quantizers — "what value would the wire deliver for this float64?"
// Backs the reconciler's wire-precision-aware reconcile: a prediction is
// indistinguishable from the decoded truth iff `quantizer(predicted) === truth`,
// so lossy wire types (float32, auto `number`) stop injecting rounding noise
// into the rollback restore point (the noise flips knife-edge sim branches).
// -----------------------------------------------------------------------------
const identityQuantizer = (v)=>v;
/**
 * Mirror of the codec's dynamic `number` encoding (`encode.number` in
 * @colyseus/schema): NaN encodes as 0, ±Infinity as ±MAX_SAFE_INTEGER,
 * non-int32 values ride float32 when the ABSOLUTE precision loss is < 1e-4
 * (else float64 — exact), and int32-range integers ride exact int encodings.
 * Must track the codec's rule exactly — including the `(v | 0)` integer test
 * and the abs-of-abs loss check — or the compare misclassifies.
 */ function quantizeAutoNumber(v) {
    if (Number.isNaN(v)) return 0;
    if (!Number.isFinite(v)) return v > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
    if (v !== (v | 0)) {
        if (Math.abs(v) <= 3.4028235e+38) {
            const f = Math.fround(v);
            if (Math.abs(Math.abs(f) - Math.abs(v)) < 1e-4) return f;
        }
    }
    return v;
}
/**
 * The wire quantizer for one declared field: maps a predicted float64 to the
 * EXACT value the wire would deliver for it. `"float32"` → `Math.fround`;
 * `"number"` → the codec's dynamic rule ({@link quantizeAutoNumber}); every
 * type the wire round-trips exactly (ints, float64, boolean) — and any type
 * this doesn't model (e.g. `quantized`) — gets the identity, which degrades to
 * a bit-exact compare: conservative, never worse than always-adopting.
 * Identity for non-schema instances (no metadata — plain test fixtures).
 */ function wireQuantizerOf(instance, field) {
    const meta = metadataOf(instance);
    const idx = meta?.[field];
    const decl = typeof idx === "number" ? meta[idx] : undefined;
    switch(decl?.type){
        case "float32":
            return Math.fround;
        case "number":
            return quantizeAutoNumber;
        default:
            return identityQuantizer;
    }
}
/**
 * Build a snapshot fn that clones `fieldNames` from a live instance into a fresh
 * plain object. Used by reckon's GENERIC advance path — schema versions whose
 * decoded instances expose values as own properties / accessors rather than a
 * dense `$values` SoA (e.g. esbuild's class-field transform in the real browser,
 * where the `$values` fast path is unavailable and this is the path production
 * actually runs).
 *
 * Why not a plain `for` loop? A single `o[names[i]] = src[names[i]]` store site
 * sees every field name across one call, so V8 demotes it to
 * `KeyedStoreIC_Megamorphic` — the profiler put ~33% of reckon time there.
 * Unrolling gives each field its OWN store site; with a fixed field layout each
 * site sees exactly one key and stays MONOMORPHIC (no eval; ~2.4× faster
 * snapshot in isolation, ~+19% on the full reckon read). Names are captured as
 * locals so the `!== undefined` guard is a predictable branch. Field sets wider
 * than the unroll fall back to the megamorphic loop (rare — most schemas have
 * < 16 numeric+scalar fields).
 */ const SNAPSHOT_UNROLL_WIDTH = 16;
function makeUnrolledSnapshot(fieldNames) {
    if (fieldNames.length > SNAPSHOT_UNROLL_WIDTH) {
        const names = fieldNames;
        return (e)=>{
            const o = {};
            for(let i = 0; i < names.length; i++)o[names[i]] = e[names[i]];
            return o;
        };
    }
    const n0 = fieldNames[0], n1 = fieldNames[1], n2 = fieldNames[2], n3 = fieldNames[3], n4 = fieldNames[4], n5 = fieldNames[5], n6 = fieldNames[6], n7 = fieldNames[7], n8 = fieldNames[8], n9 = fieldNames[9], n10 = fieldNames[10], n11 = fieldNames[11], n12 = fieldNames[12], n13 = fieldNames[13], n14 = fieldNames[14], n15 = fieldNames[15];
    return (e)=>{
        const o = {};
        if (n0 !== undefined) o[n0] = e[n0];
        if (n1 !== undefined) o[n1] = e[n1];
        if (n2 !== undefined) o[n2] = e[n2];
        if (n3 !== undefined) o[n3] = e[n3];
        if (n4 !== undefined) o[n4] = e[n4];
        if (n5 !== undefined) o[n5] = e[n5];
        if (n6 !== undefined) o[n6] = e[n6];
        if (n7 !== undefined) o[n7] = e[n7];
        if (n8 !== undefined) o[n8] = e[n8];
        if (n9 !== undefined) o[n9] = e[n9];
        if (n10 !== undefined) o[n10] = e[n10];
        if (n11 !== undefined) o[n11] = e[n11];
        if (n12 !== undefined) o[n12] = e[n12];
        if (n13 !== undefined) o[n13] = e[n13];
        if (n14 !== undefined) o[n14] = e[n14];
        if (n15 !== undefined) o[n15] = e[n15];
        return o;
    };
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/core/signal.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventEmitter",
    ()=>EventEmitter,
    "createSignal",
    ()=>createSignal
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
// once() wrapper → cb; a property on the wrapper would change its map and slow invoke()
const onceTargets = new WeakMap();
class EventEmitter {
    handlers = [];
    register(cb, once = false) {
        this.handlers.push(cb);
        return this;
    }
    invoke(...args) {
        // not forEach: its per-call closure costs 2–8x; handlers added mid-invoke run from the next invoke
        const handlers = this.handlers;
        for(let i = 0, l = handlers.length; i < l; i++){
            handlers[i].apply(this, args);
        }
    }
    invokeAsync(...args) {
        return Promise.all(this.handlers.map((handler)=>handler.apply(this, args)));
    }
    remove(cb) {
        let index = this.handlers.indexOf(cb);
        if (index === -1) {
            index = this.handlers.findIndex((h)=>onceTargets.get(h) === cb);
        }
        if (index !== -1) {
            // copy-on-write: an in-flight invoke() keeps iterating the old array
            this.handlers = this.handlers.filter((_, i)=>i !== index);
        }
    }
    clear() {
        this.handlers = [];
    }
}
function createSignal() {
    const emitter = new EventEmitter();
    function register(cb) {
        return emitter.register(cb, this === null);
    }
    ;
    register.once = (cb)=>{
        const callback = function(...args) {
            emitter.remove(callback); // first, so a throw or re-entrant invoke can't fire it twice
            cb.apply(this, args);
        };
        onceTargets.set(callback, cb);
        emitter.register(callback);
    };
    register.remove = (cb)=>emitter.remove(cb);
    register.invoke = (...args)=>emitter.invoke(...args);
    register.invokeAsync = (...args)=>emitter.invokeAsync(...args);
    register.clear = ()=>emitter.clear();
    return register;
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/core/utils.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "now",
    ()=>now
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
function now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/debug-channel.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "debugOverlayActive",
    ()=>debugOverlayActive,
    "publishDebug",
    ()=>publishDebug
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/**
 * Debug channel — the order-independent handshake between the SDK core and the
 * optional `@colyseus/sdk/debug` overlay.
 *
 * Publishers (a joined room in {@link Client}, a `Predict` instance) call
 * {@link publishDebug} whenever there's something the overlay could surface. If
 * the overlay is already loaded it renders immediately; if it loads LATER — the
 * usual dev-only `import("@colyseus/sdk/debug")` races the first room join — a
 * lightweight buffering stub captures the publishes so the overlay REPLAYS them
 * on install. No app-side ordering (awaiting the import) is required, and a
 * publisher that fires before the overlay loads is never dropped.
 *
 * Production (overlay never imported) stays effectively free: the stub is created
 * only on first publish, holds WeakRefs so nothing is pinned, and is bounded — an
 * app that never loads the overlay leaks neither memory nor room references.
 */ // Old embedded runtimes (some Cocos/Construct targets) lack WeakRef; fall back to
// a strong ref there — still bounded, so the worst case is a few pinned handles in
// a debug-less session, never an unbounded leak.
const makeRef = typeof WeakRef !== "undefined" ? (h)=>new WeakRef(h) : (h)=>({
        deref: ()=>h
    });
// A handful of rooms/Predict handles is plenty of replay depth; the bound keeps a
// debug-less prod session from growing the buffer without limit.
const MAX_BUFFERED = 64;
/**
 * Publish a `handle` to the overlay `channel` (`"room"` | `"predict"` | …).
 * Prod fast path: one property read, then either a live `publish` (overlay
 * loaded) or a bounded WeakRef append (buffered for replay on install).
 */ function publishDebug(channel, handle) {
    const g = globalThis;
    let reg = g.__colyseusDebug;
    if (!reg) {
        const buffer = [];
        reg = g.__colyseusDebug = {
            __buffer: buffer,
            publish (ch, h) {
                buffer.push([
                    ch,
                    makeRef(h)
                ]);
                if (buffer.length > MAX_BUFFERED) {
                    buffer.shift();
                }
            }
        };
    }
    reg.publish(channel, handle);
}
/**
 * True only when the overlay installed its LIVE receiver — NOT when
 * {@link publishDebug} merely created the pre-load buffer. Diagnostics that must
 * stay free in production (reconciler drift bookkeeping) gate on this.
 */ function debugOverlayActive() {
    if (typeof globalThis === "undefined") {
        return false;
    }
    const reg = globalThis.__colyseusDebug;
    return reg != null && reg.__buffer === undefined;
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/errors/Errors.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AbortError",
    ()=>AbortError,
    "MatchMakeError",
    ()=>MatchMakeError,
    "ServerError",
    ()=>ServerError
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
class ServerError extends Error {
    code;
    headers;
    status;
    response;
    data;
    constructor(code, message, opts){
        super(message);
        this.name = "ServerError";
        this.code = code;
        if (opts) {
            this.headers = opts.headers;
            this.status = opts.status;
            this.response = opts.response;
            this.data = opts.data;
        }
    }
}
class AbortError extends Error {
    constructor(message){
        super(message);
        this.name = "AbortError";
    }
}
class MatchMakeError extends Error {
    code;
    constructor(message, code){
        super(message);
        this.code = code;
        this.name = "MatchMakeError";
        Object.setPrototypeOf(this, MatchMakeError.prototype);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/fetchXHR.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "xhrFetch",
    ()=>xhrFetch
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/**
 * Minimal fetch-compatible wrapper around XMLHttpRequest.
 * Used as an automatic fallback when globalThis.fetch is unavailable
 * (e.g. Cocos Creator Native).
 */ function xhrFetch(url, init) {
    return new Promise((resolve, reject)=>{
        const xhr = new XMLHttpRequest();
        const method = init?.method || "GET";
        xhr.open(method, url.toString());
        xhr.withCredentials = init?.credentials === "include";
        // Apply request headers
        if (init?.headers) {
            const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
            headers.forEach((value, key)=>{
                xhr.setRequestHeader(key, value);
            });
        }
        xhr.onload = ()=>{
            // Parse response headers
            const headers = new Headers();
            const rawHeaders = xhr.getAllResponseHeaders().trim();
            if (rawHeaders) {
                for (const line of rawHeaders.split(/[\r\n]+/)){
                    const idx = line.indexOf(": ");
                    if (idx > 0) {
                        headers.append(line.substring(0, idx), line.substring(idx + 2));
                    }
                }
            }
            const responseBody = xhr.response ?? xhr.responseText;
            resolve(new XHRResponse(responseBody, {
                status: xhr.status,
                statusText: xhr.statusText,
                headers
            }));
        };
        xhr.onerror = ()=>reject(new TypeError("Network request failed"));
        xhr.ontimeout = ()=>reject(new TypeError("Network request timed out"));
        xhr.send(init?.body ?? null);
    });
}
/**
 * Minimal Response-compatible class backed by XHR response data.
 * Implements only the surface used by HTTP.executeRequest().
 */ class XHRResponse {
    status;
    statusText;
    headers;
    ok;
    body;
    constructor(body, init){
        this.body = body;
        this.status = init.status;
        this.statusText = init.statusText;
        this.headers = init.headers;
        this.ok = init.status >= 200 && init.status < 300;
    }
    async json() {
        return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    async text() {
        return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    async blob() {
        return new Blob([
            this.body
        ]);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/index.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$legacy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/legacy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Client$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Client.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Room$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Room.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Auth$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Auth.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$SchemaSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/serializer/SchemaSerializer.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$NoneSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/serializer/NoneSerializer.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/serializer/Serializer.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$Predictor$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/Predictor.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$reconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/reconciler.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$simReconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/simReconciler.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedSpawns$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedSpawns.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["registerSerializer"])('schema', __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$SchemaSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SchemaSerializer"]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$Serializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["registerSerializer"])('none', __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$serializer$2f$NoneSerializer$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NoneSerializer"]);
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/input/InputHandle.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InputHandleImpl",
    ()=>InputHandleImpl
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/utils.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/debug-channel.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/schema-reflect.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
/** Widest a single self-describing number can encode to. */ const MAX_VARINT = 9;
/** Reliable stamp prefix: one delta-coded timeline value (+2 for BOTH's u16). */ const RELIABLE_STAMP_MAX = MAX_VARINT;
/** Unreliable stamp block: `[k][u32 anchor][Δ]×(k−1)`, twice over for BOTH. */ const ringStampMax = (historySize, both)=>(both ? 2 : 1) * (MAX_VARINT + 4 + MAX_VARINT * historySize);
/** @internal */ class InputHandleImpl {
    data;
    _host;
    _encoder;
    // Reused frame buffer — safe ONLY because every transport copies synchronously
    // on send (browser ws.send snapshots; H3 frame() copies before write). A
    // transport that queued the view uncopied would see it overwritten next send.
    _scratch = new Uint8Array(2048);
    // Cached framed-packet view into `_scratch`; re-made when the packet size
    // changes (delta bodies vary) or `_scratch` grows — so it mostly pays off on
    // steady no-change frames.
    _framed = null;
    // Input round-trip state (one handle per room).
    _sentCount = 0;
    _lastProcessed = 0;
    _epoch = 0;
    // RTT send-time ring (seq % size → send time); avoids per-send Map churn.
    // Sized WITH the replay ring (one seq window — replay and RTT age out together).
    _sendTimes;
    // Sent-input replay ring, mirroring the server's per-client input buffer: each reliable send snapshots
    // `data` into slot `seq % size` via alloc-free `copyInto` so a reconciler can replay unacked inputs.
    // Size = worst-case in-flight = (RTT + patch interval) × input rate. tickRate/patchRate from the
    // handshake (ack rides the patch, so lags up to one interval); RTT is budgeted generously. Floored
    // at 64; grows for high input rates where 64 would silently overflow (aged-out entries warn once).
    static BUFFER_FLOOR = 64;
    static BUFFER_RTT_BUDGET_MS = 1000;
    static BUFFER_HEADROOM = 1.5;
    _inputBufferSize;
    _inputBuffer = null;
    // Per-seq reckonTime stamp (server-clock ms), parallel to _inputBuffer — the
    // reconciler reads it back as ctx.reckonTime on the live step AND on replay, so
    // both hit-test at the exact instant the server rewinds to. Sized = replay ring.
    // Lazily allocated AND only when reckon stamping is on (`_stampReckon`): a room
    // without reckon lag-comp never rewinds to it, so we don't track it (reckonTimeAt
    // then reads 0 and the controller resolves ctx.reckonTime to serverNow()).
    _reckonTimes = null;
    // Reckon instant of the in-flight send() — computed in send() when stamping,
    // stamped on the wire AND recorded into _reckonTimes by _recordSent (same value
    // both). 0 when not stamping.
    _pendingReckon = 0;
    // Running baseline for the DELTA-CODED reliable stamp: the last timeline u32
    // sent. Each stamped send transmits `stamp − _lastStamp` (signed, ≈ one fixed
    // step per tick → ~1 byte vs a raw 4-byte u32); the server mirrors this baseline
    // and reliable+in-order keeps the two locked. reset() re-zeros it so the first
    // delta after a (re)connect carries the absolute, re-syncing with the server's
    // freshly-allocated baseline.
    _lastStamp = 0;
    // Per-seq timeline stamps for the UNRELIABLE ring, indexed `seq % historySize`
    // — exactly the slots a packet carries, so the index can't collide. Lazily
    // allocated, and only when the room asked for stamps. See _writeRingStamps.
    _stampRing = null;
    // Parallel to _stampRing, BOTH mode only: the renderDelta each slot was
    // sampled with, so the block can carry the exact value per slot.
    _renderDeltaRing = null;
    // Slots the encoder's ring currently carries (≤ historySize). Tracked, not
    // derived from `seq`: `reset()` drops the ring but keeps the seq monotonic.
    _ringSlots = 0;
    static _warnedBufferOverflow = false;
    static _warnedAllowRewindIgnored = false;
    // Dev diagnostic (see _warnUnknownFields): unknown data keys already warned.
    _warnedUnknownKeys = null;
    // Lag-comp stamp (server INPUT_OPTIONS handshake): which timeline(s) each
    // reliable input is prefixed with, DELTA-CODED on the wire (see _lastStamp).
    // Both → [varint Δreckon][u16 renderDelta]; reckon-only → [varint Δreckon];
    // render-only → [varint Δrender]; neither → no prefix.
    _stampRender = false;
    _stampReckon = false;
    // Optional per-send gate (app `allowRewind`): when set, only inputs it returns
    // true for carry the stamp — the rest skip it (and the TIMED bit), trimming the
    // timestamp on frames the server won't rewind (e.g. non-firing inputs). The
    // delta baseline (`_lastStamp`) only advances on stamped sends, so it stays
    // locked with the server across the gaps. Absent ⇒ stamp every reliable input.
    _allowRewind;
    // Send observers (the prediction layer subscribes here to step its simulation
    // on each send — see onSend). null until the first subscribe, so a handle used
    // without prediction pays nothing (no allocation, no per-send dispatch).
    // COPY-ON-WRITE: subscribe/unsubscribe replace the array (cold path), so the
    // dispatch loop's captured ref can't skip or double-fire when a listener
    // mutates the list mid-dispatch.
    _sendListeners = null;
    // The app's interpolation buffer (ms) — how far in the past it renders remote
    // entities (e.g. a `Predict` lerp `delay`). The stamp subtracts this AND the
    // one-way latency (smoothedRtt/2) the SDK already tracks, so callers pass only
    // the interp buffer, never the latency. When the app doesn't set it explicitly,
    // `predict.reconciler`/`sim` bind `_renderDelayProvider` to the Predict lerp
    // `delay` (see bindRenderDelay) so the interp buffer and the server's rewind
    // instant stay ONE value — no two-number "keep these equal" footgun.
    _renderDelay = 0;
    _renderDelayExplicit = false;
    _renderDelayProvider;
    // Server-advertised rates: fixed step (Hz), patch interval (ms = reconcile
    // cadence), and physics sub-steps per input tick.
    _tickRate;
    _patchRate;
    _subSteps = 1;
    constructor(host, data, encoder, opts){
        this._host = host;
        this.data = data;
        this._encoder = encoder;
        this._stampRender = opts?.stampRender ?? false;
        this._stampReckon = opts?.stampReckon ?? false;
        this._allowRewind = opts?.allowRewind;
        // Inert on this channel, and silently so — the predicate is never even
        // called (see `send`). Say it once rather than let someone watch bandwidth
        // not move and go looking.
        if (this._allowRewind !== undefined && encoder.mode === "unreliable" && !InputHandleImpl._warnedAllowRewindIgnored) {
            InputHandleImpl._warnedAllowRewindIgnored = true;
            console.warn(`@colyseus/sdk: \`allowRewind\` is ignored on \`mode:"unreliable"\` — a packet ` + `stamps its whole redundancy ring or none of it, so excluding one input would ` + `cost bandwidth rather than save it. Use \`mode:"reliable"\` to gate the ` + `lag-comp stamp per input.`);
        }
        this._renderDelay = opts?.renderDelay ?? 0;
        this._renderDelayExplicit = opts?.renderDelay !== undefined;
        this._tickRate = opts?.tickRate;
        this._patchRate = opts?.patchRate;
        this._subSteps = opts?.subSteps ?? 1;
        // Size the replay ring to the advertised rates (see field comment).
        const stepMs = this._tickRate ? 1000 / this._tickRate : 1000 / 60;
        const window = InputHandleImpl.BUFFER_RTT_BUDGET_MS + (this._patchRate ?? 0);
        this._inputBufferSize = Math.max(InputHandleImpl.BUFFER_FLOOR, Math.ceil(window / stepMs * InputHandleImpl.BUFFER_HEADROOM));
        this._sendTimes = new Float64Array(this._inputBufferSize);
    }
    get mode() {
        return this._encoder.mode;
    }
    get tickRate() {
        return this._tickRate;
    }
    // `1/hz` is correctly-rounded IEEE-754 → bit-identical to the server's stepSeconds.
    get stepSeconds() {
        return this._tickRate ? 1 / this._tickRate : undefined;
    }
    get stepMs() {
        return this._tickRate ? 1000 / this._tickRate : undefined;
    }
    get patchRate() {
        return this._patchRate;
    }
    get subSteps() {
        return this._subSteps;
    }
    // `(1/hz)/n` — the SAME expression the server's ctx.subDt uses → bit-identical dt.
    get subStepSeconds() {
        return this._tickRate ? 1 / this._tickRate / this._subSteps : undefined;
    }
    get subStepMs() {
        return this._tickRate ? 1000 / this._tickRate / this._subSteps : undefined;
    }
    get lastProcessed() {
        return this._lastProcessed;
    }
    get sentCount() {
        return this._sentCount;
    }
    get pendingCount() {
        return this._sentCount - this._lastProcessed;
    }
    get replayBufferSize() {
        return this._inputBufferSize;
    }
    get epoch() {
        return this._epoch;
    }
    at(seq) {
        if (this._inputBuffer === null) return undefined;
        // Buffered iff sent, not yet acked, and still within the bounded ring window.
        if (seq <= this._lastProcessed || seq > this._sentCount) return undefined;
        if (this._sentCount - seq >= this._inputBufferSize) {
            // Pending input aged out (RTT exceeded the buffer budget); reconcile may drift, so warn once.
            if (!InputHandleImpl._warnedBufferOverflow) {
                InputHandleImpl._warnedBufferOverflow = true;
                console.warn(`@colyseus/sdk: input replay buffer (${this._inputBufferSize}) overflowed — ` + `RTT exceeds its budget at this input rate; reconciliation may drift.`);
            }
            return undefined;
        }
        return this._inputBuffer[seq % this._inputBufferSize];
    }
    reckonTimeAt(seq) {
        // 0 when reckon stamping is off (no ring) — the controller resolves to serverNow().
        if (this._reckonTimes === null) return 0;
        // Same validity window as at(): sent, unacked, still in the ring. Live reads
        // it for the just-sent seq (== sentCount); replay reads each unacked seq.
        if (seq <= this._lastProcessed || seq > this._sentCount) return 0;
        if (this._sentCount - seq >= this._inputBufferSize) return 0;
        return this._reckonTimes[seq % this._inputBufferSize];
    }
    reset() {
        this._encoder.reset();
        // Adopt the encoder's monotonic seq as the baseline: 0 for reliable, the current
        // framework seq for unreliable (the encoder keeps `_seq` across its reset). pending
        // starts at 0 so a reconnect doesn't replay already-acked inputs, and unreliable
        // seqs continue past the server's last-seen seq if the buffer was reused.
        this._sentCount = this._lastProcessed = this._encoder.seq;
        this._framed = null;
        this._lastStamp = 0; // next stamped send ships an absolute delta — re-syncs the server's re-zeroed baseline
        // The encoder dropped its ring but keeps `_seq`, so the slot count has to be
        // tracked rather than derived from the seq — else the next packet would
        // claim slots the ring no longer carries.
        this._ringSlots = 0;
        this._sendTimes.fill(0); // stale acks for pre-reset seqs must read as "unknown" (-1), not a bogus RTT
        // _inputBuffer is reused as-is: at() gates on _sentCount/_lastProcessed, so it can't surface stale snapshots.
        this._epoch++; // observing controllers poll this and follow the reset
    }
    /**
     * @internal Bind lag-comp's `renderDelay` to a live provider — the owning
     * Predict's lerp `delay`. Called by `predict.reconciler`/`predict.sim` when
     * they wire this handle, so the remote interp buffer and the server's rewind
     * instant are derived from ONE number and can't drift apart. No-op if the app
     * passed an explicit `renderDelay` to `room.input()` — an explicit value wins.
     */ bindRenderDelay(provider) {
        if (this._renderDelayExplicit) return;
        this._renderDelayProvider = provider;
    }
    /** Effective interp buffer (ms): a bound provider (the Predict lerp `delay`)
     *  when present, else the static value from `room.input()`. */ _resolveRenderDelay() {
        return this._renderDelayProvider ? this._renderDelayProvider() : this._renderDelay;
    }
    /** Dev diagnostic (debug overlay only). An assignment to an UNDECLARED field
     *  lands as a plain own property — declared fields live behind prototype
     *  setters in the dense `$values` array and never create own keys — so any
     *  own enumerable string key missing from the schema metadata is a write
     *  that will never be encoded. Warn once per key. */ _warnUnknownFields() {
        const meta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["metadataOf"])(this.data);
        if (!meta) return;
        for (const key of Object.keys(this.data)){
            if (meta[key] !== undefined || this._warnedUnknownKeys?.has(key)) continue;
            (this._warnedUnknownKeys ??= new Set()).add(key);
            console.warn(`@colyseus/sdk input: "${key}" is not a declared field on ` + `${this.data.constructor.name} — the write is never encoded or sent. ` + `Declare it with @type(...) on the input schema, or remove the write.`);
        }
    }
    send() {
        const conn = this._host.connection;
        if (!conn?.isOpen) return 0; // nothing transmitted → seq 0 (seqs are 1-based)
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["debugOverlayActive"])()) this._warnUnknownFields();
        // May be 0-length on a no-change delta tick → we still frame + send a
        // body-less input (server decodes it as a no-op, holding the last values).
        // Callers skip a tick by not calling send(), not by relying on suppression.
        const bytes = this._encoder.encode();
        const reliable = this._encoder.mode === "reliable";
        // Lag-comp stamp prefix. The two channels carry different shapes — one
        // delta-coded stamp vs a self-contained per-slot block; see
        // ProtocolModifier.TIMED and _writeRingStamps.
        const stampsEnabled = this._stampReckon || this._stampRender;
        // Evaluate `allowRewind` at most once: it's app code over live input data.
        // `allowRewind` gates the RELIABLE channel only — the unreliable ring is
        // all-or-nothing (see _writeRingStamps), so evaluating the app predicate
        // there would be misleading as well as wasted.
        const wantStamp = stampsEnabled && reliable && (this._allowRewind === undefined || this._allowRewind(this.data));
        const wantRingStamp = stampsEnabled && !reliable;
        const both = this._stampReckon && this._stampRender;
        const stampMax = wantStamp ? RELIABLE_STAMP_MAX + (both ? 2 : 0) : wantRingStamp ? ringStampMax(this._encoder.historySize, both) : 0;
        const totalMax = 1 + stampMax + bytes.length;
        if (totalMax > this._scratch.byteLength) {
            this._scratch = new Uint8Array(Math.max(totalMax, this._scratch.byteLength * 2));
            this._framed = null; // cached view points into the old buffer
        }
        this._scratch[0] = (reliable ? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_INPUT_RELIABLE : __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Protocol"].ROOM_INPUT_UNRELIABLE) | (wantStamp || wantRingStamp ? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProtocolModifier"].TIMED : 0);
        const it = {
            offset: 1
        };
        if (wantRingStamp) {
            this._writeRingStamps(it);
        } else if (wantStamp) {
            // Delta-coded against the running baseline; BOTH trails the absolute u16.
            const { stamp, renderDelta } = this._sampleStamp();
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this._scratch, stamp - this._lastStamp, it);
            this._lastStamp = stamp;
            if (both) {
                __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].uint16(this._scratch, renderDelta, it);
            }
        } else {
            this._pendingReckon = 0; // not stamping → no reckon instant to record
        }
        // [stamp?][body] — body continues from the stamp's end offset.
        this._scratch.set(bytes, it.offset);
        const total = it.offset + bytes.length;
        if (this._framed === null || this._framed.byteLength !== total) {
            this._framed = this._scratch.subarray(0, total); // reused view (size varies only with the stamp prefix)
        }
        const framed = this._framed;
        let seq;
        if (reliable) {
            conn.send(framed);
            // Reliable: implicit count seq — the server counts received messages, so
            // `_sentCount` mirrors its consumed counter for the next TIMED ack.
            seq = ++this._sentCount;
        } else {
            conn.sendUnreliable(framed);
            // Unreliable: adopt the encoder's framework seq (stamped on the wire) so the
            // server's seq-value ack and this replay ring line up across packet loss.
            seq = this._sentCount = this._encoder.seq;
        }
        this._recordSent(seq);
        // Local, not _sentCount: a re-entrant send() from an onSend listener would
        // have advanced the field before this returns.
        return seq;
    }
    /**
     * @internal Write the unreliable channel's self-contained stamp block, then
     * leave `it` at the start of the ring body.
     *
     *     [varint k][uint32 newest][varint Δ]×(k−1)
     *     [uint16 rdNewest][varint Δrd]×(k−1)        ← BOTH mode only
     *
     * `k` is the slot count of the ring this packet carries (oldest→newest, the
     * order `InputDecoder.decodeAll` yields). `newest` is THIS send's timeline
     * instant, absolute — so a packet is readable on its own and no amount of
     * loss or reordering can desync a baseline. Each Δ walks one slot older
     * (`stamp[i] = stamp[i+1] − Δ`), which is ≈ one fixed step and so ~1 byte
     * through the self-describing number codec.
     *
     * BOTH mode appends the `renderDelta` series in the same shape, so every slot
     * carries the interp buffer + one-way latency it was actually sampled with,
     * rather than the newest slot's value smeared across the ring. Consecutive
     * values differ by ~0–1 ms (`renderDelay` is app-set and constant,
     * `smoothedRtt` is smoothed), which lands in the codec's 1-byte fixnum range —
     * so exactness costs one byte per redundant slot, and a violent RTT swing
     * degrades to at most 3 (the u16 range), never more.
     *
     * All-or-nothing: every slot in the block is stamped, or the room asked for
     * no stamps and there is no block. `allowRewind` does not apply here — the
     * block ships whole, so excluding one slot would save nothing while making
     * its neighbour's delta swing the full absolute value. The one transient
     * exception is the pre-clock-sync window, where the slots genuinely have no
     * known instant and ship as 0 for the server to read live.
     */ _writeRingStamps(it) {
        const { stamp, renderDelta } = this._sampleStamp();
        const historySize = this._encoder.historySize;
        const seq = this._encoder.seq; // this send's seq — already advanced by encode()
        // The packet carries the last `historySize` sends, or fewer while the ring
        // is still filling (from construction or a reset()).
        const k = this._ringSlots = Math.min(this._ringSlots + 1, historySize);
        const ring = this._stampRing ??= new Float64Array(historySize);
        ring[seq % historySize] = stamp;
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this._scratch, k, it);
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].uint32(this._scratch, stamp, it);
        this._writeSeriesDeltas(ring, seq, k, it);
        if (this._stampReckon && this._stampRender) {
            // Uint16Array: renderDelta is already clamped to the u16 range, so the
            // ring stores it exactly at half the width of the timeline ring.
            const rdRing = this._renderDeltaRing ??= new Uint16Array(historySize);
            rdRing[seq % historySize] = renderDelta;
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].uint16(this._scratch, renderDelta, it);
            this._writeSeriesDeltas(rdRing, seq, k, it);
        }
    }
    /** Walk `k` ring slots newest→oldest, emitting each step as a signed delta. */ _writeSeriesDeltas(ring, seq, k, it) {
        const size = ring.length;
        for(let i = 1; i < k; i++){
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this._scratch, ring[(seq - i + 1) % size] - ring[(seq - i) % size], it);
        }
    }
    /**
     * @internal Sample this send's lag-comp instants from the clock, and record
     * the reckon one for {@link reckonTimeAt}.
     *
     * `renderDelta` is the interp buffer (`renderDelay`, app-set) plus the one-way
     * downstream latency (≈ `smoothedRtt/2`, ours). `stamp` is the timeline this
     * room actually rewinds on: reckon rooms ship the estimate directly — the
     * server reads its history at that index, so clock/RTT estimation error
     * cancels (client displayed f(est), server reads f(est)) — while snapshot
     * rooms ship `reckonTime − renderDelta`, the instant lerped remotes were on
     * screen. BOTH ships reckon plus the gap and lets the server subtract.
     *
     * Everything is 0 before the clock syncs, or when `allowRewind` excluded this
     * input: the server then falls back to live positions rather than trusting a
     * bogus instant.
     */ _sampleStamp() {
        const clock = this._host.clock;
        const synced = (clock?.lastServerTime?.() ?? 0) > 0;
        const rk = synced ? Math.max(0, Math.round(clock.serverNow())) >>> 0 : 0;
        const renderDelta = synced ? Math.min(0xffff, Math.max(0, Math.round(this._resolveRenderDelay() + (clock.smoothedRtt?.() ?? 0) / 2))) : 0;
        this._pendingReckon = rk;
        // rk is 0 while unsynced, so this floors to 0 on its own.
        return {
            stamp: this._stampReckon ? rk : rk > renderDelta ? rk - renderDelta : 0,
            renderDelta
        };
    }
    /**
     * @internal Snapshot the just-sent input into the replay ring and stamp its
     * send time, keyed by `seq`. Lets a reconciler replay unacked inputs via
     * {@link at} and the TIMED ack sample RTT. The snapshot is alloc-free through
     * the codec's `copyInto` (no `Object.keys`), which stages every field, so
     * each slot is a full snapshot independent of the wire delta encoding.
     */ _recordSent(seq) {
        if (this._inputBuffer === null) {
            const Ctor = this.data.constructor;
            this._inputBuffer = Array.from({
                length: this._inputBufferSize
            }, ()=>new Ctor());
        }
        this._encoder.copyInto(this._inputBuffer[seq % this._inputBufferSize]);
        this._sendTimes[seq % this._inputBufferSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
        // Reckon ring only when reckon stamping is on (see _reckonTimes) — a room
        // without reckon lag-comp never rewinds to it, so the allocation is skipped.
        if (this._stampReckon) {
            (this._reckonTimes ??= new Float64Array(this._inputBufferSize))[seq % this._inputBufferSize] = this._pendingReckon;
        }
        // Notify send observers LAST — the replay ring + reckon instant are now
        // recorded, so a listener can read `at(seq)` / `reckonTimeAt(seq)`.
        const ls = this._sendListeners;
        if (ls !== null) for(let i = 0; i < ls.length; i++)ls[i](seq);
    }
    onSend(listener) {
        const ls = this._sendListeners;
        this._sendListeners = ls !== null ? [
            ...ls,
            listener
        ] : [
            listener
        ];
        return ()=>{
            const cur = this._sendListeners;
            if (cur === null) return;
            const i = cur.indexOf(listener);
            if (i < 0) return;
            const next = cur.slice();
            next.splice(i, 1);
            this._sendListeners = next.length > 0 ? next : null;
        };
    }
    /**
     * @internal Feed the server's last-PROCESSED input seq (decoded from the
     * TIMED prefix). Advances {@link lastProcessed} (monotonic) and returns the
     * round-trip time sample for that ack (`now − sendTime(seq)`), or `-1` if the
     * send time is unknown. The {@link RoomClockImpl} filters/EMA-smooths the sample.
     */ ackInput(seq) {
        if (seq <= this._lastProcessed) return -1;
        // Aged out of the seq ring window → RTT unknown.
        const aged = this._sentCount - seq >= this._inputBufferSize;
        this._lastProcessed = seq;
        if (aged) return -1;
        const sentAt = this._sendTimes[seq % this._inputBufferSize];
        return sentAt > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])() - sentAt : -1;
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/input/RoomInput.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RoomInput",
    ()=>RoomInput
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$input$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/input/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$InputHandle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/input/InputHandle.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/RoomClock.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
/**
 * Owns all per-room input state, kept off the {@link Room} class itself: the
 * schema constructor recovered from the JOIN handshake, the server-advertised
 * stamp/rate flags, and the lazily-created {@link InputHandle}.
 *
 * Created lazily by {@link Room} only when the room declares input (an
 * `INPUT_*` handshake section arrives) or the app calls `room.input(...)`.
 * Rooms that never use input (chat / lobby / turn-based) never allocate one.
 * @internal
 */ class RoomInput {
    #room;
    // Impl type (not the public interface) so the TIMED decode can feed it the
    // server ack via the internal `ackInput()`.
    #handle;
    // First-call context, kept only to diagnose later room.input(options) calls
    // whose options are ignored (the handle is created once — first call wins).
    #options;
    #encoder;
    #warnedIgnoredOptions = false;
    /**
     * Schema constructor recovered via Reflection from the server's handshake
     * (the `INPUT_REFLECTION` tagged section). Falls back to `undefined` when
     * the server room didn't call `defineInput()`.
     *
     * Typed as `new () => any` (not `Schema`) on purpose — pinning to this
     * SDK's Schema type would clash with user instances coming from a
     * different copy of `@colyseus/schema` under multi-version installs.
     */ #ctorFromReflection;
    /** `true` when the handshake advertised the SNAPSHOT-timeline stamp
     *  (`INPUT_OPTIONS`, `InputFlags.RENDER_TIME`). */ #stampRender = false;
    /** `true` when the handshake advertised the RECKON-timeline stamp
     *  (`INPUT_OPTIONS`, `InputFlags.RECKON_TIME`). Set together with
     *  {@link #stampRender} ⇒ the 6-byte `[reckonTime][renderDelta]` prefix. */ #stampReckon = false;
    /** Server-advertised fixed simulation/input step rate (Hz) from
     *  `defineInput({ tickRate })`. */ #tickRate;
    /** Server-advertised state-patch interval (ms) = the reconcile cadence. */ #patchRate;
    /** Server-advertised physics sub-steps per input tick
     *  (`setFixedTimestep(..., { subSteps })`). */ #subSteps;
    constructor(room){
        this.#room = room;
    }
    /** Snapshot cadence (ms), so {@link Room} can feed `clock.setPatchInterval`. */ get patchRate() {
        return this.#patchRate;
    }
    /**
     * Decode the `INPUT_REFLECTION` handshake section: install schema-builder
     * field descriptors on the reconstructed class so {@link InputEncoder} can
     * read its `$values` and emit non-empty packets, then cache the ctor.
     *
     * INPUT_REFLECTION is also the signal that the server called `defineInput()`
     * and will emit TIMED-prefixed state messages — so swap the default stub
     * clock for a real {@link RoomClockImpl} unless the user already replaced
     * `room.clock` with their own. Advances `it`.
     */ applyReflection(buffer, it, sectionEnd) {
        const inputDecoder = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Reflection"].decode(buffer.subarray(0, sectionEnd), it);
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Reflection"].makeEncodable(inputDecoder.state.constructor);
        this.#ctorFromReflection = inputDecoder.state.constructor;
        if (this.#room.clock === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NULL_CLOCK"]) this.#room.clock = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RoomClockImpl"]();
    }
    /**
     * Decode the `INPUT_OPTIONS` handshake section.
     * `[flags uint8][tickRate varint?][patchRate varint?][subSteps varint?]`,
     * varints in bit order. Advances `it`.
     */ applyOptions(buffer, it) {
        const flags = buffer[it.offset++];
        this.#stampRender = (flags & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputFlags"].RENDER_TIME) !== 0;
        this.#stampReckon = (flags & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputFlags"].RECKON_TIME) !== 0;
        if (flags & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputFlags"].FIXED_TIMESTEP) this.#tickRate = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
        if (flags & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputFlags"].PATCH_RATE) this.#patchRate = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
        if (flags & __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputFlags"].SUB_STEPS) this.#subSteps = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(buffer, it);
    }
    /** Feed the server's last-processed input seq to the handle; returns the RTT
     *  sample (or `-1` before the handle exists / when the seq aged out). */ ackInput(inputSeq) {
        return this.#handle ? this.#handle.ackInput(inputSeq) : -1;
    }
    /** Reset the input round-trip on reconnect (see {@link Room} reconnection). */ reset() {
        this.#handle?.reset();
    }
    /**
     * Lazily create and cache the per-room {@link InputHandle}; subsequent calls
     * return the same handle (options on later calls are ignored — a warning
     * fires once if they differ from the constructed handle's). Backs
     * `room.input(...)` — see that method for the full discovery/usage docs.
     */ handle(options) {
        if (this.#handle) {
            if (options !== undefined) this.#warnIfIgnored(options);
            return this.#handle;
        }
        const Ctor = options?.type ?? this.#ctorFromReflection;
        if (!Ctor) {
            throw new Error("room.input(): no input schema available. The server room must call " + "`defineInput(YourInput)`, or you can pass `{ type: YourInput }` explicitly.");
        }
        const instance = new Ctor();
        // The InputEncoder always delta-encodes (no full-snapshot mode), so
        // there's nothing to configure here beyond mode/historySize.
        const encoder = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$input$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputEncoder"](instance, options);
        // The handle owns the input round-trip (send counter, RTT send-times, server-acked count);
        // the TIMED decode feeds it the ack and it produces RTT samples for the clock (see Room.onMessage).
        // `stampRender`/`stampReckon` are server-driven (INPUT_OPTIONS flags); `renderDelay` lets the app subtract its interp buffer.
        this.#handle = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$InputHandle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputHandleImpl"](this.#room, instance, encoder, {
            stampRender: this.#stampRender,
            stampReckon: this.#stampReckon,
            renderDelay: options?.renderDelay,
            allowRewind: options?.allowRewind,
            tickRate: this.#tickRate,
            patchRate: this.#patchRate,
            subSteps: this.#subSteps
        });
        this.#options = options;
        this.#encoder = encoder;
        return this.#handle;
    }
    /** Warn (once) when a later `room.input(options)` call would have produced a
     *  different handle — those options are silently ignored (first call wins),
     *  which is invisible without this. Value fields compare against the RESOLVED
     *  config (ctor/mode/historySize), not the first call's raw options, so a
     *  textually identical second call stays silent. */ #warnIfIgnored(later) {
        if (this.#warnedIgnoredOptions) return;
        const handle = this.#handle;
        const diffs = [];
        if (later.type !== undefined && later.type !== handle.data?.constructor) diffs.push("type");
        if (later.mode !== undefined && later.mode !== handle.mode) diffs.push("mode");
        // historySize is inert in reliable mode (for BOTH calls) — only compare when unreliable.
        if (later.historySize !== undefined && handle.mode === "unreliable" && later.historySize !== this.#encoder.historySize) diffs.push("historySize");
        if (later.renderDelay !== undefined && later.renderDelay !== this.#options?.renderDelay) diffs.push("renderDelay");
        // Function identity is meaningless across call sites — compare presence only.
        if (later.allowRewind !== undefined !== (this.#options?.allowRewind !== undefined)) diffs.push("allowRewind");
        if (diffs.length === 0) return;
        this.#warnedIgnoredOptions = true;
        console.warn("@colyseus/sdk: room.input() options ignored — the input handle was already " + `created by an earlier call (first call wins). Differing: ${diffs.join(", ")}.`);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/legacy.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
//
// Polyfills for legacy environments
//
/*
 * Support Android 4.4.x
 */ if (!ArrayBuffer.isView) {
    ArrayBuffer.isView = (a)=>{
        return a !== null && typeof a === 'object' && a.buffer instanceof ArrayBuffer;
    };
}
// Define globalThis if not available.
// https://github.com/colyseus/colyseus.js/issues/86
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
// Cocos Creator does not provide "FormData"
// Define a dummy implementation so it doesn't crash
if (typeof FormData === "undefined") {
    // @ts-ignore
    globalThis['FormData'] = class {
    };
}
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/Predictor.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Predict",
    ()=>Predict
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEventChannel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedEventChannel.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedSpawns$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedSpawns.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$reconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/reconciler.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$simReconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/simReconciler.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$InputHandle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/input/InputHandle.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/drift.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/RoomClock.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/debug-channel.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/schema-reflect.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$confirmOn$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/confirmOn.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
/**
 * Predict — drop-in prediction layer for Colyseus 0.18+ clients.
 *
 * Combines two prediction strategies behind a single ergonomic class:
 *   - Field smoothing (lerp / extrapolate / damped)
 *   - Dead-reckoning (forward-simulate via a shared step function)
 *
 * THE PREDICTION FAMILY — pick by what you're predicting:
 *   - `Predict` (this class) — PASSIVE smoothing of the server stream for
 *     entities you DON'T control (remote players → lerp, AI → reckon). Read
 *     with `predict.value(instance, field)`.
 *   - `predict.reconciler(self, …)` → a {@link Reconciler} — ACTIVE server-
 *     reconciled rollback for the entity you DO control: apply input now,
 *     rewind to server truth + replay, smoothly correcting. Read state for
 *     logic via `controller.state` (exact, mutable).
 *   - `predict.sim(…)` → a {@link SimReconciler} — the same rollback over a
 *     COMPOSITE or engine-backed world. Decoded schema instances placed in
 *     its `world` are AUTO-BOUND (seeding/adopt/pose derive from the schema).
 *   - `predict.defineEvent(…)` → a {@link PredictedEventChannel} — a typed
 *     optimistic DISCRETE event (a goal, a kill, a pickup): predicted from the
 *     sim via `ctx.predict(channel, payload)` (replay-safe) or from UI, with
 *     confirm / auto-reject / TTL settlement against server truth.
 *
 * ONE READ IDIOM for rendering: `predict.value(instance, field)` covers every
 * entity — passively-smoothed remotes AND the instances a reconciler/sim
 * binds (the controllers register their bound fields here, overlaying any
 * passive slot while they live and restoring it on dispose). Consumers get
 * the full lifecycle for free: raw state before the controller spawns →
 * reconciled pose while it's alive → raw again after `dispose()`. Game logic
 * (hit-reg, zone checks) keeps reading EXACT state via `controller.state` /
 * `controller.world` — never the smoothed render read.
 * One `predict.tick(now)` per frame drives all three — controllers and event
 * channels spawned here are ticked/pruned automatically (see {@link tick}).
 *
 * Mirrors `Callbacks.get(room)` from `@colyseus/schema` — construct via the
 * static factory and attach prediction to schemas as they appear. The
 * server's `room.clock` (delivered via the TIMED protocol prefix when the
 * room called `defineInput()`) is consumed automatically — RTT / server
 * time arrive without any setup.
 *
 *     import { Client } from "colyseus.js";
 *     import { Predict } from "./Predictor";
 *
 *     const room = await client.joinOrCreate("arena");
 *     const predict = Predict.get(room, { mode: "lerp", delay: 80 });
 *
 *     // Smoothing on a single schema instance:
 *     predict.attach(room.state.boss, { x: "lerp", y: "lerp" });
 *
 *     // Dead-reckoning on every child of a collection. Pass the parent
 *     // (e.g. `room.state`) only for nested collections — root-level
 *     // collections take just the key:
 *     predict.attachAll("enemies", {
 *         mode: "reckon", step: stepEnemy, fields: ["x","y","vx"], smoothMs: 40,
 *     });
 *
 *     // Once per render frame:
 *     function renderLoop(t: number) {
 *         predict.tick(t);
 *         drawPlayer(predict.value(room.state.boss, "x"), predict.value(room.state.boss, "y"));
 *         requestAnimationFrame(renderLoop);
 *     }
 *
 * For side-by-side mode comparison, spin up multiple Predicts:
 *
 *     const lerp   = Predict.get(room, { mode: "lerp",   delay: 80 });
 *     const damped = Predict.get(room, { mode: "damped", smoothMs: 65 });
 *
 * The exact public surface an SDK port implements is recorded in the port
 * manifest (`PORTING.md`, repo root); everything else in this module is
 * internal machinery or a JS-only dev affordance.
 *
 * NOTE: call `attach` AFTER the instance has been delivered by the
 * server (e.g. inside `onAdd`). Attaching to an instance that hasn't been
 * decoded yet throws `Can't addCallback (refId is undefined)`.
 */ // -----------------------------------------------------------------------------
// SoA slot storage — a single Float64Array holds every tracked slot's runtime
// state, including lerp's snapshot ring. Indexed by slot id (assigned at
// track-time, recycled via a free-list).
//
// Config (mode/delay/smoothMs/maxExtrapolate/tickInterval) is *not* stored
// per slot — it lives in a separate `profileBuf` and the slot only carries a
// `profileIdx`. Many slots that share the same config share one profile, so
// homogeneous attachAll groups collapse to a single packed record. Mutating
// the defaults profile in place is enough for `setDefaults` to take effect —
// no retrack-all walk.
//
// Layout per slot: stride = SLOT_STRIDE floats.
//   [0]  v1                 latest server value (damped target; fallback when ring empty)
//   [1]  auxV               mode-multiplexed smoothing state:
//                              damped       → current EMA value
//                              extrapolate  → predict-then-smooth output
//                              lerp         → output-spring value (smoothMs > 0)
//   [2]  auxT               timestamp of the last frame that advanced auxV
//   [3]  profileIdx         index into `profileBuf` for this slot's config
//   [4]  refId              schema refId this slot belongs to (self-describing)
//   [5]  fieldId            schema field index this slot predicts
//   [6]  ringHead           next write index into the snapshot ring (0..RING_CAP-1)
//   [7]  ringCount          number of valid entries (0..RING_CAP)
//   [8]  lerpPrev           previous frame's RAW lerp output — the target slope
//                              for the output spring's first-order-hold step
//   [9..]                   RING_CAP × (t, v) interleaved snapshots
//                              (used by both lerp and extrapolate)
//
// refId / fieldId make the slot self-describing: given only a slot id, the
// engine can recover its (refId, fieldId) without touching any JS object. This
// is what lets every mode's read collapse to a pure `(slotId) -> number`
// computer — reckon reads `simByRef[refId]` and `raw` reads SLOT_V1, neither
// needing the instance handed in.
//
// Sample updates write a few floats in place — zero allocation on the hot
// path. The ring is a fixed circular buffer; pushing past capacity overwrites
// the oldest entry via head wrap, so there is no O(n) shift like Array.shift.
//
// Damped and extrapolate are mutually exclusive per slot (the profile picks
// the mode), so they share auxV / auxT instead of carrying separate fields.
const RING_CAP = 16;
const SLOT_V1 = 0;
const SLOT_AUX_V = 1;
const SLOT_AUX_T = 2;
const SLOT_PROFILE = 3;
const SLOT_REF = 4;
const SLOT_FIELD = 5;
const SLOT_RING_HEAD = 6;
const SLOT_RING_COUNT = 7;
const SLOT_LERP_PREV = 8;
const SLOT_RING_BASE = 9;
const SLOT_STRIDE = SLOT_RING_BASE + RING_CAP * 2; // 9 + 32 = 41
// Idle-resume gap collapse (see the listener). Colyseus delta-encodes, so a
// field that stops changing (a player standing still, y while grounded) emits
// NO samples — the ring goes stale. When samples resume there's a huge time
// gap between the last idle sample and the first motion sample; left alone,
// lerp/extrapolate interpolate across it and the entity crawls for ~delay ms
// ("starts, pauses, then walks") before snapping to real speed. We detect the
// gap RELATIVE to the most recent normal inter-arrival interval (so genuinely
// sparse-but-regular streams are NOT collapsed) and pull the previous sample's
// timestamp forward to one normal interval before the resume, so playback
// continues at the real cadence with no crawl.
const GAP_RESUME_MULT = 3; // collapse when gap > MULT × recent interval (cadence unknown)
// When the server's patch cadence is known (clock.patchInterval), collapse a
// gap past ~1.5 patches: on the jitter-free server-time axis a moving field
// gets a sample EVERY patch, so a longer gap means it went idle. This catches
// short pauses that MULT × the (rate-scaled) measured interval misses when
// patchRate ≠ tickRate — the rewind records every patch, so the client must
// HOLD across an idle gap to match it (lag-comp "what you see is what you hit").
const GAP_RESUME_PATCH_MULT = 1.5;
const GAP_RESUME_MAX_MS = 250; // cap the synthesized resume span (safety)
// Profile table — packed Float64Array, PROFILE_STRIDE floats. Profile 0 is the Predict's
// *defaults* (mutable; setDefaults edits it in place). Profiles 1..N are
// *frozen* per-call configs, allocated when an attach overrides any defaults.
// Frozen profiles are value-deduplicated via `profileKeys` so that an
// attachAll on a thousand entities sharing the same override still allocates
// just one extra profile, not a thousand.
const PROFILE_STRIDE = 7;
const P_MODE = 0;
const P_DELAY = 1;
const P_SMOOTH_MS = 2;
const P_MAX_EXTRAPOLATE = 3;
const P_TICK_INTERVAL = 4;
const P_SNAP = 5;
// Lerp's output-spring time constant, stored SEPARATELY from P_SMOOTH_MS:
// the same `smoothMs` option defaults 0 on lerp (spring off) but 50 on
// damped/extrapolate, and a profile can mode-flip at runtime — one float
// can't carry both defaults. An explicit `smoothMs` writes both fields.
const P_LERP_SMOOTH_MS = 6;
const DEFAULTS_PROFILE = 0;
const MODE_LERP = 0;
const MODE_EXTRAPOLATE = 1;
const MODE_DAMPED = 2;
const MODE_RECKON = 3;
const MODE_RAW = 4;
/** Internal-only: the slot's value is a rollback controller's pose read (the
 *  bound overlay `predict.sim`/`predict.reconciler` install for their bound
 *  instances). Not a user-selectable {@link PredictMode} — absent from
 *  MODE_CODES; profiles carrying it are allocated by `installBoundOverlay`. */ const MODE_BOUND = 5;
const MODE_CODES = {
    lerp: MODE_LERP,
    extrapolate: MODE_EXTRAPOLATE,
    damped: MODE_DAMPED,
    reckon: MODE_RECKON,
    raw: MODE_RAW
};
/** Smoothing-mode defaults applied when callers omit specific fields. */ const SMOOTHING_DEFAULTS = {
    mode: "lerp",
    delay: 100,
    smoothMs: 50,
    maxExtrapolate: 200,
    tickInterval: 0,
    snap: 0,
    angle: false
};
const RECKON_DEFAULTS = {
    step: undefined,
    smoothMs: 50,
    substep: 16,
    snap: 0
};
function isReckonAttachConfig(cfg) {
    if (cfg === null || typeof cfg !== "object") return false;
    return Array.isArray(cfg.fields);
}
let __predictAutoId = 0;
let __warnedNoInputClock = false;
/** Warn once when a {@link Predict} inherits the inert {@link NULL_CLOCK} — the
 *  server room never called `defineInput()`, so server-time interpolation and
 *  lag compensation silently fall back to local time. */ function warnNoInputClock() {
    if (__warnedNoInputClock) {
        return;
    }
    __warnedNoInputClock = true;
    console.warn("@colyseus/sdk Predict: room.clock isn't server-synced because the server " + "room didn't call defineInput(). Server-time interpolation and lag " + "compensation fall back to local time. Add defineInput() on the server " + "room to enable them — or ignore this if you only need local smoothing.");
}
class Predict {
    /**
     * Factory mirroring `Callbacks.get(room)`. Each call returns a fresh
     * Predict — instantiate multiple for side-by-side comparison overlays.
     * `TState` is inferred from `room.state` so `attachAll(key, config)` can
     * narrow `key` to the root state's collection-valued properties.
     */ static get(room, opts = {}) {
        return new Predict(room, opts);
    }
    // Loose-typed callbacks wrapper. Forwards to `Callbacks.get(room)` whose
    // own overloads accept either `(key, cb)` for root state or
    // `(parent, key, cb)` for nested collections.
    callbacks;
    /** The construction input, kept for `sessionId` (a Room has one, a raw
     *  Decoder doesn't) — `confirmOn.mine` resolves against it. */ sessionSource;
    // SoA storage for smoothing slots. `slotBuf` holds all slots packed at
    // `slotIdx * SLOT_STRIDE`. `slotByRef` maps refId → (field NAME → slot idx).
    // Keying the inner map by field name (not index) means the hot `value()`
    // read resolves a slot with two plain Map.gets and NEVER touches schema
    // metadata — no per-frame name→index resolution (that was a megamorphic
    // keyed load). `slotDetach[idx]` holds the listen()-returned unsubscribe
    // (parallel array, not packed in `slotBuf` since closures aren't numbers).
    // Recycled indices live in `freeSlots`; the buffer doubles when `slotCount`
    // outgrows capacity.
    //
    // Keyed on the schema's integer refId, not JS object identity — the same
    // key the wire protocol and a C / C# port would use. Entries are removed on
    // detach (which fires from onRemove before the decoder can recycle a
    // refId), so a reused refId never collides with a stale entry.
    slotBuf = new Float64Array(64 * SLOT_STRIDE);
    slotCount = 0;
    slotDetach = [];
    // Per-slot angle flag (parallel to slotDetach). Marks slots whose samples are
    // stored unwrapped so the interpolators handle the ±π seam — see `angle` option.
    slotAngle = [];
    freeSlots = [];
    slotByRef = new Map();
    simByRef = new Map();
    /** MODE_BOUND side table: overlay slot → its {@link BoundSlotEntry}. An
     *  entry here marks the slot as a controller overlay; teardown paths branch
     *  on membership (see untrackSlot / detachByRef / registerBound). */ boundBySlot = new Map();
    /** The one shared MODE_BOUND profile (lazily allocated). Bound slots carry
     *  no tunable params and the panel's per-controller cards come from
     *  {@link snapshotReconcilers}, so per-controller profiles would only
     *  accumulate (profiles are never freed — a respawn loop would leak them). */ boundProfileIdx = -1;
    renderTime = 0;
    defaultMode;
    reckonDefaults;
    clock;
    /** Draw reckon entities on the clock's render timeline — see the
     *  `renderPresent` option on {@link PredictGetOptions}. */ useRenderClock = false;
    // --- Room-wide fixed-step accumulator (drives reconciler input pacing) ------
    // The server's tick rate is one value per room, so one accumulator here is the
    // single source of truth: `tick(now)` converts elapsed render time into the
    // whole number of fixed input ticks due (returned to the caller's send loop).
    // `stepMs` is adopted from the first reconciler spawned (its input handle
    // advertises the server rate); until then no fixed step is known and `tick`
    // returns 0. (Render interpolation is NOT derived here — each reconciler eases
    // it off its own last-step time, so it holds correctly when that entity's input
    // pauses; see RollbackController.renderAlpha.)
    fixedStepMs;
    stepAcc = 0;
    lastFrameNow = -1;
    /** Spiral-of-death guard: cap fixed steps emitted per frame (after a hitch,
     *  drop the backlog rather than chase it). */ static MAX_STEPS_PER_FRAME = 5;
    // Profile table. Profile 0 is the defaults (mutable via setDefaults).
    // Subsequent indices are frozen, value-deduped via `profileKeys`.
    profileBuf = new Float64Array(8 * PROFILE_STRIDE);
    profileCount = 0;
    profileKeys = new Map();
    /**
     * Human label per profile, indexed by profile id. Set from the attach
     * group's key (collection name) so the debug panel can render one card per
     * group ("enemies", "players") instead of an anonymous, cross-wired
     * per-Predict mode toggle. The label is also part of the dedup key, so two
     * different groups never share a profile even if their params match —
     * tuning one group's card can't bleed into another's.
     */ profileLabels = [];
    /**
     * Per-profile read function — resolved once at profile allocation (or
     * when `setDefaults`/`setProfile` flips a profile's mode) and stored
     * here. Slot reads dispatch via `profileComputers[profileIdx](slotIdx)`
     * instead of an `if (mode === ...)` chain at each `value()` call.
     *
     * Every mode reads purely from the slot: the slot's SLOT_REF / SLOT_FIELD
     * let `reckon` find its SimState and `raw` read SLOT_V1, so no instance or
     * field-name is threaded through. This pure `(slotId) -> number` shape is
     * exactly a C function-pointer table / C# delegate array.
     */ profileComputers = [];
    /**
     * Track-event listeners. The debug bridge subscribes via the published
     * core's `onTrack`; on the cold attach path each `trackWithProfile` notifies
     * them with `(profileIdx, field)` so the bridge can build its profile→fields
     * view WITHOUT the engine holding any panel-shaped state. Empty in prod (no
     * debug registry ⇒ never subscribed), so the per-track notify is a length
     * check on a cold path.
     */ trackListeners = [];
    /** Public name (shown in the debug panel and useful for logs). */ name;
    disposeListeners = [];
    /**
     * Child primitives spawned by {@link defineEvent} / {@link spawns} /
     * {@link reconciler} / {@link sim} that this Predict drives from its own
     * {@link tick}. The Predict is the single
     * per-frame driver for the whole prediction stack — one `predict.tick(now)`
     * advances smoothing AND every controller AND prunes every event store, so
     * callers can't forget to tick/prune a child (a forgotten drive is a silent
     * visual bug). Children expose their own `tick`/`prune` for standalone use;
     * a `dead` child is dropped on the next tick.
     */ driven = [];
    constructor(room, opts){
        this.callbacks = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Callbacks"].get(room);
        this.sessionSource = room;
        const { clock, ...rest } = opts;
        // Determine the predictor's *default* prediction style. Per-attach
        // overrides can still switch to a different mode.
        this.defaultMode = rest.mode ?? "lerp";
        // Always materialize a defaults profile at index 0 — even on a
        // reckon-default or raw-default Predict, callers may flip the mode
        // back to a smoothing mode later and the profile needs to exist.
        const isSmoothingDefault = this.defaultMode !== "reckon" && this.defaultMode !== "raw";
        const initial = isSmoothingDefault ? (()=>{
            const s = rest;
            return {
                mode: s.mode ?? SMOOTHING_DEFAULTS.mode,
                delay: s.delay ?? SMOOTHING_DEFAULTS.delay,
                smoothMs: s.smoothMs ?? SMOOTHING_DEFAULTS.smoothMs,
                maxExtrapolate: s.maxExtrapolate ?? SMOOTHING_DEFAULTS.maxExtrapolate,
                tickInterval: s.tickInterval ?? SMOOTHING_DEFAULTS.tickInterval,
                snap: s.snap ?? SMOOTHING_DEFAULTS.snap,
                angle: s.angle ?? SMOOTHING_DEFAULTS.angle
            };
        })() : {
            ...SMOOTHING_DEFAULTS
        };
        // Allocate profile 0 (defaults). Its MODE is the Predict's actual
        // `defaultMode` (reckon/raw included) — NOT lerp. Seeding it as lerp was
        // the quirk that let a lerp group silently collapse onto the default
        // profile. The smoothing PARAMS are still seeded from defaults so a
        // later flip to a smoothing mode (via setDefaults) has sane values.
        // `dedup: false` because we mutate this profile in place via setDefaults;
        // deduping would conflate it with a frozen profile of the same values.
        // Lerp's output spring defaults OFF — only an explicit `smoothMs` arms
        // it (initial.smoothMs's 50 fallback serves damped/extrapolate).
        const lerpSmoothMs = isSmoothingDefault ? rest.smoothMs ?? 0 : 0;
        const dIdx = this.allocProfile(this.defaultMode, initial.delay, initial.smoothMs, lerpSmoothMs, initial.maxExtrapolate, initial.tickInterval, initial.snap, false);
        // The first allocProfile is guaranteed to land at index 0 — invariant
        // relied on by SLOT_PROFILE writes that fall back to "use defaults".
        if (dIdx !== DEFAULTS_PROFILE) {
            throw new Error("Predict: defaults profile must be at index 0");
        }
        if (this.defaultMode === "reckon") {
            const r = rest;
            this.reckonDefaults = {
                step: r.step,
                smoothMs: r.smoothMs ?? RECKON_DEFAULTS.smoothMs,
                substep: r.substep ?? RECKON_DEFAULTS.substep,
                snap: r.snap ?? RECKON_DEFAULTS.snap
            };
        } else {
            this.reckonDefaults = {
                ...RECKON_DEFAULTS
            };
        }
        // Prefer caller-supplied clock; otherwise inherit `room.clock` (set
        // by the SDK when the server called `defineInput()`). Stays undefined
        // for rooms without a clock — `trackStepped` then requires explicit
        // forwardMs/elapsedMs.
        this.clock = clock ?? room.clock ?? undefined;
        // Default ON: reckon draws on renderNow() when the clock offers it
        // (presentFn falls back to serverNow otherwise). `false` forces raw.
        this.useRenderClock = rest.renderPresent !== false;
        // Prediction wants a server-synced clock (server-time interpolation,
        // lag-comp render stamps). It only exists once the room called
        // defineInput(); inheriting the inert stub means that didn't happen.
        if (this.clock === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$RoomClock$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NULL_CLOCK"]) {
            warnNoInputClock();
        }
        this.name = rest.name ?? `predict#${++__predictAutoId}`;
        // Publish a core handle to the debug channel. `publishDebug` renders it
        // now if `@colyseus/sdk/debug` is loaded, else BUFFERS it for replay when
        // the overlay's (dev-only, dynamic) import lands — so a Predict created
        // before that import still shows up. Prod pays nothing: no overlay ⇒ a
        // bounded WeakRef buffer nothing ever reads (and `trackWithProfile`'s
        // notify stays a length check, `attachedCount` an already-maintained map).
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["publishDebug"])("predict", this.makeCoreHandle());
    }
    /**
     * Predictor's current default mode. Reflects mutations via {@link setDefaults}
     * (and therefore the SDK debug panel), so consumers that need to react to
     * mode changes can read this each frame.
     */ get mode() {
        return this.defaultMode;
    }
    /**
     * The "present" instant provider for reckon horizons + time-sampling (the
     * `forwardMs` snapshot-age and the `elapsedMs` absolute clock). Unless
     * {@link PredictGetOptions.renderPresent} was set `false`, and when the clock
     * implements {@link RoomClockLike.renderNow}, it's the slew-smoothed render
     * timeline; otherwise the raw {@link RoomClockLike.serverNow}. `undefined`
     * with no clock — reckon attaches then require explicit
     * forwardMs/elapsedMs. Resolved once on the cold attach path.
     *
     * The lag-comp read (`valueAt` with an explicit `when`) never goes through
     * here, so hit stamps stay on `serverNow()` even with render-present on.
     */ presentFn() {
        const clock = this.clock;
        if (!clock) {
            return undefined;
        }
        return this.useRenderClock && clock.renderNow ? clock.renderNow.bind(clock) : clock.serverNow.bind(clock);
    }
    // --- Core introspection handle ---------------------------------------------
    makeCoreHandle() {
        return {
            name: this.name,
            mode: ()=>this.defaultMode,
            smoothingDefaults: ()=>this.readSmoothingDefaults(),
            reckonDefaults: ()=>({
                    ...this.reckonDefaults
                }),
            reconcilers: ()=>this.snapshotReconcilers(),
            // Every attached instance owns ≥1 smoothing slot, so the slot map's key
            // count IS the attached-instance count — no separate bookkeeping needed.
            attachedCount: ()=>this.slotByRef.size,
            setDefaults: (opts)=>this.setDefaults(opts),
            profiles: ()=>this.snapshotProfiles(),
            setProfile: (id, opts)=>this.setProfile(id, opts),
            onTrack: (cb)=>{
                this.trackListeners.push(cb);
                return ()=>{
                    const i = this.trackListeners.indexOf(cb);
                    if (i >= 0) this.trackListeners.splice(i, 1);
                };
            },
            onDispose: (cb)=>{
                this.disposeListeners.push(cb);
                return ()=>{
                    const i = this.disposeListeners.indexOf(cb);
                    if (i >= 0) this.disposeListeners.splice(i, 1);
                };
            }
        };
    }
    /** Drift telemetry for each driven Reconciler/SimReconciler (duck-typed by
     *  the presence of `drift`), for the debug panel. Event/spawn stores in the
     *  same `driven` list have no `drift` and are skipped. */ snapshotReconcilers() {
        const out = [];
        let i = 0;
        for (const d of this.driven){
            const r = d;
            if (!r.drift) {
                continue;
            }
            const tol = r.warnTolerance;
            out.push({
                label: `reconciler #${i++}`,
                status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyDrift"])(r.drift, tol),
                severity: tol !== undefined && tol > 0 ? r.drift.ema / tol : undefined,
                ema: r.drift.ema,
                peak: r.drift.peak,
                lastCorrectionMag: r.lastCorrectionMag ?? 0,
                reconcileSeq: r.reconcileSeq ?? 0
            });
        }
        return out;
    }
    readSmoothingDefaults() {
        const p = this.profileBuf;
        const b = DEFAULTS_PROFILE * PROFILE_STRIDE;
        const m = p[b + P_MODE] | 0;
        const mode = m === MODE_LERP ? "lerp" : m === MODE_EXTRAPOLATE ? "extrapolate" : m === MODE_DAMPED ? "damped" : m === MODE_RECKON ? "reckon" : "raw";
        return {
            mode,
            delay: p[b + P_DELAY],
            smoothMs: p[b + P_SMOOTH_MS],
            lerpSmoothMs: p[b + P_LERP_SMOOTH_MS],
            maxExtrapolate: p[b + P_MAX_EXTRAPOLATE],
            tickInterval: p[b + P_TICK_INTERVAL],
            snap: p[b + P_SNAP]
        };
    }
    /**
     * Look up or allocate a profile matching the given values. With
     * `dedup=true`, an identical existing profile is reused — so an attachAll
     * over 1000 entities with the same per-field config still allocates one
     * profile, not 1000.
     */ allocProfile(mode, delay, smoothMs, lerpSmoothMs, maxExtrapolate, tickInterval, snap, dedup, label) {
        // A numeric mode is an internal code (MODE_BOUND) with no PredictMode name.
        const modeCode = typeof mode === "number" ? mode : MODE_CODES[mode];
        let key = "";
        if (dedup) {
            // Label is part of the key: two groups never share a profile, so
            // their panel cards stay independent.
            key = `${label ?? ""}|${modeCode}|${delay}|${smoothMs}|${lerpSmoothMs}|${maxExtrapolate}|${tickInterval}|${snap}`;
            const existing = this.profileKeys.get(key);
            if (existing !== undefined) return existing;
        }
        const idx = this.profileCount++;
        const needed = (idx + 1) * PROFILE_STRIDE;
        if (needed > this.profileBuf.length) {
            const grown = new Float64Array(this.profileBuf.length * 2);
            grown.set(this.profileBuf);
            this.profileBuf = grown;
        }
        const base = idx * PROFILE_STRIDE;
        this.profileBuf[base + P_MODE] = modeCode;
        this.profileBuf[base + P_DELAY] = delay;
        this.profileBuf[base + P_SMOOTH_MS] = smoothMs;
        this.profileBuf[base + P_LERP_SMOOTH_MS] = lerpSmoothMs;
        this.profileBuf[base + P_MAX_EXTRAPOLATE] = maxExtrapolate;
        this.profileBuf[base + P_TICK_INTERVAL] = tickInterval;
        this.profileBuf[base + P_SNAP] = snap;
        this.profileLabels[idx] = label;
        // Resolve the compute function once, here at registration — slot
        // reads then invoke it directly instead of branching on mode.
        this.profileComputers[idx] = this.computerForMode(modeCode);
        if (dedup) this.profileKeys.set(key, idx);
        return idx;
    }
    computerForMode(modeCode) {
        if (modeCode === MODE_LERP) return this.computeLerp;
        if (modeCode === MODE_EXTRAPOLATE) return this.computeExtrapolate;
        if (modeCode === MODE_DAMPED) return this.computeDamped;
        if (modeCode === MODE_RECKON) return this.computeReckon;
        if (modeCode === MODE_BOUND) return this.computeBound;
        return this.computeRaw; // MODE_RAW
    }
    /**
     * Resolve a per-track opts shape to a profile index.
     *   - empty opts (no own keys) → defaults profile (0). The slot follows
     *     setDefaults mutations.
     *   - non-empty opts that, after merging with current defaults, match
     *     defaults exactly → defaults profile (0). Equivalent intent, same
     *     internal state.
     *   - non-empty opts that differ from defaults → frozen profile, value-
     *     deduped via `profileKeys`. The slot does NOT follow later
     *     setDefaults mutations (the override is "frozen").
     */ profileFromOpts(opts) {
        if (opts.mode === undefined && opts.delay === undefined && opts.smoothMs === undefined && opts.maxExtrapolate === undefined && opts.tickInterval === undefined && opts.snap === undefined) {
            return DEFAULTS_PROFILE;
        }
        const d = this.readSmoothingDefaults();
        const mode = opts.mode ?? d.mode;
        const delay = opts.delay ?? d.delay;
        const smoothMs = opts.smoothMs ?? d.smoothMs;
        const lerpSmoothMs = opts.smoothMs ?? d.lerpSmoothMs;
        const maxExtrapolate = opts.maxExtrapolate ?? d.maxExtrapolate;
        const tickInterval = opts.tickInterval ?? d.tickInterval;
        const snap = opts.snap ?? d.snap;
        // Collapse to defaults profile when the merged values match it. This
        // unifies homogeneous per-attach configs (e.g. `{ mode: "lerp" }` on
        // a Predict already at lerp) with the implicit no-override case —
        // ensuring there's exactly one internal state for any given intent.
        if (mode === d.mode && delay === d.delay && smoothMs === d.smoothMs && lerpSmoothMs === d.lerpSmoothMs && maxExtrapolate === d.maxExtrapolate && tickInterval === d.tickInterval && snap === d.snap) {
            return DEFAULTS_PROFILE;
        }
        return this.allocProfile(mode, delay, smoothMs, lerpSmoothMs, maxExtrapolate, tickInterval, snap, true);
    }
    /**
     * Allocate (or reuse, within the same `label`) the profile for an attach
     * group. Unlike {@link profileFromOpts}, this NEVER collapses onto the
     * mutable default profile #0 — each labeled group owns its own profile so
     * the debug panel can tune it in isolation (the fix for the "changing the
     * enemies card moved the players" cross-wire). All children of one
     * `attachAll` share the profile (same label + params ⇒ deduped); different
     * groups never do.
     */ groupProfile(opts, label) {
        const d = this.readSmoothingDefaults();
        const mode = opts.mode ?? this.defaultMode;
        return this.allocProfile(mode, opts.delay ?? d.delay, opts.smoothMs ?? d.smoothMs, opts.smoothMs ?? d.lerpSmoothMs, opts.maxExtrapolate ?? d.maxExtrapolate, opts.tickInterval ?? d.tickInterval, opts.snap ?? d.snap, true, label);
    }
    /**
     * Mutate the Predict's default options. Within the same mode family
     * (smoothing modes are interchangeable; reckon is its own family). Throws
     * on cross-family switches — create a new Predict instead.
     *
     * Mutations take effect on the next frame for every slot that attached
     * with a default-shaped config (e.g. `{ x: {}, y: {} }`); attaches that
     * explicitly overrode a field (e.g. `{ x: { delay: 50 } }`) snapshot
     * their settings at attach time and are unaffected.
     *
     * Mode flips can cross families freely. The defaults profile (id 0)
     * always encodes the current mode (any of the five), and its computer is
     * swapped in lock-step so `value()` dispatches correctly without further
     * branching.
     */ setDefaults(opts) {
        // Mode handling first — it's the only field that affects routing.
        const newMode = opts.mode;
        if (newMode !== undefined) {
            this.defaultMode = newMode;
            // Profile 0 always stores the current mode — uniform encoding
            // means slot dispatch follows automatically.
            const base = DEFAULTS_PROFILE * PROFILE_STRIDE;
            const code = MODE_CODES[newMode];
            this.profileBuf[base + P_MODE] = code;
            this.profileComputers[DEFAULTS_PROFILE] = this.computerForMode(code);
        }
        // Smoothing-mode fields → profile 0 (slots sharing it follow).
        const s = opts;
        const base = DEFAULTS_PROFILE * PROFILE_STRIDE;
        const p = this.profileBuf;
        if (s.delay !== undefined) p[base + P_DELAY] = s.delay;
        // Explicit smoothMs arms both fields — lerp's spring and damped/
        // extrapolate's rate — so the value survives runtime mode flips.
        if (s.smoothMs !== undefined) {
            p[base + P_SMOOTH_MS] = s.smoothMs;
            p[base + P_LERP_SMOOTH_MS] = s.smoothMs;
        }
        if (s.maxExtrapolate !== undefined) p[base + P_MAX_EXTRAPOLATE] = s.maxExtrapolate;
        if (s.tickInterval !== undefined) p[base + P_TICK_INTERVAL] = s.tickInterval;
        if (s.snap !== undefined) {
            p[base + P_SNAP] = s.snap;
            this.reckonDefaults.snap = s.snap;
        }
        // Reckon-mode fields → reckonDefaults.
        const r = opts;
        if (r.step !== undefined) this.reckonDefaults.step = r.step;
        if (r.smoothMs !== undefined) this.reckonDefaults.smoothMs = r.smoothMs;
        if (r.substep !== undefined) this.reckonDefaults.substep = r.substep;
    }
    /**
     * Snapshot every profile currently registered with this Predict. Profiles
     * include the defaults (id 0) plus one per unique `(mode, opts)` tuple that's
     * been frozen by per-field attach overrides. Returns engine state only — the
     * profile → field-names mapping the panel shows is derived by the debug
     * bridge from the `onTrack` stream, not here.
     */ snapshotProfiles() {
        const out = [];
        for(let i = 0; i < this.profileCount; i++){
            const base = i * PROFILE_STRIDE;
            const m = this.profileBuf[base + P_MODE] | 0;
            if (m === MODE_BOUND) continue; // controller-owned — nothing tunable
            const mode = m === MODE_LERP ? "lerp" : m === MODE_EXTRAPOLATE ? "extrapolate" : m === MODE_DAMPED ? "damped" : m === MODE_RECKON ? "reckon" : "raw";
            out.push({
                id: i,
                isDefault: i === DEFAULTS_PROFILE,
                label: this.profileLabels[i],
                mode,
                delay: this.profileBuf[base + P_DELAY],
                // Report the smoothMs the ACTIVE mode reads (lerp's spring vs
                // damped/extrapolate's rate) — the panel slider round-trips it.
                smoothMs: this.profileBuf[base + (m === MODE_LERP ? P_LERP_SMOOTH_MS : P_SMOOTH_MS)],
                maxExtrapolate: this.profileBuf[base + P_MAX_EXTRAPOLATE],
                tickInterval: this.profileBuf[base + P_TICK_INTERVAL],
                snap: this.profileBuf[base + P_SNAP]
            });
        }
        return out;
    }
    /**
     * Mutate one profile in place. Used by the debug panel's per-profile
     * controls. Setting `mode` swaps the cached `profileComputers[id]` in
     * lock-step so slot reads pick the new dispatch immediately.
     */ setProfile(id, opts) {
        if (id < 0 || id >= this.profileCount) return;
        const base = id * PROFILE_STRIDE;
        const p = this.profileBuf;
        if ((p[base + P_MODE] | 0) === MODE_BOUND) return; // controller-owned — not tunable
        if (opts.mode !== undefined) {
            const code = MODE_CODES[opts.mode];
            p[base + P_MODE] = code;
            this.profileComputers[id] = this.computerForMode(code);
            // Defaults profile's mode also drives the outer routing's
            // smoothing-mode encoding, keep them aligned.
            if (id === DEFAULTS_PROFILE) this.defaultMode = opts.mode;
        }
        if (opts.delay !== undefined) p[base + P_DELAY] = opts.delay;
        if (opts.smoothMs !== undefined) {
            p[base + P_SMOOTH_MS] = opts.smoothMs;
            p[base + P_LERP_SMOOTH_MS] = opts.smoothMs;
        }
        if (opts.maxExtrapolate !== undefined) p[base + P_MAX_EXTRAPOLATE] = opts.maxExtrapolate;
        if (opts.tickInterval !== undefined) p[base + P_TICK_INTERVAL] = opts.tickInterval;
        if (opts.snap !== undefined) p[base + P_SNAP] = opts.snap;
    }
    /**
     * Tear down all subscriptions. Detaches every attached instance, frees
     * smoothing slots, removes the Predict from the debug registry, and
     * invokes onDispose listeners.
     */ dispose() {
        for (const refId of new Set([
            ...this.slotByRef.keys(),
            ...this.simByRef.keys()
        ]))this.detachByRef(refId);
        this.trackListeners.length = 0;
        for (const d of this.driven.splice(0))d.dispose?.();
        for (const cb of this.disposeListeners.splice(0))cb();
    }
    // --- Low-level smoothing primitives ----------------------------------------
    /**
     * @internal Low-level primitive — track one numeric field for smoothing.
     * Most consumers should use {@link attach} / {@link attachAll}; this is
     * the underlying mechanism the high-level paths build on, exposed for
     * advanced per-field control or when integrating with frameworks that
     * already manage their own attach lifecycle.
     */ track(instance, field, opts = {}) {
        // Resolve to a shared profile (empty opts → defaults profile;
        // non-empty → frozen, value-deduped). The mode encoded in the
        // profile drives dispatch — including reckon and raw — so this
        // primitive accepts any `PredictMode` in `opts.mode`.
        return this.trackWithProfile(instance, field, this.profileFromOpts(opts), opts.angle ?? false);
    }
    /**
     * @internal Track `field` under an explicit, pre-resolved profile. The
     * attach path uses this so a whole group shares ONE labeled profile
     * instead of each field re-resolving (and possibly collapsing onto the
     * mutable default #0). The read/sample hot path is identical either way —
     * the slot just stores whichever profile id it's given.
     */ trackWithProfile(instance, field, profileIdx, angle = false) {
        // Resolve the schema-native identity once, here at the API boundary.
        // The hot path (samples + reads) operates purely on these integers.
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        if (refId === undefined) {
            throw new Error("Predict.track(): instance has no refId — track/attach must run " + "AFTER the decoder delivers the instance (e.g. inside onAdd).");
        }
        const fieldId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fieldIndexOf"])(instance, field);
        // `field: NumericKeys<T>` guarantees `instance[field]` is `number`;
        // the `?? 0` only covers the case where the schema field hasn't
        // been hydrated by the decoder yet.
        const initial = instance[field] ?? 0;
        // Idempotent per field: re-tracking the SAME field frees + replaces its slot,
        // leaving OTHER fields on the instance untouched — so a 2nd attach()/attachAll()
        // COMPOSES additively instead of leaking the old slot. This is what lets
        // attachWithPlan skip the blanket detach that used to clobber sibling attaches.
        // When the current mapping is a controller overlay (MODE_BOUND), the overlay
        // wins: the new passive slot installs UNDERNEATH it as the stash (replacing
        // any previous understudy) and keeps sampling until the controller disposes.
        let boundOver;
        const existingIdx = this.slotByRef.get(refId)?.get(field);
        if (existingIdx !== undefined) {
            boundOver = this.boundBySlot.get(existingIdx);
            if (boundOver !== undefined) this.freeStash(boundOver);
            else this.untrackSlot(refId, field);
        }
        const slotIdx = this.allocSlot();
        const buf = this.slotBuf;
        const base = slotIdx * SLOT_STRIDE;
        buf[base + SLOT_V1] = initial;
        buf[base + SLOT_AUX_V] = initial;
        buf[base + SLOT_AUX_T] = performance.now();
        buf[base + SLOT_LERP_PREV] = initial;
        buf[base + SLOT_PROFILE] = profileIdx;
        buf[base + SLOT_REF] = refId;
        buf[base + SLOT_FIELD] = fieldId;
        // Reset the snapshot ring. Slot reuse via the free-list means stale
        // ring state could survive across attach lifetimes — head=count=0
        // makes the ring logically empty (entry floats are masked by count).
        buf[base + SLOT_RING_HEAD] = 0;
        buf[base + SLOT_RING_COUNT] = 0;
        this.slotAngle[slotIdx] = angle;
        if (boundOver !== undefined) {
            boundOver.stash = slotIdx;
        } else {
            let perRef = this.slotByRef.get(refId);
            if (perRef === undefined) {
                perRef = new Map();
                this.slotByRef.set(refId, perRef);
            }
            perRef.set(field, slotIdx);
        }
        // Notify track listeners (the debug bridge, when present) so it can
        // build its profile → field-names view outside the engine. Empty in
        // prod — this is a length check on the cold attach path.
        for(let li = 0; li < this.trackListeners.length; li++){
            this.trackListeners[li](profileIdx, field);
        }
        // Sample-update hot path: push to ring + update v1. Capture `slotIdx`
        // by value; `this.slotBuf` is re-read each call to pick up grown
        // buffers transparently.
        const detach = this.callbacks.listen(instance, field, (current)=>{
            // Server-time axis: stamp samples with the patch's server-encode time
            // (jitter-free, server-stamped) when a clock is present, so interpolation
            // is immune to network arrival jitter. No clock → client arrival (perf.now).
            const now = this.clock && this.clock.lastServerTime() > 0 ? this.clock.lastServerTime() : performance.now();
            const b = this.slotBuf;
            const i = slotIdx * SLOT_STRIDE;
            // Angle field: fold the new wrapped value onto the last stored (continuous)
            // one over the shortest arc, so the ring stays monotonic across ±π and the
            // interpolators never spin the long way. sin/cos make the delta period-2π.
            if (angle) {
                const prev = b[i + SLOT_V1];
                current = prev + Math.atan2(Math.sin(current - prev), Math.cos(current - prev));
            }
            const pBase = (b[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
            const tickInterval = this.profileBuf[pBase + P_TICK_INTERVAL];
            let head = b[i + SLOT_RING_HEAD] | 0;
            let count = b[i + SLOT_RING_COUNT] | 0;
            // Value-space discontinuity (`snap` option): a per-sample jump
            // beyond the threshold is a TELEPORT, not motion — empty the
            // ring and snap the damped/extrapolate output state, so every
            // mode renders the new value immediately instead of gliding
            // across the gap. SLOT_V1 still holds the PREVIOUS sample here
            // (mirrored below). The zeroed count also disables the
            // gap-collapse inject for this sample (count >= 2 guard).
            const snapDelta = this.profileBuf[pBase + P_SNAP];
            if (snapDelta > 0 && count > 0 && Math.abs(current - b[i + SLOT_V1]) > snapDelta) {
                head = 0;
                count = 0;
                b[i + SLOT_AUX_V] = current;
                b[i + SLOT_LERP_PREV] = current; // lerp's output spring pops too
            }
            // Derive lastT1 (timestamp of the previous newest snapshot)
            // straight from the ring — no per-slot t1 field needed.
            const lastT1 = count === 0 ? Number.NEGATIVE_INFINITY : b[i + SLOT_RING_BASE + (head === 0 ? RING_CAP - 1 : head - 1) * 2];
            // Tick-snap incoming sample times to a regular grid so the
            // snapshot ring's bracketing lookup walks uniformly even when
            // packets arrive with jitter. Skipped for the first sample.
            // Bounded at +1 interval past `now` so the grid can't drift
            // into the future.
            let snapT = now;
            if (tickInterval > 0 && isFinite(lastT1)) {
                const elapsed = now - lastT1;
                const ticks = elapsed > 0 ? Math.max(1, Math.round(elapsed / tickInterval)) : 1;
                snapT = lastT1 + ticks * tickInterval;
                const cap = now + tickInterval;
                if (snapT > cap) snapT = cap;
            }
            // Mirror the latest value into SLOT_V1 — damped reads it as
            // its EMA target without having to walk the ring.
            b[i + SLOT_V1] = current;
            // Idle-resume gap collapse. If this sample lands far after the
            // previous one RELATIVE to the recent inter-arrival cadence, the
            // field was idle (delta encoding sent nothing). INJECT a
            // synthetic "held" sample carrying the previous value at
            // `snapT - resumeSpan`, so the stale anchor stays put (the
            // entity reads as held during idle) and motion resumes over one
            // normal interval instead of crawling across the whole gap.
            // Compared against the last *normal* interval (ring[head-2]→
            // ring[head-1]) so a genuinely sparse-but-regular stream
            // (gap ≈ its own cadence) is left untouched.
            const ringBase = i + SLOT_RING_BASE;
            if (count >= 2 && isFinite(lastT1)) {
                const h1 = head === 0 ? RING_CAP - 1 : head - 1; // previous newest
                const h2 = h1 === 0 ? RING_CAP - 1 : h1 - 1; // one before it
                const lastInterval = lastT1 - b[ringBase + h2 * 2];
                // Prefer the server-advertised patch cadence (stable, immune to
                // the measured interval drifting after a prior collapse); fall
                // back to MULT × the measured interval when it's unknown.
                const patchMs = this.clock?.patchInterval ? this.clock.patchInterval() : 0;
                const span = patchMs > 0 ? patchMs : lastInterval;
                const trigger = patchMs > 0 ? GAP_RESUME_PATCH_MULT * patchMs : GAP_RESUME_MULT * lastInterval;
                if (span > 0 && snapT - lastT1 > trigger) {
                    const resumeSpan = span < GAP_RESUME_MAX_MS ? span : GAP_RESUME_MAX_MS;
                    const sOff = ringBase + head * 2;
                    b[sOff] = snapT - resumeSpan;
                    b[sOff + 1] = b[ringBase + h1 * 2 + 1]; // previous (held) value
                    head = head + 1 >= RING_CAP ? 0 : head + 1;
                    if (count < RING_CAP) count++;
                }
            }
            // Push onto the snapshot ring. Head wraps at RING_CAP, count
            // saturates — past capacity, new writes overwrite the oldest
            // entry in place (no shift, no allocation).
            const off = ringBase + head * 2;
            b[off] = snapT;
            b[off + 1] = current;
            b[i + SLOT_RING_HEAD] = head + 1 >= RING_CAP ? 0 : head + 1;
            if (count < RING_CAP) b[i + SLOT_RING_COUNT] = count + 1;
        }, /* immediate */ true);
        this.slotDetach[slotIdx] = detach;
        return ()=>this.untrackSlot(refId, field);
    }
    /**
     * @internal Counterpart to {@link track}. Most consumers should use
     * {@link detach} / {@link attachAll}'s onRemove subscription instead.
     */ untrack(instance, field) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        if (refId === undefined) return;
        this.untrackSlot(refId, field);
    }
    untrackSlot(refId, field) {
        const perRef = this.slotByRef.get(refId);
        const slotIdx = perRef?.get(field);
        if (slotIdx === undefined) return;
        const bound = this.boundBySlot.get(slotIdx);
        if (bound !== undefined) {
            // The mapping is a controller overlay: untrack removes the PASSIVE
            // registration underneath (the stash). The overlay itself is torn
            // down only by its controller's dispose (or by detachByRef when the
            // entity itself is removed).
            this.freeStash(bound);
            return;
        }
        this.slotDetach[slotIdx]?.();
        this.slotDetach[slotIdx] = undefined;
        this.freeSlots.push(slotIdx);
        perRef.delete(field);
        if (perRef.size === 0) this.slotByRef.delete(refId);
    }
    /** Free a bound entry's stashed passive slot (detach its listener). */ freeStash(entry) {
        if (entry.stash < 0) return;
        this.slotDetach[entry.stash]?.();
        this.slotDetach[entry.stash] = undefined;
        this.freeSlots.push(entry.stash);
        entry.stash = -1;
    }
    allocSlot() {
        if (this.freeSlots.length > 0) return this.freeSlots.pop();
        const idx = this.slotCount++;
        const needed = (idx + 1) * SLOT_STRIDE;
        if (needed > this.slotBuf.length) {
            const grown = new Float64Array(this.slotBuf.length * 2);
            grown.set(this.slotBuf);
            this.slotBuf = grown;
        }
        return idx;
    }
    // --- Bound overlay (predict.value ← rollback controllers) -------------------
    /**
     * Install a MODE_BOUND overlay slot for each (source, numeric field) a
     * rollback controller predicts, so `predict.value(source, field)` reads the
     * controller's interpolated + smooth-corrected pose — the same idiom as
     * every passively-smoothed entity. A pre-existing passive slot (e.g. the
     * local player inside an `attachAll` lerp group) is STASHED — its field
     * listener stays subscribed and samples keep landing in its ring — and
     * restored when the controller disposes, so lerp resumes seamlessly.
     *
     * Returns the unregister (run on the controller's dispose): frees the
     * overlay slots and restores (or deletes) each mapping.
     */ registerBound(ctrl, source, fields, poseKeys, profileIdx) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(source); // callers pre-check (bound sources are decoded)
        let perRef = this.slotByRef.get(refId);
        if (perRef === undefined) {
            perRef = new Map();
            this.slotByRef.set(refId, perRef);
        }
        const slots = [];
        for(let k = 0; k < fields.length; k++){
            const field = fields[k];
            const existing = perRef.get(field);
            let stash = -1;
            if (existing !== undefined) {
                const prior = this.boundBySlot.get(existing);
                if (prior !== undefined) {
                    // Same (instance, field) claimed twice (two controllers, or one
                    // instance in two world parts): last registration wins — mirrors
                    // the "one accumulator can't pace two rates" posture. The
                    // ORIGINAL passive stash is inherited by the winner.
                    console.warn(`@colyseus/sdk Predict: "${field}" (refId ${refId}) is already bound ` + "to a controller — the newer registration wins.");
                    stash = prior.stash;
                    this.boundBySlot.delete(existing);
                    this.freeSlots.push(existing);
                } else {
                    stash = existing; // passive slot: stashed, its listener keeps sampling
                }
            }
            const slotIdx = this.allocSlot();
            const buf = this.slotBuf;
            const base = slotIdx * SLOT_STRIDE;
            // Self-describing like any slot, but NO listener — the computer reads
            // the controller, not the sample ring (slotDetach stays undefined;
            // teardown paths use `?.()`).
            const initial = source[field] ?? 0;
            buf[base + SLOT_V1] = initial;
            buf[base + SLOT_AUX_V] = initial;
            buf[base + SLOT_AUX_T] = 0;
            buf[base + SLOT_LERP_PREV] = initial;
            buf[base + SLOT_PROFILE] = profileIdx;
            buf[base + SLOT_REF] = refId;
            buf[base + SLOT_FIELD] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fieldIndexOf"])(source, field);
            buf[base + SLOT_RING_HEAD] = 0;
            buf[base + SLOT_RING_COUNT] = 0;
            this.slotAngle[slotIdx] = false;
            this.boundBySlot.set(slotIdx, {
                ctrl,
                key: poseKeys[k],
                stash
            });
            perRef.set(field, slotIdx);
            slots.push(slotIdx);
            for(let li = 0; li < this.trackListeners.length; li++){
                this.trackListeners[li](profileIdx, field);
            }
        }
        return ()=>{
            for(let k = 0; k < slots.length; k++){
                const slotIdx = slots[k];
                const entry = this.boundBySlot.get(slotIdx);
                // Identity check, not just presence: a freed slot index is recycled
                // by the free-list, so after a duplicate-claim (or entity removal)
                // this index may now back ANOTHER controller's overlay — which this
                // stale unregister must not tear down.
                if (entry === undefined || entry.ctrl !== ctrl) continue;
                this.boundBySlot.delete(slotIdx);
                this.freeSlots.push(slotIdx);
                const pr = this.slotByRef.get(refId);
                if (pr?.get(fields[k]) === slotIdx) {
                    if (entry.stash >= 0) {
                        pr.set(fields[k], entry.stash); // resume the passive slot
                    } else {
                        pr.delete(fields[k]);
                        if (pr.size === 0) this.slotByRef.delete(refId);
                    }
                }
            }
        };
    }
    /** Wire a just-spawned controller's bound instances into the `value()`
     *  overlay (all controllers share the one MODE_BOUND profile — the side
     *  table, not the profile, carries the per-slot backing) and arrange the
     *  restore on its dispose. No-op for controllers with nothing bound (opaque
     *  sim worlds, plain-fixture reconcilers). */ installBoundOverlay(ctrl) {
        const offs = [];
        for (const reg of ctrl.boundRegistrations){
            if (reg.fields.length === 0 || (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(reg.source) === undefined) continue;
            if (this.boundProfileIdx < 0) {
                this.boundProfileIdx = this.allocProfile(MODE_BOUND, 0, 0, 0, 0, 0, 0, false, "bound");
            }
            offs.push(this.registerBound(ctrl, reg.source, reg.fields, reg.poseKeys, this.boundProfileIdx));
        }
        if (offs.length > 0) ctrl.onDisposed(()=>{
            for (const off of offs)off();
        });
    }
    /**
     * @internal Low-level dead-reckoning primitive — forward-simulates
     * `instance` using a step function with scratch-snapshot + substep loop +
     * predict-then-smooth on read. Most consumers should pass a reckon
     * attach config to {@link attach} / {@link attachAll}; this is the
     * underlying implementation, exposed for cases where the declarative
     * config shape doesn't fit.
     */ trackStepped(instance, opts) {
        const substep = opts.substep ?? 16;
        const fields = opts.fields;
        const fieldIds = fields.map((f)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fieldIndexOf"])(instance, f));
        const step = opts.step;
        const clock = this.clock;
        // Default forward horizon = SNAPSHOT AGE, exactly.
        //
        // Age = `serverNow() − lastServerTime()` (current server time minus the
        // server-encode time of the latest patch) — the exact amount to forward
        // a remote entity to its CURRENT server position. Unlike a fixed RTT
        // proxy it's the true downstream age (~RTT/2 + buffering, not the full
        // round trip) and GROWS between patches (continuous, not
        // freeze-then-step).
        //
        // No lag compensation on top: offset-decay smoothing is steady-state
        // EXACT (only rebase discontinuities decay), so the displayed instant
        // IS serverNow — which is exactly what the input prefix stamps as
        // reckonTime. Any extra lead here desyncs display from stamp and the
        // server's lag-comp reads mis-aim by lead × velocity (enough to flip
        // knife-edge hit calls). Override `forwardMs` for a different
        // horizon (e.g. a collision read wanting extra look-ahead).
        const present = this.presentFn(); // serverNow(), or renderNow() under renderPresent
        const forwardMs = opts.forwardMs ?? (present ? ()=>{
            const stamp = clock.lastServerTime();
            return stamp > 0 ? Math.max(0, present() - stamp) : 0;
        } : ()=>0);
        const elapsedMs = opts.elapsedMs ?? present ?? (()=>performance.now());
        // Build `advance` once. It writes predicted fields into the SoA `out`
        // buffer (indexed by field position) — never a name-keyed object.
        const liveValues = instance[__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["$VALUES"]];
        // The SoA fast path is only valid when the instance actually stores its
        // field values in a dense `$values` array indexed by field index. Some
        // @colyseus/schema versions expose values ONLY through prototype getters
        // and leave `$values` empty (length 0) — `Array.isArray([])` is still
        // true, but reading `sv[fieldId]` then yields `undefined`, which a
        // Float64Array coerces to NaN (entity vanishes). Require the array to
        // actually cover every field we read; otherwise fall through to the
        // generic accessor-based snapshot, which reads via the getters.
        const fastPathOk = opts.snapshot === undefined && Array.isArray(liveValues) && fieldIds.every((id)=>id >= 0 && id < liveValues.length);
        let advance;
        if (fastPathOk) {
            // SoA fast path (decoded schema instances). The scratch is a pooled
            // instance of the same type; each frame we refill its `$values`
            // array BY INDEX from the live instance (no dynamic-key object
            // building → no V8 dictionary mode, no megamorphic keyed store),
            // let `step` mutate it through its accessors, then extract the
            // predicted fields BY INDEX. Fully monomorphic + zero allocation.
            const scratch = new instance.constructor();
            const sv = scratch[__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["$VALUES"]];
            advance = (live, fwd, out, endElapsed)=>{
                const lv = live[__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["$VALUES"]];
                for(let i = 0; i < lv.length; i++)sv[i] = lv[i];
                let remaining = fwd;
                // The scratch is the SNAPSHOT state (age `fwd` ago), so absolute
                // time runs from `endElapsed − fwd` and the LAST substep lands
                // exactly on `endElapsed` — time-SAMPLED fields (sinusoids,
                // cooldown snaps) then read the same instant the input stamp
                // claims. Starting at `endElapsed` instead would evaluate them
                // `fwd` ms (≈ one-way latency) in the future — a latency-scaled
                // desync the server's lag-comp read can't cancel.
                let elapsed = endElapsed - fwd;
                while(remaining > 0){
                    const stepMs = remaining < substep ? remaining : substep;
                    elapsed += stepMs;
                    // elapsed at the END of the substep: equivalent for
                    // integrated quantities, correct for time-sampled ones.
                    step(scratch, stepMs / 1000, elapsed);
                    remaining -= stepMs;
                }
                for(let k = 0; k < fieldIds.length; k++)out[k] = sv[fieldIds[k]];
            };
        } else {
            // Generic path: non-schema instance, a caller-supplied snapshot, or
            // (the common browser case) a decoded instance whose `$values` SoA is
            // empty so the fast path above didn't apply. Builds a fresh named
            // scratch each frame and extracts by name. When metadata is available
            // the per-field copy is UNROLLED (monomorphic, no eval — see
            // makeUnrolledSnapshot); otherwise a plain `{...instance}` spread
            // covers non-schema objects.
            const fieldNames = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scalarFieldNamesOf"])(instance);
            const snapshotFn = opts.snapshot ?? (fieldNames.length > 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeUnrolledSnapshot"])(fieldNames) : (e)=>({
                    ...e
                }));
            const names = [
                ...fields
            ];
            advance = (live, fwd, out, endElapsed)=>{
                const scratch = snapshotFn(live);
                let remaining = fwd;
                // Snapshot-relative absolute time — see the fast path above.
                let elapsed = endElapsed - fwd;
                while(remaining > 0){
                    const stepMs = remaining < substep ? remaining : substep;
                    elapsed += stepMs;
                    step(scratch, stepMs / 1000, elapsed);
                    remaining -= stepMs;
                }
                for(let k = 0; k < names.length; k++)out[k] = scratch[names[k]];
            };
        }
        return this.trackSimulated(instance, {
            fields,
            forwardMs,
            elapsedMs,
            smoothMs: opts.smoothMs,
            snap: opts.snap,
            advance
        });
    }
    trackSimulated(instance, opts) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        if (refId === undefined) {
            throw new Error("Predict.trackStepped(): instance has no refId — must run AFTER " + "the decoder delivers the instance (e.g. inside onAdd).");
        }
        const fields = opts.fields;
        const n = fields.length;
        const fieldIds = fields.map((f)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fieldIndexOf"])(instance, f));
        let maxId = 0;
        for (const id of fieldIds)if (id > maxId) maxId = id;
        const posOf = new Int8Array(maxId + 1).fill(-1);
        for(let k = 0; k < n; k++)if (fieldIds[k] >= 0) posOf[fieldIds[k]] = k;
        const smoothed = new Float64Array(n);
        for(let k = 0; k < n; k++)smoothed[k] = instance[fields[k]] ?? 0;
        // Default the absolute-time provider to the reckon present — serverNow,
        // or renderNow under renderPresent (matches the per-frame reckon).
        // `valueAt` overrides the end instant per call, so hit reads stay exact.
        const present = this.presentFn();
        const elapsedMs = opts.elapsedMs ?? present ?? (()=>performance.now());
        const state = {
            instance,
            fieldIds,
            posOf,
            forwardMs: opts.forwardMs,
            elapsedMs,
            advance: opts.advance,
            smoothMs: opts.smoothMs ?? 50,
            snap: opts.snap ?? 0,
            smoothed,
            out: new Float64Array(n),
            valueOut: new Float64Array(n),
            offset: new Float64Array(n),
            outPrev: new Float64Array(n),
            frameVel: new Float64Array(n),
            lastBaseT: NaN,
            lastApplyTime: -Infinity
        };
        this.simByRef.set(refId, state);
        return ()=>this.untrackSimulated(refId);
    }
    untrackSimulated(refId) {
        this.simByRef.delete(refId);
    }
    // --- High-level orchestration ----------------------------------------------
    /**
     * Attach prediction to a single schema instance via a declarative config.
     *
     * For collections, prefer {@link attachAll}. For a root-level instance
     * that arrives lazily, wrap this call in
     * `Callbacks.get(room).listen(state, "field", ..., true)`.
     */ attach(instance, config) {
        // A standalone attach is its own one-off group, labeled "(attach)".
        // Identical configs dedup under that label (so a hand-rolled loop over
        // many instances doesn't explode the profile table); for per-collection
        // isolation use attachAll, which labels the group by its key.
        const group = this.makeGroup("(attach)", config);
        return this.attachWithPlan(instance, this.planFor(group, instance));
    }
    /** One group per attach()/attachAll(): base plan built eagerly (so config
     *  errors throw at the call site, like before); per-type sub-plans lazy. */ makeGroup(label, config) {
        return {
            label,
            config,
            basePlan: this.buildGroupPlan(config, label),
            planByCtor: new Map()
        };
    }
    /** The plan for one child — the group's base plan unless the child's TYPE
     *  lacks some of the configured fields (those are dropped). Cached per
     *  constructor: homogeneous collections hit one entry. */ planFor(group, child) {
        const ctor = child.constructor;
        let plan = group.planByCtor.get(ctor);
        if (plan === undefined) {
            plan = this.resolveCtorPlan(group, child);
            group.planByCtor.set(ctor, plan);
        }
        return plan;
    }
    /**
     * Once per (group, constructor): drop fields the child type doesn't declare
     * (they'd subscribe to nothing and, in reckon scratch, read garbage). Mode
     * is the group's — the client's prediction mode is explicit, never inferred
     * from the schema. Returns the base plan when every field is present;
     * otherwise builds a `label:TypeName` sub-plan with its own profile.
     */ resolveCtorPlan(group, child) {
        const md = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["metadataOf"])(child);
        const typeName = child.constructor?.name || "?";
        const config = group.config;
        if (!isReckonAttachConfig(config)) {
            // Per-field smoothing map.
            if (md === undefined) return group.basePlan; // non-schema fixture
            const keys = Object.keys(config).filter((k)=>config[k] !== undefined);
            if (keys.every((k)=>typeof md[k] === "number")) return group.basePlan;
            const filtered = {};
            for (const k of keys)if (typeof md[k] === "number") filtered[k] = config[k];
            return this.buildGroupPlan(filtered, `${group.label}:${typeName}`);
        }
        const rcfg = config;
        let fields = rcfg.fields;
        if (md !== undefined) {
            const filtered = fields.filter((f)=>typeof md[f] === "number");
            if (filtered.length !== fields.length) fields = filtered;
        }
        if (fields === rcfg.fields) return group.basePlan; // all fields present
        return this.buildGroupPlan({
            ...rcfg,
            fields
        }, `${group.label}:${typeName}`);
    }
    /**
     * Resolve a group's profiles ONCE. Profiles are allocated via
     * {@link groupProfile} (labeled, never the mutable default #0), so every
     * child of the group shares the group's own profile and the panel can tune
     * it without bleeding into other groups.
     */ buildGroupPlan(config, label) {
        const fieldProfiles = [];
        if (isReckonAttachConfig(config)) {
            const rcfg = config;
            if (!Array.isArray(rcfg.fields)) {
                throw new Error("Predict.attach(): `fields` must be a numeric-key array.");
            }
            const effectiveMode = rcfg.mode ?? this.defaultMode;
            const step = rcfg.step ?? this.reckonDefaults.step;
            const isReckon = effectiveMode === "reckon";
            if (isReckon && typeof step !== "function") {
                throw new Error("Predict.attach(): reckon mode requires a 'step' function. " + "Either pass `step` in the attach config OR construct the Predict with " + "`Predict.get(room, { mode: 'reckon', step: yourStepFn })` so it can be inherited.");
            }
            // One profile for the whole group (all fields share it).
            const profileIdx = this.groupProfile({
                mode: effectiveMode,
                snap: rcfg.snap,
                smoothMs: rcfg.smoothMs
            }, label);
            for (const f of rcfg.fields)fieldProfiles.push({
                field: f,
                profileIdx,
                angle: rcfg.angle
            });
            return {
                label,
                isReckon,
                reckonFields: isReckon ? rcfg.fields : undefined,
                reckonStep: isReckon ? step : undefined,
                reckonSmoothMs: rcfg.smoothMs ?? this.reckonDefaults.smoothMs,
                reckonSubstep: rcfg.substep ?? this.reckonDefaults.substep,
                reckonSnap: rcfg.snap ?? this.reckonDefaults.snap,
                reckonSnapshot: rcfg.snapshot,
                fieldProfiles
            };
        }
        // Smoothing-only per-field map. Each field gets a profile (deduped
        // within the group by params), so `{ x:"lerp", vx:"extrapolate" }`
        // yields two group-labeled profiles → two panel sub-cards.
        const smoothing = config;
        for (const key of Object.keys(smoothing)){
            const value = smoothing[key];
            if (value === undefined) continue;
            const o = typeof value === "string" ? {
                mode: value
            } : value;
            fieldProfiles.push({
                field: key,
                profileIdx: this.groupProfile(o, label),
                angle: o.angle
            });
        }
        return {
            label,
            isReckon: false,
            fieldProfiles
        };
    }
    /** Attach one child using a pre-resolved {@link GroupPlan}. `forwardMs`
     *  overrides the reckon horizon for THIS instance only (e.g. the spawns
     *  store's per-entity input lead); omitted → snapshot age, as usual. */ attachToGroup(instance, plan, forwardMs) {
        const offs = [];
        if (plan.isReckon) {
            offs.push(this.trackStepped(instance, {
                fields: plan.reckonFields,
                step: plan.reckonStep,
                smoothMs: plan.reckonSmoothMs,
                substep: plan.reckonSubstep,
                snap: plan.reckonSnap,
                snapshot: plan.reckonSnapshot,
                forwardMs
            }));
        }
        for (const { field, profileIdx, angle } of plan.fieldProfiles){
            offs.push(this.trackWithProfile(instance, field, profileIdx, !!angle));
        }
        return ()=>{
            for (const f of offs)f();
        };
    }
    attachWithPlan(instance, plan) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        if (refId === undefined) {
            throw new Error("Predict.attach(): instance has no refId — attach must run AFTER " + "the decoder delivers the instance (e.g. inside onAdd).");
        }
        // No blanket detach: attachToGroup tracks each field idempotently (see
        // trackWithProfile), so this ADDS to whatever is already tracked on the
        // instance — a 2nd attachAll for other fields composes instead of clobbering.
        this.attachToGroup(instance, plan);
        return ()=>this.detachByRef(refId);
    }
    /** Detach a previously {@link attach}'d instance. No-op if not attached. */ detach(instance) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        if (refId !== undefined) this.detachByRef(refId);
    }
    detachByRef(refId) {
        // Data-driven teardown — no stored closures. slotByRef already maps the
        // instance to every field tracked on it (across however many attach calls),
        // so walk it and free each slot, then drop any reckon SimState. Snapshot the
        // keys: untrackSlot mutates perRef (and deletes the slotByRef entry when empty).
        const perRef = this.slotByRef.get(refId);
        if (perRef) {
            for (const field of [
                ...perRef.keys()
            ]){
                const slotIdx = perRef.get(field);
                if (slotIdx === undefined) continue;
                const bound = this.boundBySlot.get(slotIdx);
                if (bound !== undefined) {
                    // The ENTITY died while a controller overlay was live: tear down
                    // the overlay AND its stash — a recycled refId must not collide
                    // with a stale mapping. The controller's own dispose then finds
                    // the side entry gone and skips (its logic reads keep working
                    // off `me.world` until it's disposed).
                    this.freeStash(bound);
                    this.boundBySlot.delete(slotIdx);
                    this.freeSlots.push(slotIdx);
                    perRef.delete(field);
                } else {
                    this.untrackSlot(refId, field);
                }
            }
            if (perRef.size === 0) this.slotByRef.delete(refId);
        }
        this.simByRef.delete(refId);
    }
    attachAll(...args) {
        // Mirror Callbacks: `typeof args[0] === 'string'` ⇒ root variant.
        const rootForm = typeof args[0] === "string";
        const parent = rootForm ? undefined : args[0];
        const key = rootForm ? args[0] : args[1];
        const config = rootForm ? args[1] : args[2];
        // Resolve the group's base profile(s) ONCE — labeled by the collection
        // key so this group owns its profile and the panel tunes it in
        // isolation. Each child resolves through planFor: homogeneous
        // collections reuse the base plan; a type whose field set differs
        // (missing some configured fields) gets its own per-type sub-plan.
        const group = this.makeGroup(key, config);
        const tracked = new Set();
        const onAdd = (child)=>{
            this.attachWithPlan(child, this.planFor(group, child));
            tracked.add(child);
        };
        const onRemove = (child)=>{
            tracked.delete(child);
            this.detach(child);
        };
        const addOff = rootForm ? this.callbacks.onAdd(key, onAdd) : this.callbacks.onAdd(parent, key, onAdd);
        const removeOff = rootForm ? this.callbacks.onRemove(key, onRemove) : this.callbacks.onRemove(parent, key, onRemove);
        return ()=>{
            addOff?.();
            removeOff?.();
            for (const child of tracked)this.detach(child);
            tracked.clear();
        };
    }
    // --- Per-frame driver ------------------------------------------------------
    /**
     * Call once per render frame — the single per-frame driver for the whole
     * prediction stack. Returns your SEND BUDGET: how many fixed input steps are
     * due this frame — mutate + send exactly that many inputs through your input
     * handle (`for (n) { input.data.x = …; input.send(); }`), and the reconcilers
     * observe + predict each send. Besides pacing, the call reconciles + steps +
     * decays every {@link reconciler}/{@link sim} spawned here, advances
     * smoothing, and prunes every event channel/spawn store.
     *
     * Returns 0 while the fixed step is UNKNOWN: the rate is adopted from the
     * first {@link reconciler}/{@link sim} spawned here, so pre-spawn frames —
     * and passive smoothing-only Predicts — pace nothing. That is the send loop
     * self-gating before the local player exists, not an error; keep calling
     * `tick()` and the budget starts flowing the frame the controller spawns.
     *
     * ORDER WITHIN THE FRAME MATTERS: send the returned steps FIRST, then read
     * render values (`value()`/`pose()`). A read between this call and the frame's
     * sends is one fixed step stale — the interpolation clamps at the latest
     * applied step (never extrapolates), so late frames flat-top and fast objects
     * visibly stutter. The reconciler warns once when it detects that pattern.
     * Game logic that wants the exact predicted state (hit-reg, zone checks)
     * should read `.state`/`.world` instead, which this ordering doesn't affect.
     * In engines that run per-object update callbacks (rather than one frame
     * function), tick AND pump in the earliest registered callback — the frame
     * driver owns input; objects only read. `room.input()` returns the same
     * handle everywhere, so the driver and the entity that predicts through it
     * don't need to share plumbing.
     *
     * `now` defaults to `performance.now()`. When you drive from
     * `requestAnimationFrame`, pass ITS timestamp argument — not `performance.now()`
     * (or `room.clock.now()`) sampled inside the callback: the rAF timestamp is
     * vsync-aligned and evenly spaced, whereas an in-callback reading folds JS
     * scheduling jitter into the frame `dt`, which makes render interpolation advance
     * unevenly (motion looks "not smooth" though it never stutters). Pass it
     * explicitly, too, when ticking multiple Predicts in one frame so they share one
     * frame-time reference.
     */ tick(now = performance.now()) {
        this.renderTime = now;
        // Advance the room-wide fixed-step accumulator: elapsed render time → the
        // whole number of fixed input steps due this frame (returned to the caller).
        let steps = 0;
        const stepMs = this.fixedStepMs;
        if (stepMs !== undefined && stepMs > 0) {
            const dt = this.lastFrameNow < 0 ? 0 : now - this.lastFrameNow;
            this.stepAcc += dt;
            steps = Math.floor(this.stepAcc / stepMs);
            if (steps > Predict.MAX_STEPS_PER_FRAME) {
                this.stepAcc = 0; // hitch: emit a bounded count, drop the backlog
                steps = Predict.MAX_STEPS_PER_FRAME;
            } else {
                this.stepAcc -= steps * stepMs;
            }
        }
        this.lastFrameNow = now;
        // Drive children (reconcile + decay); each derives its own render
        // interpolation from `now`. Compact out any disposed ones in the same pass.
        const driven = this.driven;
        let live = 0;
        for(let i = 0; i < driven.length; i++){
            const d = driven[i];
            if (d.dead) continue;
            d.tick?.(now);
            d.prune?.();
            if (live !== i) driven[live] = d;
            live++;
        }
        if (live !== driven.length) driven.length = live;
        return steps;
    }
    // --- Event channels --------------------------------------------------------
    /**
     * Declare a typed optimistic-event CHANNEL — one logical event type
     * (a goal, a kill, a pickup) owned end-to-end: predicted from the sim
     * (`ctx.predict(channel, payload)` inside a reconciler `step`, replay-safe
     * by construction) or from UI (`channel.predict(payload)`), optimistic
     * feedback via `onPredict`, and settlement against the server:
     * `channel.confirm()` on the authoritative signal, or auto-reject once
     * the server has processed past the prediction without confirming (see
     * the channel header's SETTLEMENT notes).
     *
     * The channel OBJECT is the identity — no string key; call sites hold the
     * binding. Auto-driven by this Predict's {@link tick} — no manual
     * `prune()`.
     *
     *     const goals = predict.defineEvent<Team>({
     *         onPredict: (team) => { celebrate(team); hidePuck(); },
     *         onReject:  ()     => showPuck(),
     *     });
     *     // in the reconciler step:      if (crossed) ctx.predict(goals, team);
     *     // on the server's broadcast:   room.onMessage("score", () => goals.confirm());
     *
     * When the authoritative signal is a STATE change rather than a broadcast,
     * declare it with `confirmOn` and skip the hand-wired listener entirely —
     * the Predict subscribes it for you and tears it down with the channel:
     *
     *     const breaks = predict.defineEvent<string>({
     *         label: "break",
     *         // when a crate's `alive` flips false, confirm the entry keyed
     *         // by that crate's collection key
     *         confirmOn: { collection: "crates", field: "alive", equals: false },
     *     });
     *
     * Also `{ collection, event: "add" | "remove" }` when membership itself is
     * the signal (`add` settles keyless, optionally gated by `mine`). The
     * field/remove forms require channel entry keys (the `uniqueBy` output) to
     * BE collection keys; root-level collections only — mismatched schemes
     * confirm manually (see the `confirmOn` module header).
     */ defineEvent(opts) {
        const { confirmOn, ...channelOpts } = opts;
        const channel = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEventChannel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PredictedEventChannel"](channelOpts, this.clock ?? null);
        if (confirmOn !== undefined) {
            if (confirmOn.mine !== undefined && typeof this.sessionSource.sessionId !== "string") {
                throw new Error(`Predict.defineEvent: confirmOn.mine ("${confirmOn.mine}") requires a Predict ` + `built from a Room (it compares against room.sessionId); confirm manually instead.`);
            }
            channel._addTeardown((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$confirmOn$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["wireConfirmOn"])(this.callbacks, channel, confirmOn, ()=>this.sessionSource.sessionId));
        }
        this.driven.push(channel);
        return channel;
    }
    /**
     * Spawn a {@link PredictedSpawns} store for a collection of optimistically-
     * spawned entities (bullets, grenades, dropped items) at `state[key]`.
     *
     * Predicted locals (added via the store's `spawn(...)`) render instantly;
     * when the authoritative entity arrives in the collection it's correlated
     * to the matching prediction and the two collapse onto one logical entry
     * with a stable `id`. Wires the collection's `onAdd`/`onRemove` and is
     * auto-ticked + pruned by this Predict's {@link tick} — no separate drive.
     *
     * With `fields`, the store also owns the collection's **motion** (no
     * separate `attachAll` needed): confirmed entities are dead-reckoned with
     * the same `step` that advances pending locals, and `store.value(entry,
     * field)` is one read path across the whole life of the entity. Foreign
     * entities reckon to server-present; with `spawnTime`, owned ones reckon
     * to server-present *plus the measured input lead*, so the authoritative
     * entity continues the prediction's flight on the shooter's timeline —
     * no snap-back at the handoff, and the rendered trajectory is the one a
     * favor-the-shooter lag-comp hit test actually judges.
     *
     * The server element type `S` is inferred from `key`; the predicted-local
     * shape defaults to `Partial<S>`, so `spawn()` is type-checked against the
     * server fields with no annotations. To carry client-only fields, annotate
     * a callback param (e.g. `step: (b: { x: number; speed: number }, dt) => …`)
     * and `L` is inferred from it. An optional `data` factory gives each entry
     * an auto-cleaned render-scratch slot (`entry.data: D`), inferred from its
     * return.
     *
     * ```ts
     * const rockets = predict.spawns("rockets", {
     *   owned:     r => r.owner === room.sessionId,      // r: Rocket
     *   spawnTime: r => r.bornMs,                        // exact per-shot lead
     *   step:      stepRocket,                           // shared client/server sim
     *   fields:    ["x", "z"],                           // reckon confirmed entities
     * });
     * // on the predicted fire (live input step):
     * rockets.spawn({ x, z, heading });
     * // render — one path, handoff-invisible, keyed on the stable entry id:
     * for (const e of rockets.entries()) {
     *   draw(e.id, rockets.value(e, "x"), rockets.value(e, "z"));
     * }
     * ```
     */ spawns(key, opts = {}) {
        const store = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedSpawns$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PredictedSpawns"](opts, this.clock ?? null);
        // Reckon wiring (`fields` + `step`): every confirmed entity gets a
        // regular reckon attach (group-labeled by the collection key, like
        // attachAll) whose forward horizon is snapshot age plus the entry's
        // measured input lead — 0 for foreign entities (server-present, same
        // as an attachAll reckon), the exact per-spawn uplink for owned ones
        // (see PredictedSpawnsOptions.spawnTime). An owned projectile thus
        // keeps flying the shooter's timeline through the handoff — the view
        // the server's lag-comp rewind judges.
        const fields = opts.fields;
        const step = opts.step;
        const group = fields !== undefined && step !== undefined ? this.makeGroup(String(key), {
            mode: "reckon",
            fields,
            step: step,
            smoothMs: opts.smoothMs ?? 0,
            substep: opts.substep
        }) : undefined;
        const untrack = group !== undefined ? new Map() : undefined;
        const clock = this.clock;
        store.attach((onAdd, onRemove)=>{
            const addOff = this.callbacks.onAdd(key, (server, k)=>{
                onAdd(server, k);
                if (group === undefined || untrack.has(server)) return; // decoder re-fire
                const lead = store.entryFor(server)?.leadMs ?? 0;
                const forwardMs = clock ? ()=>{
                    const stamp = clock.lastServerTime();
                    const age = stamp > 0 ? Math.max(0, clock.serverNow() - stamp) : 0;
                    return Math.max(0, age + lead);
                } : ()=>Math.max(0, lead);
                untrack.set(server, this.attachToGroup(server, this.planFor(group, server), forwardMs));
            });
            const removeOff = this.callbacks.onRemove(key, (server, k)=>{
                untrack?.get(server)?.();
                untrack?.delete(server);
                onRemove(server, k);
            });
            return ()=>{
                addOff?.();
                removeOff?.();
                if (untrack !== undefined) {
                    for (const off of untrack.values())off();
                    untrack.clear();
                }
            };
        });
        if (group !== undefined) {
            // route store.value() confirmed reads through the reckon slots
            store.bindReader((server, field)=>this.value(server, field));
        }
        this.driven.push(store);
        return store;
    }
    /**
     * The canonical interpolation `delay` (the default profile's `delay`, from
     * `Predict.get(room, { delay })` / {@link setDefaults}). Lag compensation's
     * `renderDelay` is bound to this by {@link reconciler}/{@link sim} so the
     * interp buffer the remotes render at and the server's rewind instant are
     * derived from ONE number — they can't drift out of sync.
     */ canonicalDelay() {
        return this.profileBuf[DEFAULTS_PROFILE * PROFILE_STRIDE + P_DELAY];
    }
    /**
     * Bind lag-comp's `renderDelay` on the input handle to this Predict's lerp
     * `delay` (the impl's `bindRenderDelay`) so the remote interp
     * buffer and the server's rewind instant stay one value — no "keep the two
     * delays equal" footgun. `instanceof`-narrowed (not cast), so a non-impl
     * input (a test mock) is a no-op; an explicit `room.input({ renderDelay })`
     * still wins inside `bindRenderDelay`.
     */ bindInputRenderDelay(input) {
        if (input instanceof __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$input$2f$InputHandle$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputHandleImpl"]) {
            input.bindRenderDelay(()=>this.canonicalDelay());
        }
    }
    /**
     * Spawn a {@link Reconciler} for a locally-controlled entity — server-
     * reconciled rollback (predict your inputs immediately, rewind to the server's
     * authoritative state + replay unacked inputs, smoothly correcting
     * mispredictions). The active counterpart to this Predict's passive modes: use
     * `reconciler()` for the entity you control, lerp/reckon for the rest.
     *
     * A pure OBSERVER of `opts.input` (`room.input(...)`): you mutate + send through
     * the handle (`input.data.x = …; input.send()`) and the reconciler steps each
     * send + reads the server ack (`input.lastProcessed`) off it — the channel you
     * send on is the channel that knows what's acked. `predict.tick(now)` returns
     * how many fixed input steps are due this frame.
     *
     * Auto-ticked by this Predict's {@link tick} each frame (reconcile + smooth-
     * correction decay) — no separate `tick()` call to forget.
     *
     * `opts.fields` defaults to every scalar field of `instance`'s schema — see
     * {@link Reconciler} for the derivation and when to subset explicitly.
     */ reconciler(instance, opts) {
        // `S` is inferred from `instance`; the wire input type `W` from
        // `opts.input` (the SDK's `InputHandle<W>` — e.g. `room.input<MoveInput>()`).
        // The command type is then `Data<W>` (the input's data fields), so neither
        // type argument needs to be written at the call site, and `step`'s `cmd`
        // is contextually typed.
        // Inject this Predict's clock so ctx.reckonTime resolves its unstamped
        // fallback (serverNow) inside the library; an explicit opts.clock wins.
        const recon = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$reconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Reconciler"](instance, {
            ...opts,
            clock: opts.clock ?? this.clock
        });
        this.adoptFixedStep(recon.stepMs);
        this.bindInputRenderDelay(opts.input);
        // One read idiom: predict.value(instance, field) reads THIS controller's
        // pose while it's alive (raw fallback before spawn / after dispose).
        this.installBoundOverlay(recon);
        this.driven.push(recon);
        return recon;
    }
    /**
     * Spawn a {@link SimReconciler} for the entity (or entities) your inputs
     * control — server-reconciled rollback (predict immediately, rewind to the
     * server's authoritative state + replay unacked inputs, smoothly correcting
     * mispredictions) — when their truth isn't a single flat scalar `fields` list:
     * composite scalar state across several schema instances (a paddle + the puck
     * it strikes, reconciled together), or an opaque physics-engine handle. Your
     * `world` owns the state via `step` / `adopt` / `pose` callbacks; the controller
     * runs the rollback loop and passes the world handle to each.
     *
     * Like {@link reconciler}, it OBSERVES `opts.input` (you mutate + send through
     * the handle; `predict.tick(now)` returns the fixed-step count) and is
     * auto-ticked by this Predict's {@link tick} each frame (reconcile + decay).
     */ sim(opts) {
        // wire input `W` from `opts.input`, pose `P` from `opts.pose` ({} when the
        // world is fully bound and no custom pose exists), world handle `E` from
        // `opts.world` — none written at the call site, and `step`'s `cmd` is
        // contextually typed `Data<W>`.
        // Clock injection: same as reconciler() — resolves ctx.reckonTime's fallback.
        const ctl = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$simReconciler$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SimReconciler"]({
            ...opts,
            clock: opts.clock ?? this.clock
        });
        this.adoptFixedStep(ctl.stepMs);
        this.bindInputRenderDelay(opts.input);
        // One read idiom: bound world entries register into predict.value(instance,
        // field) — the render layer stops caring which strategy backs an entity.
        this.installBoundOverlay(ctl);
        this.driven.push(ctl);
        return ctl;
    }
    /**
     * Adopt a spawned reconciler's fixed step as this Predict's room-wide pacing
     * rate (the first one wins — the server has a single tick rate). Warns if a
     * later reconciler advertises a different step, since one accumulator can't
     * pace two rates.
     */ adoptFixedStep(stepMs) {
        if (this.fixedStepMs === undefined) {
            this.fixedStepMs = stepMs;
            // Start the count accumulator fresh with the reconciler just created:
            // if this accumulator had been advancing since Predict.get, the first
            // tick after spawn would emit a BURST of steps (all the time elapsed
            // before there was anything to predict), which the app would send at
            // once. (The render clock itself self-corrects any phase offset — see
            // RollbackController.catchUp — so this is about the burst, not smoothness.)
            this.stepAcc = 0;
            this.lastFrameNow = -1;
            return;
        }
        if (Math.abs(this.fixedStepMs - stepMs) > 1e-6) {
            console.warn(`@colyseus/sdk Predict: a reconciler's fixed step (${stepMs}ms) differs from ` + `this Predict's (${this.fixedStepMs}ms). tick() paces one rate for the whole room; ` + `use a separate Predict per rate.`);
        }
    }
    // --- Reads -----------------------------------------------------------------
    /**
     * Smoothed/predicted RENDER value for a numeric field — the one read idiom:
     * passively-smoothed entities (lerp/reckon/…) and instances bound by a
     * live `reconciler()`/`sim()` controller all resolve here (the controller
     * overlays the slot while it lives; dispose restores the passive slot or
     * the raw fallback). Falls through to raw `instance[field]` if the field
     * isn't being tracked — so the read is valid across the entity's whole
     * lifecycle. For game logic on a controlled entity read the controller's
     * `.state`/`.world` instead (exact, no smoothing offset).
     */ value(instance, field) {
        // Hot read: refId (one symbol load) + two Map.gets (refId → field name →
        // slot). No schema metadata, no name→index resolution. Dispatch is then
        // a pure `(slotId) -> number` computer; the slot is self-describing via
        // SLOT_REF / SLOT_FIELD so the instance/string never reach the computer.
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        const slotIdx = refId === undefined ? undefined : this.slotByRef.get(refId)?.get(field);
        // `field: NumericKeys<T>` proves `instance[field]` is `number`.
        if (slotIdx === undefined) return instance[field];
        const profileIdx = this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_PROFILE] | 0;
        return this.profileComputers[profileIdx](slotIdx);
    }
    /**
     * RAW reckoned value at an ARBITRARY server-time instant `time`
     * (server-clock ms) — the reckoned position WITHOUT the decaying
     * smooth-correction offset that {@link value} adds for rendering.
     *
     * Use this for GAME LOGIC (collision / hit tests), and {@link value} for
     * RENDERING. The offset exists only to hide snapshot-rebase pops on screen;
     * feeding it into a hit test makes the client judge an overlap against a
     * position a few cm off the physical prediction, which flips knife-edge
     * stomp/hit calls vs the server (the server reads the exact timeline, no
     * offset). Controller-bound fields' exact predicted state lives on the
     * controller (`me.state` / `me.world`), not behind this read.
     *
     * For client-side collision/hit prediction, sample remote entities at the
     * input's `ctx.reckonTime` (the instant the server rewinds to) so the client's
     * hit call matches the server's lag-comp read BY CONSTRUCTION — on the live
     * step AND deterministically on rollback replay (same `time` per seq). For
     * logic reads at the present instant outside a step, pass
     * `room.clock.serverNow()`.
     *
     * Perf: the render read's per-frame reckon is cached; `valueAt` re-runs the
     * forward projection on EVERY call. Hot per-frame consumers should batch
     * with {@link readAt} — one projection per instance instead of one per field.
     *
     * Reckons FORWARD from the latest server snapshot to `time`: integrates the
     * tracked `step` from `lastServerTime()` to `time`, evaluating time-sampled
     * formulas (sinusoids, cooldown snaps) at `time`. The SDK keeps no per-entity
     * history, so `time ≤ lastServerTime()` CLAMPS to the snapshot (reckoning
     * into the past is the server rewind buffer's job — a non-reckonable discrete
     * motion you replay backward must be reconstructed from its own schedule). On
     * the live step `time = reckonTime ≈ serverNow() > lastServerTime()`, so it's
     * exact. Non-reckon / untracked fields ignore `time` and return {@link value}.
     */ valueAt(instance, field, time) {
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        const slotIdx = refId === undefined ? undefined : this.slotByRef.get(refId)?.get(field);
        if (slotIdx === undefined) return instance[field];
        const i = slotIdx * SLOT_STRIDE;
        const profileIdx = this.slotBuf[i + SLOT_PROFILE] | 0;
        // Only reckon depends on the instant; lerp/damped/extrapolate/raw don't.
        if (this.profileComputers[profileIdx] !== this.computeReckon) {
            return this.profileComputers[profileIdx](slotIdx);
        }
        const sim = this.simByRef.get(this.slotBuf[i + SLOT_REF]);
        if (sim !== undefined) {
            const fieldId = this.slotBuf[i + SLOT_FIELD] | 0;
            const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
            if (pos >= 0) {
                // Forward from the latest snapshot to `time` (clamped ≥ 0), absolute
                // end = `time`. Into `valueOut` so the per-frame render reckon
                // (out/smoothed/offset) is untouched. Raw — no smooth offset.
                const base = this.clock?.lastServerTime?.() ?? NaN;
                const fwd = Number.isNaN(base) ? 0 : Math.max(0, time - base);
                sim.advance(sim.instance, fwd, sim.valueOut, time);
                return sim.valueOut[pos];
            }
        }
        return this.slotBuf[i + SLOT_V1];
    }
    /**
     * Batch {@link value} reads — the render value of each listed field written
     * into one object. The `fields` YOU list define the result's shape
     * (`Record<field, number>`). Pass `out` to fill (and return) a reused
     * scratch instead of allocating — its properties beyond `fields` are left
     * untouched, so a scratch can carry extra context (an `alive` flag, say).
     * Mirrors the server's `seen.read` — the same batch-read concept on both
     * sides of the wire.
     *
     * Hot-path guidance (per-frame loops): hoist `fields` as a module-level
     * const and reuse the scratch — a fresh array or object literal per frame
     * allocates. The batch resolves the instance's ref once for the whole
     * group, then reads each field through the same computers as {@link value}.
     */ read(instance, fields, out) {
        const o = out ?? {};
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        const fieldMap = refId === undefined ? undefined : this.slotByRef.get(refId);
        for(let i = 0; i < fields.length; i++){
            const field = fields[i];
            const slotIdx = fieldMap?.get(field);
            o[field] = slotIdx === undefined ? instance[field] // untracked → live, as value()
             : this.profileComputers[this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_PROFILE] | 0](slotIdx);
        }
        return o;
    }
    /**
     * Batch {@link valueAt} reads — every listed field sampled at the same
     * server-time instant `time`, with {@link read}'s scratch contract.
     *
     * For client-side hit prediction, sample a remote's pose at the input's
     * `ctx.reckonTime` in one call: the batch runs the forward reckon
     * integration ONCE per instance instead of once per field, so a
     * four-field pose read costs one `step` walk, not four. Non-reckon and
     * untracked fields ignore `time`, exactly like {@link valueAt}.
     */ readAt(instance, fields, time, out) {
        const o = out ?? {};
        const refId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(instance);
        const fieldMap = refId === undefined ? undefined : this.slotByRef.get(refId);
        let sim;
        let advanced = false; // one advance per batch — the instance has one sim
        for(let i = 0; i < fields.length; i++){
            const field = fields[i];
            const slotIdx = fieldMap?.get(field);
            if (slotIdx === undefined) {
                o[field] = instance[field];
                continue;
            }
            const s = slotIdx * SLOT_STRIDE;
            const profileIdx = this.slotBuf[s + SLOT_PROFILE] | 0;
            // Only reckon depends on the instant; other modes read as value().
            if (this.profileComputers[profileIdx] !== this.computeReckon) {
                o[field] = this.profileComputers[profileIdx](slotIdx);
                continue;
            }
            if (!advanced) {
                advanced = true;
                sim = this.simByRef.get(this.slotBuf[s + SLOT_REF]);
                if (sim !== undefined) {
                    // Same window as valueAt: forward from the snapshot (clamped ≥ 0)
                    // into `valueOut`, leaving the per-frame render reckon untouched.
                    const base = this.clock?.lastServerTime?.() ?? NaN;
                    const fwd = Number.isNaN(base) ? 0 : Math.max(0, time - base);
                    sim.advance(sim.instance, fwd, sim.valueOut, time);
                }
            }
            if (sim !== undefined) {
                const fieldId = this.slotBuf[s + SLOT_FIELD] | 0;
                const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
                if (pos >= 0) {
                    o[field] = sim.valueOut[pos];
                    continue;
                }
            }
            o[field] = this.slotBuf[s + SLOT_V1];
        }
        return o;
    }
    /**
     * Exponential smoothing toward the latest server value (`v1`). Reads
     * `smoothMs` from the slot's profile.
     */ computeDamped = (slotIdx)=>{
        const buf = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        const pBuf = this.profileBuf;
        const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
        const now = this.renderTime;
        const v1 = buf[i + SLOT_V1];
        const lastT = buf[i + SLOT_AUX_T];
        const dtFrame = now - lastT;
        buf[i + SLOT_AUX_T] = now;
        let damped = buf[i + SLOT_AUX_V];
        if (dtFrame > 0) {
            const tau = pBuf[pBase + P_SMOOTH_MS];
            const k = tau > 0 ? 1 - Math.exp(-dtFrame / tau) : 1; // 0 = snap
            damped += (v1 - damped) * k;
            buf[i + SLOT_AUX_V] = damped;
        }
        return damped;
    };
    /**
     * Canonical entity interpolation:
     *   1. Render at `target = now - delay` (delay sized so the snapshot
     *      ring almost always brackets the target).
     *   2. Find the latest pair (k, k+1) with ts(k) <= target.
     *   3. Lerp between them. On underrun (target past newest snapshot) or
     *      warmup (only one snapshot), hold at the newest sample — *don't*
     *      extrapolate. Extrapolation here is what produced the "flickery"
     *      feel; bracketing changes happen at predictable render-time
     *      crossings, not at jittered packet arrivals.
     *   4. Optionally chase the result with an output spring (`smoothMs`,
     *      default 0 = off) — display-side velocity continuity for imperfect
     *      snapshot streams; see {@link SmoothingOptions.smoothMs}.
     */ computeLerp = (slotIdx)=>{
        const raw = this.computeLerpRaw(slotIdx);
        const buf = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        const tau = this.profileBuf[(buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE + P_LERP_SMOOTH_MS];
        const now = this.renderTime;
        if (tau <= 0) {
            // Spring off (the default) — pin the state to the raw output so a
            // runtime smoothMs enable starts from here instead of gliding in
            // from wherever the spring last rested.
            buf[i + SLOT_AUX_V] = raw;
            buf[i + SLOT_LERP_PREV] = raw;
            buf[i + SLOT_AUX_T] = now;
            return raw;
        }
        const lastT = buf[i + SLOT_AUX_T];
        const dt = now - lastT;
        if (dt <= 0) return buf[i + SLOT_AUX_V]; // same-frame re-read
        // Exact first-order-hold step for a linearly-varying target (τ = smoothMs):
        //   y(dt) = u1 − s·τ + (y0 − u0 + s·τ)·e^(−dt/τ),  s = (u1 − u0)/dt
        // Frame-rate independent: a steady mover renders with a constant s·τ
        // trail at any fps (a per-frame EMA's trail varies with frame rate),
        // which also lets a rewind-side reproduction match it in closed form.
        const u0 = buf[i + SLOT_LERP_PREV];
        const y0 = buf[i + SLOT_AUX_V];
        const kdt = dt / tau;
        const trail = (raw - u0) / kdt;
        const y = raw - trail + (y0 - u0 + trail) * Math.exp(-kdt);
        buf[i + SLOT_AUX_V] = y;
        buf[i + SLOT_LERP_PREV] = raw;
        buf[i + SLOT_AUX_T] = now;
        return y;
    };
    /** Steps 1–3 of {@link computeLerp} — the undamped interpolant. */ computeLerpRaw(slotIdx) {
        const buf = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        const pBuf = this.profileBuf;
        const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
        const now = this.renderTime;
        const count = buf[i + SLOT_RING_COUNT] | 0;
        if (count === 0) return buf[i + SLOT_V1];
        const head = buf[i + SLOT_RING_HEAD] | 0;
        const ringBase = i + SLOT_RING_BASE;
        const start = (head - count + RING_CAP) % RING_CAP;
        const newestPhys = (start + count - 1) % RING_CAP;
        const newestOff = ringBase + newestPhys * 2;
        if (count === 1) return buf[newestOff + 1];
        // Render at the SAME instant the server's lag-comp rewinds to — the input's
        // renderTime = serverNow − renderDelay − rtt/2. On the server-time axis (clock
        // present) that `− rtt/2` must be explicit; the arrival axis got it implicitly from
        // transit. delay == renderDelay, so display == rewind → exact "what you see is what
        // you hit", AND jitter-immune (off the jitter-free server-stamped sample times).
        const delay = pBuf[pBase + P_DELAY];
        const target = this.clock && this.clock.lastServerTime() > 0 ? this.clock.serverNow() - delay - this.clock.smoothedRtt() / 2 : now - delay;
        const oldestOff = ringBase + start * 2;
        if (target <= buf[oldestOff]) return buf[oldestOff + 1];
        if (target >= buf[newestOff]) return buf[newestOff + 1];
        // Walk backwards from second-newest. Typical k is `count - 2` ⇒ O(1).
        let k = count - 2;
        let phys = (start + k) % RING_CAP;
        while(k > 0){
            const tk = buf[ringBase + phys * 2];
            if (tk <= target) break;
            k--;
            phys = phys === 0 ? RING_CAP - 1 : phys - 1;
        }
        const aOff = ringBase + phys * 2;
        const bPhys = phys + 1 >= RING_CAP ? 0 : phys + 1;
        const bOff = ringBase + bPhys * 2;
        const tA = buf[aOff], tB = buf[bOff];
        const span = tB - tA;
        if (span <= 0) return buf[bOff + 1];
        const u = (target - tA) / span;
        const vA = buf[aOff + 1], vB = buf[bOff + 1];
        return vA + (vB - vA) * u;
    }
    /**
     * Ring-driven forward projection with predict-then-smooth output EMA.
     *   1. Anchor on the ring's newest snapshot.
     *   2. Slope from a 2-step lookback in the ring (~2 tick intervals)
     *      when available, else last-2 fallback.
     *   3. raw = anchor + slope · clamp(now − anchor.t, 0, maxExtrapolate).
     *   4. EMA-blend raw → smoothed using `smoothMs` (0 disables → return raw).
     */ computeExtrapolate = (slotIdx)=>{
        const buf = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        const pBuf = this.profileBuf;
        const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
        const now = this.renderTime;
        const count = buf[i + SLOT_RING_COUNT] | 0;
        if (count === 0) return buf[i + SLOT_V1];
        const head = buf[i + SLOT_RING_HEAD] | 0;
        const ringBase = i + SLOT_RING_BASE;
        const start = (head - count + RING_CAP) % RING_CAP;
        const newestPhys = (start + count - 1) % RING_CAP;
        const newestOff = ringBase + newestPhys * 2;
        const newestT = buf[newestOff];
        const newestV = buf[newestOff + 1];
        let raw;
        if (count === 1) {
            raw = newestV;
        } else {
            const steps = count >= 3 ? 2 : 1;
            const lbPhys = (start + count - 1 - steps + RING_CAP) % RING_CAP;
            const lbOff = ringBase + lbPhys * 2;
            const lbT = buf[lbOff];
            const lbV = buf[lbOff + 1];
            const dt = newestT - lbT;
            if (dt <= 0) {
                raw = newestV;
            } else {
                const slope = (newestV - lbV) / dt;
                const maxExt = pBuf[pBase + P_MAX_EXTRAPOLATE];
                let ahead = now - newestT;
                if (ahead < 0) ahead = 0;
                else if (ahead > maxExt) ahead = maxExt;
                raw = newestV + slope * ahead;
            }
        }
        // Predict-then-smooth. Reuses SLOT_AUX_V / SLOT_AUX_T (damped is the
        // other consumer; the two modes can't share a slot).
        const lastT = buf[i + SLOT_AUX_T];
        buf[i + SLOT_AUX_T] = now;
        const tau = pBuf[pBase + P_SMOOTH_MS];
        if (tau <= 0) {
            buf[i + SLOT_AUX_V] = raw;
            return raw;
        }
        const dtFrame = now - lastT;
        let smoothed = buf[i + SLOT_AUX_V];
        if (dtFrame > 0) {
            const k = 1 - Math.exp(-dtFrame / tau);
            smoothed += (raw - smoothed) * k;
            buf[i + SLOT_AUX_V] = smoothed;
        }
        return smoothed;
    };
    /**
     * Dead-reckoning dispatch. Recovers (refId, fieldId) from the slot, finds
     * the `SimState` registered by `trackStepped`, and runs predict-then-smooth.
     * If the slot's profile flipped to reckon at runtime but no SimState was
     * ever allocated (e.g. attach was smoothing-only), falls back to the latest
     * server value mirrored in SLOT_V1 — degraded but functional, no object
     * access.
     */ computeReckon = (slotIdx)=>{
        const buf = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        const refId = buf[i + SLOT_REF];
        const fieldId = buf[i + SLOT_FIELD] | 0;
        const sim = this.simByRef.get(refId);
        if (sim !== undefined) {
            // posOf maps fieldId → SoA position in one array index (no indexOf).
            const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
            if (pos >= 0) return this.applySimulation(sim, pos);
        }
        return buf[i + SLOT_V1];
    };
    /**
     * Raw dispatch — return the latest server value as-is, no smoothing/
     * prediction. SLOT_V1 mirrors the latest sample on every update, so this
     * needs no object access. The slot ring still receives samples from the
     * listener (so a panel flip back to a smoothing mode works without
     * re-attach), but they're unused while raw is active.
     */ computeRaw = (slotIdx)=>{
        return this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_V1];
    };
    /**
     * Bound-overlay dispatch — the slot's value is a rollback controller's
     * interpolated + smooth-corrected pose read (`ctrl.value(poseKey)`). Same
     * dispatch class as reckon's `simByRef` read: one side-table lookup, then
     * the controller read — which also runs the read-before-pump bookkeeping,
     * so `predict.value(entity, f)` and `me.value(f)` warn identically.
     */ computeBound = (slotIdx)=>{
        const e = this.boundBySlot.get(slotIdx);
        return e !== undefined ? e.ctrl.value(e.key) : this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_V1];
    };
    // --- Internal smoothing math -----------------------------------------------
    /** `pos` indexes the SoA buffers (`sim.smoothed` / `sim.out`).
     *
     * Predict + OFFSET-DECAY smoothing (not an EMA chase): the display is
     * `out + offset`. Between snapshots the forward sim is continuous, so the
     * display moves at the target's full velocity — STEADY-STATE EXACT, no
     * systematic lag on a moving entity (an EMA chasing a mover lags it by
     * ~v × smoothMs forever — enough to flip knife-edge hit calls vs the
     * server, which always reads the exact timeline). When a new SNAPSHOT
     * rebases the sim and the trajectory jumps (a real misprediction), the
     * discontinuity is captured into `offset` and decays out — the pop-hiding
     * the smoothing exists for. Same construction as the Reconciler's
     * error-decay for the local player.
     *
     * Without a clock (`lastBaseT` stays NaN — rebase undetectable), falls
     * back to the EMA chase. */ applySimulation(sim, pos) {
        const now = this.renderTime;
        // Run `advance` once per render frame per instance, even if value() is
        // called for several fields. All math is indexed Float64Array access —
        // monomorphic, no per-frame allocation, no dynamic-key (megamorphic) hits.
        if (sim.lastApplyTime !== now) {
            const out = sim.out;
            const sm = sim.smoothed;
            const off = sim.offset;
            const n = sm.length;
            const baseT = this.clock?.lastServerTime?.() ?? NaN;
            sim.advance(sim.instance, sim.forwardMs(), out, sim.elapsedMs());
            const first = sim.lastApplyTime === -Infinity;
            if (first || sim.smoothMs <= 0) {
                for(let k = 0; k < n; k++){
                    off[k] = 0;
                    sm[k] = out[k];
                }
            } else if (!Number.isNaN(baseT)) {
                const dtMs = Math.max(0, Math.min(now - sim.lastApplyTime, 100));
                if (baseT !== sim.lastBaseT && !Number.isNaN(sim.lastBaseT)) {
                    // REBASE: a new snapshot re-seeded the forward sim. `out`
                    // forwards by SNAPSHOT AGE, so across a clean patch it's
                    // already continuous — it just advanced one frame of REAL
                    // motion (≈ frameVel·dt). Subtract that expected motion so
                    // ONLY a genuine snapshot correction lands in the offset;
                    // without it every patch mis-reads v·dt of motion as a
                    // discontinuity (a per-patch sawtooth, amplitude independent
                    // of the decay rate). Past `snap` it's a teleport: pop.
                    const snap = sim.snap;
                    const vel = sim.frameVel;
                    for(let k = 0; k < n; k++){
                        const d = sm[k] + vel[k] * dtMs - out[k];
                        off[k] = snap > 0 && Math.abs(d) > snap ? 0 : d;
                    }
                } else if (dtMs > 0) {
                    // Clean frame: record per-ms motion for the next rebase's
                    // expected-motion term.
                    const outPrev = sim.outPrev, vel = sim.frameVel;
                    for(let k = 0; k < n; k++)vel[k] = (out[k] - outPrev[k]) / dtMs;
                }
                const decay = Math.exp(-dtMs / sim.smoothMs);
                for(let k = 0; k < n; k++){
                    off[k] *= decay;
                    sm[k] = out[k] + off[k];
                }
            } else {
                // No clock → no rebase signal: legacy predict-then-smooth EMA.
                const dtMs = Math.max(0, Math.min(now - sim.lastApplyTime, 100));
                const kk = 1 - Math.exp(-dtMs / sim.smoothMs);
                for(let k = 0; k < n; k++)sm[k] += (out[k] - sm[k]) * kk;
            }
            const outPrev = sim.outPrev;
            for(let k = 0; k < n; k++)outPrev[k] = out[k];
            sim.lastBaseT = baseT;
            sim.lastApplyTime = now;
        }
        return sim.smoothed[pos];
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/confirmOn.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "wireConfirmOn",
    ()=>wireConfirmOn
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/**
 * Declarative confirm binding for predicted event channels — the `confirmOn`
 * option of `predict.defineEvent`.
 *
 * Most channels confirm from the same authoritative signal shape: "this
 * collection entry's field flipped" (a crate's `alive`, a box's `active`), or
 * the collection membership change IS the signal (a banana appearing /
 * disappearing). `confirmOn` absorbs that wiring: the owning Predict
 * subscribes the schema listeners and calls `channel.confirm(...)` on the
 * channel's behalf, tearing them down with the channel.
 *
 * Three variants, all **data** (a collection name, a field name, an expected
 * value) — deliberately no predicate closures, so the binding serializes and
 * ports to non-JS clients as a plain struct:
 *
 *     confirmOn: { collection: "crates",  field: "alive", equals: false }
 *     confirmOn: { collection: "bananas", event: "remove" }
 *     confirmOn: { collection: "bananas", event: "add", mine: "owner" }
 *
 *   - **field-flip** — when a child's `field` becomes `equals`, confirm the
 *     entry keyed by that child's COLLECTION key. Requires channel entry keys
 *     (the `uniqueBy` output) to BE collection keys; mismatched schemes stay
 *     manual.
 *   - **`event: "remove"`** — the child's removal confirms the entry keyed by
 *     the removed key.
 *   - **`event: "add"`** — a child's arrival confirms KEYLESS (settle-all): a
 *     predicted spawn/drop can't know the key the server will assign, so these
 *     channels hold a single anonymous pending slot. `mine` names a child
 *     field compared `===` to the room's `sessionId`, so a remote player's
 *     add doesn't falsely confirm ours.
 *
 * Root-level collections only. Rejects are never auto-bound — the ack-anchored
 * auto-reject already covers the miss case, and a wrong binding producing
 * silent rejects would be hard to debug. Confirm-only.
 */ /**
 * Subscribe the schema listeners for a {@link ConfirmOn} binding and route
 * them into `channel.confirm(...)`. Returns a single idempotent detacher
 * (registered on the channel's teardown list by `defineEvent`).
 */ function wireConfirmOn(callbacks, channel, on, sessionId) {
    const offs = [];
    if (on.field !== undefined) {
        // field-flip: per-child listeners, wired as children arrive (onAdd
        // replays existing children by default — wanted here).
        const listeners = new Map();
        offs.push(callbacks.onAdd(on.collection, (child, key)=>{
            if (listeners.has(child)) return; // decoder can re-fire onAdd for one ref
            listeners.set(child, callbacks.listen(child, on.field, (v)=>{
                if (v === on.equals) channel.confirm(key);
            }, // no immediate fire: a child already flipped at bind time is
            // history, not a settle signal (would fire onUnpredicted)
            false));
        }));
        offs.push(callbacks.onRemove(on.collection, (child)=>{
            listeners.get(child)?.();
            listeners.delete(child);
        }));
        offs.push(()=>{
            for (const off of listeners.values())off();
            listeners.clear();
        });
    } else if (on.event === "remove") {
        offs.push(callbacks.onRemove(on.collection, (_child, key)=>{
            channel.confirm(key);
        }));
    } else {
        // add: keyless settle-all, optionally only for our own entities.
        // No replay of existing entries — they're history, not signals.
        offs.push(callbacks.onAdd(on.collection, (child)=>{
            if (on.mine !== undefined && child[on.mine] !== sessionId?.()) return;
            channel.confirm();
        }, false));
    }
    return ()=>{
        for (const off of offs.splice(0))off?.();
    };
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/divergence.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "diagnosticsActive",
    ()=>diagnosticsActive,
    "warnDivergence",
    ()=>warnDivergence,
    "warnMemoCollision",
    ()=>warnMemoCollision,
    "warnReadBeforePump",
    ()=>warnReadBeforePump
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/utils.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/debug-channel.mjs [app-ssr] (ecmascript)");
;
;
/**
 * True when drift telemetry is being watched — the `@colyseus/sdk/debug` overlay
 * is loaded (its live receiver on `globalThis.__colyseusDebug` is what the panel
 * reads). Reconcilers skip ALL drift/correction bookkeeping when this is false
 * and no `warnOnDivergence` tolerance is set, so a production build that imports
 * neither pays nothing for the diagnostic.
 *
 * Delegates to {@link debugOverlayActive} so the pre-load PUBLISH BUFFER (which a
 * plain `Predict`/room publish now installs even without the overlay) doesn't
 * read as active — only the overlay's live receiver flips this on.
 */ function diagnosticsActive() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$debug$2d$channel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["debugOverlayActive"])();
}
// -Infinity (not 0) so the FIRST warning always fires: `now()` can be < the
// throttle window early in a process, and `now() - 0` would wrongly suppress it.
let _lastWarnAt = -Infinity;
const WARN_THROTTLE_MS = 1000;
/**
 * Wiring warning, fired (once per controller) when a render value was read
 * BETWEEN `predict.tick()` and the frame's `input.send()` calls. Such a read is
 * one fixed step stale — the render interpolation clamps at the latest applied
 * step (it never extrapolates), so on late step-boundary frames the read
 * flat-tops, and frame jitter renders as visible stutter on fast objects.
 * Default-on (like the input replay-buffer overflow warning): this is a frame-
 * order bug with an established fix, not tuning telemetry.
 */ function warnReadBeforePump() {
    console.warn(`@colyseus/sdk predict: a predicted value was read BEFORE this frame's input.send() calls. ` + `Reads between predict.tick() and the frame's sends are one fixed step stale and stutter on ` + `late frames. Send the frame's due inputs right after predict.tick(now) — tick and pump in ` + `your earliest per-frame callback, before anything reads value()/pose(). For game logic ` + `(zone checks, hit-reg) read .state/.world instead. See PREDICTION.md §4 (frame order).`);
}
/**
 * Dev-only memo collision warning ({@link diagnosticsActive}-gated, warn-once
 * per key per store). Fired when two `ctx.memo` calls in ONE step land on the
 * same slot — two key-less calls, or the same explicit key twice. The live
 * calls each run their compute (last write wins the slot), but every replay of
 * that seq returns the ONE frozen value to both call sites — a silent,
 * latency-dependent re-simulation corruption. Warns instead of throwing: a
 * single key-less memo per step is the common, correct form.
 */ function warnMemoCollision(tick, key) {
    console.warn(key === "" ? `@colyseus/sdk predict: two key-less ctx.memo calls ran in one step (input seq ${tick}) — ` + `the key-less form is ONE shared slot per step, so replay returns one frozen value for ` + `both (silent re-simulation corruption). Pass distinct keys: ctx.memo("a", …) / ctx.memo("b", …).` : `@colyseus/sdk predict: ctx.memo("${key}") ran twice in one step (input seq ${tick}) — ` + `both calls share one slot on replay. Give each call site its own key ` + `(include the loop index for a per-iteration memo).`);
}
/**
 * Dev-only divergence warning, wired by the opt-in `warnOnDivergence` tolerance
 * on a {@link Reconciler}/{@link SimReconciler}. Fired when the reconciler's
 * verdict is `diverging` (the *persistent* drift `ema` crossed the tolerance —
 * NOT a single jitter spike), throttled to one warning per second across all
 * reconcilers so a sustained divergence doesn't flood the console.
 *
 * The reconcile correction IS the client-vs-server divergence (the client
 * already holds the server's authoritative state it reconciles against), so this
 * needs no extra wire traffic. It names the input seq, the worst field + its
 * signed delta, and the usual cause — actionable, not just "something's off".
 */ function warnDivergence(acked, lastCorrection, ema, tolerance) {
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$utils$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["now"])();
    if (t - _lastWarnAt < WARN_THROTTLE_MS) {
        return;
    }
    _lastWarnAt = t;
    let worst = "";
    let worstAbs = -1;
    for(const f in lastCorrection){
        const v = lastCorrection[f];
        const a = v < 0 ? -v : v;
        if (a > worstAbs) {
            worstAbs = a;
            worst = f;
        }
    }
    const delta = worst ? lastCorrection[worst] : ema;
    console.warn(`@colyseus/sdk predict: prediction is diverging at input seq ${acked} — ` + `rolling drift ${ema.toFixed(3)} ≥ tolerance ${tolerance}; "${worst}" currently off by ${delta.toFixed(3)}. ` + `Most likely the client and server simulations disagree: a different fixed dt, ` + `mismatched constants, a step function that isn't shared, or an input the server skipped. ` + `See PREDICTION.md §5 (Determinism).`);
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/drift.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "classifyDrift",
    ()=>classifyDrift,
    "newDrift",
    ()=>newDrift,
    "resetDrift",
    ()=>resetDrift,
    "updateDrift",
    ()=>updateDrift
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
const DRIFT_EMA_ALPHA = 0.1;
const DRIFT_PEAK_DECAY = 0.9;
/** A fresh zeroed {@link Drift}. */ function newDrift() {
    return {
        ema: 0,
        peak: 0
    };
}
/** Fold one reconcile's max |correction| (`mag`, world/pose units) into `d`. */ function updateDrift(d, mag) {
    d.ema += (mag - d.ema) * DRIFT_EMA_ALPHA;
    d.peak = Math.max(mag, d.peak * DRIFT_PEAK_DECAY);
}
/** Zero `d` — call on a hard resync (respawn) so a deliberate pose jump doesn't
 *  inflate the telemetry into looking like divergence. */ function resetDrift(d) {
    d.ema = 0;
    d.peak = 0;
}
/** Drift (world/pose units) at or below this is treated as float-noise:
 *  deterministic replay reproduces the server *exactly* (correction 0), so
 *  anything at this level is bit-rounding, not a real disagreement. Used as the
 *  matched/diverging floor only when the caller declared no tolerance. */ const FLOAT_NOISE = 1e-3;
/**
 * Turn the rolling {@link Drift} into an actionable status. The debug panel and
 * the `warnOnDivergence` warning both classify through here, so they can never
 * disagree about what the numbers mean:
 *
 *   - **matched** — `ema` and `peak` both within the floor: the prediction
 *     reproduces the server. Nothing to do.
 *   - **jitter** — `ema` within the floor but `peak` above it: corrections
 *     happen yet DON'T persist (they decay out of the EMA) → transient network
 *     jitter (packet loss / reorder), not a bug; smoothing absorbs it.
 *   - **diverging** — `ema` above the floor: the *persistent* correction is real
 *     → the client and server simulations disagree (a determinism bug).
 *
 * The EMA's smoothing IS the persistence test — a one-off spike barely moves it,
 * so only sustained corrections read as `diverging`. The floor is the caller's
 * `tolerance` (`warnOnDivergence`) when set — so the matched/diverging cut needs
 * no game-specific magic number — and falls back to {@link FLOAT_NOISE} ("is it
 * ~0") when it isn't.
 */ function classifyDrift(d, tolerance) {
    const floor = tolerance !== undefined && tolerance > FLOAT_NOISE ? tolerance : FLOAT_NOISE;
    if (d.ema >= floor) {
        return "diverging";
    }
    if (d.peak >= floor) {
        return "jitter";
    }
    return "matched";
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedEventChannel.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_GRACE_TICKS",
    ()=>DEFAULT_GRACE_TICKS,
    "PredictedEventChannel",
    ()=>PredictedEventChannel
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEvents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedEvents.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/rollback.mjs [app-ssr] (ecmascript)");
;
;
/**
 * Typed optimistic-event CHANNEL — the high-level face of {@link PredictedEvents}.
 *
 * A channel owns one logical event type end-to-end: **birth** in the predicted
 * simulation (`ctx.predict(channel, payload)` inside a rollback `step`, or
 * `channel.predict(payload)` outside the sim), **feedback** (`onPredict` fires
 * immediately — the optimistic celebration/sound/spawn), and **settlement**
 * against the server (below).
 *
 * Identity is the channel OBJECT — there is no registry key. Where the
 * low-level store keys entries by strings the app must keep in sync, a channel
 * is declared once, holds its typed callbacks, and every call site references
 * the binding. The optional {@link PredictedEventChannelOptions.label} is
 * debug metadata only; nothing resolves by it.
 *
 *     const goals = predict.defineEvent<Team>({
 *         onPredict: (team) => { celebrate(team); hidePuck(); },
 *         onReject:  ()     => showPuck(),
 *     });
 *
 *     // inside the reconciler step — live-only by construction, replay-safe:
 *     if (crossedGoalLine) ctx.predict(goals, scoredBy);
 *
 *     // settlement — the authoritative broadcast:
 *     room.onMessage("score", () => goals.confirm());
 *
 * SETTLEMENT — how a pending prediction resolves:
 *
 *   - **`confirm()`** — the app saw the authoritative signal (a broadcast, a
 *     state change): the prediction was right.
 *   - **Auto-reject (sim-born)** — the server's ack watermark passed the
 *     entry's birth seq by {@link PredictedEventChannelOptions.graceTicks}
 *     without a confirm. The server processed the very timeline that
 *     predicted the event and stayed silent — the event didn't happen. The
 *     confirm signal travels the same ordered socket as the acks, so a real
 *     event always confirms before this fires; no wall clock, no RTT
 *     estimate, no state polling. (Both obvious alternatives false-reject
 *     under latency: the predicted world flickers on reconciles, and
 *     authoritative state shows PRE-input history for ~RTT after predicting.)
 *   - **TTL (UI-born)** — entries with no sim timeline fall back to
 *     wall-clock eviction (`ttlMs`).
 *   - **`reject()` / `clear()`** — explicit app verdicts, any time.
 *
 * Settlement/timing semantics (TTL policy, serverNow clock, accepted-entry
 * exemption) are delegated to an internal {@link PredictedEvents} store — one
 * source of truth for both layers.
 */ /** Entry key for non-primitive payloads when no
 *  {@link PredictedEventChannelOptions.uniqueBy} is given — the channel holds
 *  at most ONE pending prediction. */ const SINGLETON_KEY = 0;
/** Default {@link PredictedEventChannelOptions.graceTicks}: server progress
 *  past a prediction before an unconfirmed sim-born entry rejects (~333ms of
 *  simulation at 30Hz) — generous against contested-event divergence, and
 *  anchored to the ack stream so latency can't induce a false reject. */ const DEFAULT_GRACE_TICKS = 10;
class PredictedEventChannel {
    opts;
    /** Settlement engine: TTL clock + accepted-exemption live here. */ store;
    /** Pending payloads by entry key (payload echoed to the settle callbacks).
     *  `acked` is the emitting controller's watermark (sim-born entries only). */ entries = new Map();
    now;
    cooldownUntil = -Infinity;
    warnedReplayPredict = false;
    constructor(opts, clock){
        this.opts = opts;
        this.now = ()=>clock?.serverNow() ?? performance.now();
        this.store = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEvents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PredictedEvents"].get({
            clock
        }, {
            ttlMs: opts.ttlMs ?? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEvents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_TTL_POLICY"],
            // one internal rejection path — TTL prune and explicit reject() both land here
            onReject: (key)=>{
                const e = this.entries.get(key);
                this.entries.delete(key);
                if (e) this.opts.onReject?.(e.payload);
            }
        });
    }
    /** Sim-born prediction — reached via `ctx.predict(channel, payload)`, which
     *  only forwards LIVE steps (replays are filtered before this is called). */ _predictFromSim(seq, payload, acked) {
        this.add(seq, payload, acked);
    }
    /**
     * Predict from OUTSIDE the sim (a UI-optimistic action with no rollback
     * timeline). Inside a reconciler `step`, use `ctx.predict(channel, payload)`
     * instead — this form is backstopped (a call that lands inside a rollback
     * replay no-ops and warns once) but the ctx form is live-only by
     * construction.
     */ predict(payload) {
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isReplaying"])()) {
            if (!this.warnedReplayPredict) {
                this.warnedReplayPredict = true;
                console.warn(`@colyseus/sdk: PredictedEventChannel${this.opts.label ? ` "${this.opts.label}"` : ""}` + `.predict() was called during a rollback replay and ignored. ` + `Inside a reconciler step, use ctx.predict(channel, payload).`);
            }
            return;
        }
        this.add(-1, payload);
    }
    add(seq, payload, acked) {
        // identity: uniqueBy > primitive payload keys itself > anonymous slot
        const key = this.opts.uniqueBy !== undefined ? this.opts.uniqueBy(payload) : typeof payload === "string" || typeof payload === "number" ? payload : SINGLETON_KEY;
        if (this.entries.has(key)) return; // already pending — re-derivations don't re-fire
        const t = this.now();
        if (this.opts.cooldownMs !== undefined) {
            if (t < this.cooldownUntil) return;
            this.cooldownUntil = t + this.opts.cooldownMs;
        }
        const handle = this.store.predict(key, t);
        // sim-born entries settle by server progress (see prune), not wall clock
        if (acked !== undefined) handle.accept();
        this.entries.set(key, {
            payload,
            seq,
            acked
        });
        this.opts.onPredict?.(payload);
    }
    /** Is a prediction pending? With `key`, that entry; without, any. */ has(key) {
        return key === undefined ? this.entries.size > 0 : this.entries.has(key);
    }
    /** Number of pending (unsettled) predictions. */ get pendingCount() {
        return this.entries.size;
    }
    /**
     * The server agreed: settle the entry for `key` — or EVERY pending entry
     * when omitted (the single-pending shape). Fires `onConfirm` per settled
     * entry; never `onReject`. Returns how many entries were settled — `0`
     * means the event arrived unpredicted (the caller usually plays the
     * feedback it skipped optimistically); {@link
     * PredictedEventChannelOptions.onUnpredicted} is the push form of that.
     *
     * ORDERING GUARANTEES:
     *   - the entry is removed BEFORE its `onConfirm` fires — `has(key)`
     *     inside `onConfirm` is already `false`. Branch on the callbacks
     *     (`onConfirm` = we predicted it, `onUnpredicted` = we didn't), never
     *     on a `has()` pre-read racing the confirm.
     *   - when nothing settles, `onUnpredicted` fires with the key.
     */ confirm(key) {
        let n = 0;
        for (const k of this.settleKeys(key)){
            const e = this.entries.get(k);
            if (e === undefined) continue;
            this.entries.delete(k);
            this.store.confirm(k); // silent drop — confirm never fires onReject
            this.opts.onConfirm?.(e.payload);
            n++;
        }
        if (n === 0) this.opts.onUnpredicted?.(key);
        return n;
    }
    /** The server overruled: reject the entry for `key` — or every pending
     *  entry when omitted. Fires `onReject` per entry. Returns the count. */ reject(key) {
        let n = 0;
        for (const k of this.settleKeys(key)){
            if (!this.entries.has(k)) continue;
            this.store.reject(k); // internal wiring deletes the entry + fires onReject(payload)
            n++;
        }
        return n;
    }
    settleKeys(key) {
        return key !== undefined ? [
            key
        ] : [
            ...this.entries.keys()
        ];
    }
    /** Drop every pending entry SILENTLY (no callbacks) — respawns, scene
     *  teardown, "this life's predictions no longer apply". */ clear() {
        this.entries.clear();
        this.store.clear();
    }
    /** Per-frame drive (the owning Predict calls this from `tick()`):
     *  sim-born grace-tick auto-rejects first, then wall-clock TTL eviction. */ prune() {
        if (this.entries.size > 0) {
            const grace = this.opts.graceTicks ?? DEFAULT_GRACE_TICKS;
            for (const [key, e] of [
                ...this.entries
            ]){
                // sim-born auto-settle: the server processed `grace` ticks past
                // the prediction without confirming — the event didn't happen
                if (e.acked !== undefined && e.acked() >= e.seq + grace) this.store.reject(key);
            }
        }
        this.store.prune(); // wall-clock TTL — UI-born entries (sim-born are accept()ed)
    }
    /** Set by {@link dispose} — the owning Predict drops a dead channel from
     *  its drive list on the next tick. */ dead = false;
    /** Teardowns drained by {@link dispose} — populated by the owning
     *  Predict's `defineEvent` (`confirmOn` bindings). @internal */ teardowns = [];
    /** @internal */ _addTeardown(fn) {
        this.teardowns.push(fn);
    }
    /** Stop being driven and drop all entries (silently). */ dispose() {
        for (const fn of this.teardowns.splice(0))fn();
        this.dead = true;
        this.clear();
        this.store.dispose();
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedEvents.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_TTL_POLICY",
    ()=>DEFAULT_TTL_POLICY,
    "PredictedEvents",
    ()=>PredictedEvents
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
/**
 * Default TTL policy for {@link PredictedEvents.get}: `max(2 × smoothedRtt, 600ms)`.
 *
 *   - **2× RTT** absorbs round-trip + ordinary jitter — predictions that
 *     don't confirm within this window were almost certainly mispredicted.
 *   - **600 ms floor** guards against RTT being 0 (clock not bootstrapped)
 *     or pathologically small (loopback testing).
 *
 * Exported so callers can compose against it, e.g.
 * `ttlMs: rtt => Math.max(rtt * 1.5, DEFAULT_TTL_POLICY(rtt))`.
 */ const DEFAULT_TTL_POLICY = (rtt)=>Math.max(rtt * 2, 600);
class PredictedEvents {
    /**
     * Room-aware factory. Auto-binds `now()` to `room.clock.serverNow()` and
     * wires the optional dynamic-TTL policy with the room's `smoothedRtt()`.
     * Equivalent to `new PredictedEvents() + configure({...})` but one line.
     *
     * Defaults to {@link DEFAULT_TTL_POLICY} (`max(2 × rtt, 600ms)`) when
     * `opts.ttlMs` is omitted — suitable for most optimistic predictions.
     *
     * Use this when you can instantiate after the room is available. For
     * module-load-time declarations (when the room doesn't exist yet),
     * prefer `new PredictedEvents() + configure(...)` instead.
     */ static get(room, opts = {}) {
        const pe = new PredictedEvents();
        pe.configure(buildClockConfig(room.clock ?? null, opts.ttlMs ?? DEFAULT_TTL_POLICY));
        if (opts.onReject) {
            pe.configure({
                onReject: opts.onReject
            });
        }
        return pe;
    }
    entries = new Map();
    /** Keys marked server-confirmed via a handle's `accept()` — exempt from TTL
     *  eviction while the authoritative schema change is still in flight. */ accepted = new Set();
    cfg = {};
    /** Bind/override default providers for `predict()` and `prune()`. Call
     *  once after the room (and clock) is available; subsequent calls merge.
     *  Per-call args still take precedence over the configured providers. */ configure(cfg) {
        this.cfg = {
            ...this.cfg,
            ...cfg
        };
    }
    /** Record an optimistic prediction. `at` defaults to the configured
     *  `now()` provider, falling back to `performance.now()`. Returns a handle to
     *  roll it back ({@link PredictedEventHandle.cancel}) or protect it
     *  ({@link PredictedEventHandle.accept}). */ predict(key, at) {
        this.entries.set(key, at ?? this.cfg.now?.() ?? performance.now());
        return {
            key,
            cancel: ()=>{
                this.entries.delete(key);
                this.accepted.delete(key);
            },
            accept: ()=>{
                if (this.entries.has(key)) {
                    this.accepted.add(key);
                }
            }
        };
    }
    /** Is there an unconfirmed prediction for this key? */ has(key) {
        return this.entries.has(key);
    }
    /** The server confirmed the prediction (or the caller wants to drop it). */ confirm(key) {
        this.entries.delete(key);
        this.accepted.delete(key);
    }
    /** The server overruled this prediction — drop it now and fire `onReject`
     *  (immediate mispredict, vs `confirm`'s silent correct-prediction drop). */ reject(key) {
        if (this.entries.delete(key)) {
            this.accepted.delete(key);
            this.cfg.onReject?.(key);
        }
    }
    /** Drop entries older than `ttlMs` — they're mispredictions the server
     *  didn't agree with. `now` defaults to the configured `now()` provider;
     *  `ttlMs` defaults to the configured policy (number or function). */ prune(now, ttlMs) {
        const t = now ?? this.cfg.now?.() ?? performance.now();
        const policy = this.cfg.ttlMs;
        const ttl = ttlMs ?? (typeof policy === "function" ? policy() : policy) ?? Infinity;
        for (const [k, at] of this.entries){
            if (this.accepted.has(k)) {
                continue;
            } // server-confirmed — exempt from TTL
            if (t - at > ttl) {
                this.entries.delete(k);
                this.cfg.onReject?.(k);
            }
        }
    }
    /** Drop everything. */ clear() {
        this.entries.clear();
        this.accepted.clear();
    }
    get size() {
        return this.entries.size;
    }
    /** Set when {@link dispose} is called — a driver auto-pruning this store
     *  (the channel/spawn surface wrapping it) drops a `dead` child on its
     *  next tick. */ dead = false;
    /** Stop being auto-pruned by the owning Predict and drop all entries. */ dispose() {
        this.dead = true;
        this.entries.clear();
        this.accepted.clear();
    }
}
/** Encode the "RTT-aware TTL policy" semantics for the room-aware factory. */ function buildClockConfig(clock, ttlMs) {
    return {
        now: ()=>clock?.serverNow() ?? performance.now(),
        ttlMs: typeof ttlMs === "function" ? ()=>ttlMs(clock?.smoothedRtt() ?? 0) : ttlMs
    };
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedSpawns.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PredictedSpawns",
    ()=>PredictedSpawns
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEvents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/predictedEvents.mjs [app-ssr] (ecmascript)");
;
/**
 * Predicted-spawn store — optimistic, server-reconciled *entities* (a fired
 * bullet, a thrown grenade, a dropped item), the entity-level counterpart to
 * {@link PredictedEvents}' discrete keys.
 *
 * The pattern the shooter hand-rolls today:
 *
 *   - On fire, render a client-only bullet immediately (no ~RTT wait).
 *   - Skip rendering the server's copy of *my own* bullets (`if (ownerId ===
 *     me) continue`) to avoid a duplicate.
 *   - Never reconcile predicted → authoritative, because the server assigns
 *     the id and the client can't correlate them.
 *   - Hand-write mispredict cleanup ("server rejected the shot → ghost").
 *
 * `PredictedSpawns` collapses all of that. Predicted locals live **outside**
 * the schema collection (in this store); the authoritative entities stay in
 * the decoder-owned collection. Correlation happens *post-decode* — when the
 * server entity's `onAdd` fires, its fields are populated, so a pending local
 * is matched to it ({@link PredictedSpawnsOptions.correlate}) and the two
 * collapse onto one logical {@link SpawnEntry} with a **stable `id`**.
 *
 * The handoff is seamless not by sharing a JS object (that would need a
 * `@colyseus/schema` change) but by keeping `id` constant across the
 * predicted → authoritative transition: the renderer keys its sprite on
 * `entry.id` and reads `entry.server ?? entry.local`, so the predicted bullet
 * becomes the authoritative one with no remove/re-add churn. This is the one
 * contract the render loop must follow.
 *
 * Lifecycle:
 *   1. {@link spawn} — push an optimistic local; renders instantly.
 *   2. `onAdd` (mine + matched) — server confirms; same `id`, `server` set.
 *   3. {@link prune} — a local with no match within TTL was a mispredict
 *      (server rejected the action); drop it, the sprite reverts.
 *   4. `onRemove` — the authoritative entity despawned; drop the entry.
 *
 * Driven automatically when created via `predict.spawns(...)` — the owning
 * {@link Predict} ticks ({@link tick}, dead-reckons pending locals) and prunes
 * ({@link prune}) it each frame. For standalone use, call {@link attach} with a
 * subscribe function and drive `tick`/`prune` yourself.
 */ class PredictedSpawns {
    opts;
    clock;
    correlate;
    ttl;
    /** Master index: every live entry (pending + confirmed + foreign), in
     *  insertion order — FIFO correlation walks this picking the oldest
     *  still-`pending` entry. */ byId = new Map();
    /** Secondary index: authoritative instance → entry, for `onRemove`. */ byServer = new Map();
    nextId = 1;
    lastTickAt;
    detach;
    /** Set by {@link dispose}; the owning Predict drops a `dead` child on its
     *  next tick. */ dead = false;
    constructor(opts = {}, clock = null){
        this.opts = opts;
        this.clock = clock;
        this.correlate = opts.correlate ?? "fifo";
        this.ttl = opts.ttl ?? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$predictedEvents$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_TTL_POLICY"];
    }
    /**
     * Wire the store to a collection's add/remove stream. `subscribe` receives
     * the store's handlers and returns a detacher. Called once by
     * `predict.spawns(...)`; call it yourself for standalone use, e.g.
     *
     * ```ts
     * const cb = Callbacks.get(room);
     * spawns.attach((onAdd, onRemove) => {
     *   const a = cb.onAdd("bullets", onAdd);
     *   const r = cb.onRemove("bullets", onRemove);
     *   return () => { a?.(); r?.(); };
     * });
     * ```
     */ attach(subscribe) {
        this.detach?.();
        this.detach = subscribe(this.handleAdd, this.handleRemove);
    }
    /** Record an optimistic local spawn. Returns a handle for cancellation. */ spawn(local) {
        const id = this.nextId++;
        const data = this.makeData();
        const entry = {
            id,
            server: undefined,
            local,
            state: "pending",
            at: this.now(),
            leadMs: 0,
            accepted: false,
            data
        };
        this.byId.set(id, entry);
        return {
            id,
            local,
            data,
            // Pending-safe: a confirmed entry is owned by the authoritative entity,
            // so a late rollback must not delete it.
            cancel: ()=>{
                const e = this.byId.get(id);
                if (e && e.state === "pending") {
                    this.byId.delete(id);
                }
            },
            accept: ()=>{
                const e = this.byId.get(id);
                if (e) {
                    e.accepted = true;
                }
            }
        };
    }
    handleAdd = (server, _key)=>{
        // Decoder may re-fire for an instance already tracked (immediate replay
        // + a later op); ignore the second sighting.
        if (this.byServer.has(server)) {
            return;
        }
        // fifo / predicate match, or a foreign (server-only) entity.
        const matched = this.isOwned(server) ? this.takeMatch(server) : undefined;
        if (matched) {
            this.confirmEntry(matched, server);
        } else {
            // Foreign entity, or mine-without-a-prediction (joined late / the
            // server spawned it on my behalf) — surfaced as server-only.
            const entry = {
                id: this.nextId++,
                server,
                local: undefined,
                state: "confirmed",
                at: undefined,
                leadMs: 0,
                accepted: false,
                data: this.makeData()
            };
            this.byId.set(entry.id, entry);
            this.byServer.set(server, entry);
        }
    };
    /** Transition a matched pending entry to confirmed in place (the live object
     *  is reused across handoff — same `id`). */ confirmEntry(entry, server) {
        entry.server = server;
        entry.state = "confirmed";
        const spawnTime = this.opts.spawnTime;
        if (spawnTime !== undefined && entry.at !== undefined) {
            entry.leadMs = spawnTime(server) - entry.at;
        }
        this.byServer.set(server, entry);
    }
    handleRemove = (server, _key)=>{
        const entry = this.byServer.get(server);
        if (entry) {
            this.byServer.delete(server);
            this.byId.delete(entry.id);
        }
    };
    /** Find a pending local to pair with `server`, per the correlation
     *  strategy. The matched entry transitions in place (not removed). */ takeMatch(server) {
        const corr = this.correlate;
        // "fifo": claim the oldest pending.
        if (typeof corr !== "function") {
            for (const entry of this.byId.values()){
                if (entry.state === "pending") {
                    return entry;
                } // oldest pending
            }
            return undefined;
        }
        for (const entry of this.byId.values()){
            if (entry.state === "pending" && corr(entry.local, server)) {
                return entry;
            }
        }
        return undefined;
    }
    isOwned(server) {
        return this.opts.owned ? this.opts.owned(server) : true;
    }
    makeData() {
        return this.opts.data ? this.opts.data() : undefined;
    }
    /**
     * Advance pending locals via {@link PredictedSpawnsOptions.step}.
     * Confirmed/foreign entries are left to the authoritative state.
     *
     * With a clock, `dt` is derived on the clock's `serverNow()` axis — the
     * SAME axis `at` (and thus the measured input lead) live on — so a pending
     * local's flight and the confirmed entity's lead-reckon are the same
     * expression by construction: the handoff cannot jump, no matter how
     * biased or drifty the client's server-clock estimate is. Without a
     * clock, `now` (typically `performance.now()`) paces the step.
     */ tick(now = performance.now()) {
        const step = this.opts.step;
        const t = this.clock !== null ? this.clock.serverNow() : now;
        if (step !== undefined && this.lastTickAt !== undefined) {
            const dt = Math.max(0, (t - this.lastTickAt) / 1000);
            if (dt > 0) {
                for (const entry of this.byId.values()){
                    if (entry.state === "pending") {
                        step(entry.local, dt);
                    }
                }
            }
        }
        this.lastTickAt = t;
    }
    /** Drop pending locals older than the TTL policy — mispredicts the server
     *  never confirmed. Uses `serverNow()` and the RTT-aware TTL. */ prune() {
        if (this.byId.size === 0) {
            return;
        }
        const now = this.now();
        const ttl = this.ttl(this.clock?.smoothedRtt() ?? 0);
        for (const entry of this.byId.values()){
            // `accepted` entries are server-confirmed and awaiting their (slightly
            // late) authoritative patch — never a mispredict, so skip eviction.
            if (entry.state === "pending" && !entry.accepted && entry.at !== undefined && now - entry.at > ttl) {
                this.byId.delete(entry.id);
                this.opts.onReject?.(entry.local, entry.id);
            }
        }
    }
    /** Iterate the merged view — exactly one entry per logical entity. */ entries() {
        return this.byId.values();
    }
    /** The entry an authoritative instance collapsed onto (or was surfaced as,
     *  for foreign entities) — e.g. to reach `leadMs`/`data` from a collection
     *  callback that only has the server instance. */ entryFor(server) {
        return this.byServer.get(server);
    }
    /**
     * Unified field read across the predicted → authoritative handoff:
     * pending entries read the stepped local; confirmed entries read the
     * authoritative instance through the bound reader — `predict.value()`
     * (reckoned, lead-aware) when created via `predict.spawns(...)` with
     * `fields`, a raw field read otherwise. Render from this and the handoff
     * is invisible: same `id`, same timeline, one code path.
     */ value(entry, field) {
        if (entry.server !== undefined) {
            return this.readServer(entry.server, field);
        }
        return entry.local[field];
    }
    /** Route confirmed-entry `value()` reads (wired by `predict.spawns` to its
     *  reckon slots; standalone stores keep the raw default). */ bindReader(read) {
        this.readServer = read;
    }
    readServer = (server, field)=>server[field];
    /** Is `id` still live this frame? Useful for despawning stale sprites. */ alive(id) {
        return this.byId.has(id);
    }
    /** Total live entries (pending + confirmed + foreign). */ get size() {
        return this.byId.size;
    }
    /** Drop all predictions and tracked entries (keeps the subscription). */ clear() {
        this.byId.clear();
        this.byServer.clear();
    }
    /** Detach from the collection, drop everything, and mark dead so the owning
     *  Predict stops driving it. */ dispose() {
        this.dead = true;
        this.detach?.();
        this.detach = undefined;
        this.clear();
    }
    now() {
        return this.clock?.serverNow() ?? performance.now();
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/reconciler.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Reconciler",
    ()=>Reconciler
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/rollback.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/schema-reflect.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/divergence.mjs [app-ssr] (ecmascript)");
;
;
;
/**
 * Reconciler — server-reconciled rollback for a locally-controlled entity whose
 * authoritative truth is a flat list of scalar `fields` on ONE schema instance.
 *
 * The active counterpart to {@link Predict}: where Predict passively smooths the
 * server stream for entities you DON'T control (lerp/reckon), the Reconciler
 * owns the predicted simulation of the entity you DO control. It applies your
 * inputs immediately (zero-latency local feel), buffers the unacknowledged ones,
 * and when the server's authoritative state arrives rewinds to that truth and
 * replays the still-unacked inputs — the standard rewind-and-replay rollback loop
 * (shared with `SimReconciler` via {@link RollbackController}), with the *server*
 * as the authority that provides the restore point.
 *
 * This is the flat-`fields` face of the shared engine: it mirrors a declared
 * `fields` list off one authoritative schema instance (adopt = copy those fields;
 * pose = read them back). For composite state across several instances, or an
 * opaque physics-engine handle, reach for `SimReconciler` (`predict.sim`).
 *
 * `fields` is OPTIONAL and defaults to EVERY scalar field the instance's schema
 * declares (numbers / booleans / strings, declaration order — the same metadata
 * walk as `predict.sim`'s auto-bind; child schemas, collections and `.noSync()`
 * fields are excluded). Pass an explicit list only to subset deliberately: hot
 * server-driven scalars (hp regen, timers) defeat the wire-precision reconcile
 * skip and surface as drift-telemetry corrections when they move; a string field
 * disables the history ring; adopt-only fields become mirrored into `.state` at
 * ack cadence (read them off the raw instance for decode cadence). With an
 * explicit subset, a dev-only diagnostic (debug overlay loaded) warns once per
 * schema field `step` touches that the list doesn't mirror.
 *
 * The acknowledgement lives on the INPUT HANDLE, not a clock: you send inputs
 * through `room.input(...)`, so that handle knows the server ack
 * (`input.lastProcessed`) and the seq you've sent (`input.sentCount`).
 *
 * Smooth error correction: a misprediction is absorbed into a per-field visual
 * offset that decays to 0 over a few frames, so corrections never pop.
 *
 * Input is FIXED-TIMESTEP and the reconciler is a pure OBSERVER: you mutate + send
 * through the input handle directly, and `predict.tick(now)` returns how many fixed
 * steps are due this frame. The reconciler watches the handle's `sentCount` and
 * predicts each new send (see {@link RollbackController}); render reads
 * ({@link value}) interpolate between the two latest steps so motion stays smooth
 * above the step rate.
 *
 *     // Every send() transmits one input (body-less when unchanged), so each
 *     // predicted step is delivered — predicted set == server-applied set.
 *     const input = room.input({ type: MoveInput, mode: "reliable" });
 *     const me = predict.reconciler(player, {
 *         input,
 *         step: (ctx, state, command) => applyInput(state, command, LEVEL, ctx.dt), // ctx.dt shared w/ server
 *         smoothMs: 65,
 *         // fields: defaults to every scalar field of `player`'s schema.
 *         // stepMs / stepSeconds default from `input`'s server-advertised rate.
 *     });
 *
 *     // per frame: predict.tick returns how many fixed input steps are due; mutate
 *     // + send each through the handle — the reconciler observes and predicts them:
 *     const n = predict.tick(now);
 *     for (let i = 0; i < n; i++) {
 *         input.data.moveX = moveX; input.data.jump = jump; // stage the wire input
 *         input.send();                                     // transmit + buffer for replay
 *     }
 *     draw(predict.value(player, "x"), predict.value(player, "y")); // one read idiom
 *
 * The reconciler registers its numeric `fields` into the owning Predict's
 * `predict.value(instance, field)` — the SAME render read as every passively-
 * smoothed entity (raw fallback before spawn / after dispose). `me.value(f)`
 * remains for direct handle reads.
 *
 * Hot path (`value`) is plain-number only; reconcile (cold, ~server-tick rate)
 * reads the authoritative instance.
 */ /** Ring/compare encoding of a predicted field value: numbers pass through,
 *  booleans become 0/1, anything else NaN (never matches → safe adopt). The
 *  recording and comparing sides MUST encode identically — hence one helper. */ const asScalar = (v)=>typeof v === "number" ? v : typeof v === "boolean" ? v ? 1 : 0 : NaN;
class Reconciler extends __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RollbackController"] {
    /** The current predicted step state (the "true" state, advanced one fixed
     *  step per input). Read raw for logic; rendered via interpolation. */ local = {};
    fields;
    numericFields = [];
    step;
    instance;
    // --- Wire-precision-aware reconcile (see RollbackController.truthMatchesAt) --
    /** Per-field wire quantizer, parallel to `fields`: maps a predicted float64
     *  to the exact value the wire would deliver (fround for `float32`, the
     *  codec's dynamic rule for auto `number`, identity for exact types). */ wireRound = [];
    /** Per-seq predicted-state ring (values via {@link asScalar}): slot
     *  `seq % size` holds the post-step field values for that seq; `historySeq`
     *  validates the slot (-1 = empty). Written on every applied step — live AND
     *  replay, so after a rollback the ring tracks the post-rollback trajectory.
     *  Sized to the input handle's replay ring: same seq window, ages out together. */ history;
    historySeq;
    historySize;
    /** False when a declared field isn't a number/boolean at construction (the
     *  ring can't represent it) — the short-circuit is then disabled and every
     *  reconcile adopts, exactly the pre-history behavior. */ historyOn;
    /** Schema scalars absent from an EXPLICIT `fields` list — the dev
     *  diagnostic's watch set. null ⇒ diagnostic off (derived list, complete
     *  list, or no metadata): applyStep's check is then one null compare. */ undeclared = null;
    /** Cached dev proxy over `local` handed to `step` while the debug overlay
     *  is active (see {@link stepView}). */ devView = null;
    constructor(instance, opts){
        super(opts);
        this.instance = instance;
        const explicit = opts.fields;
        // Omitted fields ⇒ mirror every schema scalar (sim's auto-bind rule).
        const fields = explicit ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scalarFieldsOf"])(instance).fields;
        if (explicit === undefined && fields.length === 0) {
            throw new Error("predict.reconciler(): no `fields` given and none derivable — the " + "instance has no schema metadata (a plain object, or a schema with no " + "scalar fields). Pass the decoded instance from room.state, or list " + "`fields` explicitly.");
        }
        this.fields = fields;
        this.step = opts.step;
        let scalarOnly = this.fields.length > 0;
        for (const f of this.fields){
            const v = instance[f];
            this.local[f] = v;
            if (typeof v === "number") {
                this.numericFields.push(f);
                this.prev[f] = v;
                this.error[f] = 0;
            } else if (typeof v !== "boolean") scalarOnly = false;
            this.wireRound.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["wireQuantizerOf"])(instance, f));
        }
        this.historyOn = scalarOnly;
        // The 64 fallback covers bare test fakes without a ring.
        this.historySize = this.input_.replayBufferSize ?? 64;
        this.history = new Float64Array(this.historyOn ? this.historySize * this.fields.length : 0);
        this.historySeq = new Float64Array(this.historyOn ? this.historySize : 0).fill(-1);
        if (explicit !== undefined) {
            const declared = new Set(this.fields);
            const rest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scalarFieldsOf"])(instance).fields.filter((f)=>!declared.has(f));
            if (rest.length > 0) this.undeclared = new Set(rest);
        }
    }
    /**
     * The TRUE predicted state — read it for game logic, and mutate it directly
     * to apply a per-step side-effect (e.g. a collision bounce). It carries no
     * interpolation / smooth-correction offset (that's what {@link value} adds
     * for rendering). To survive a reconcile, a mutation must be reproducible by
     * `step` during replay — record it per-seq and re-apply it inside `step`.
     *
     * Always current — inputs are stepped eagerly as you `send()` them (the
     * reconciler observes the handle). Plain object access — no string-keyed
     * get/set, no mutator closure. The reconciler tracks ONE entity, so its state
     * is naturally a single struct; this ports to `state.vy = …` in C# / Lua and
     * `state->vy = …` in C.
     */ get state() {
        return this.local;
    }
    /** @internal Bound registrations for the owning Predict's `value()` overlay:
     *  this reconciler's numeric fields on its one instance, pose key = field
     *  name ({@link value} already reads by field). Empty source refId (plain
     *  test fixtures) is skipped by the overlay installer. */ get boundRegistrations() {
        return [
            {
                source: this.instance,
                fields: this.numericFields,
                poseKeys: this.numericFields
            }
        ];
    }
    /**
     * Rendered value: the predicted state interpolated between the previous and
     * current fixed step by {@link renderAlpha}, plus the decaying correction
     * offset. Smooth above the step rate (at ~one step of render latency). Numeric
     * fields only; non-numeric fields return the current value verbatim.
     */ value(field) {
        this.noteRenderRead();
        const c = this.local[field];
        if (typeof c !== "number") return c;
        const smoothed = c + (this.error[field] ?? 0);
        const p = this.prev[field] ?? smoothed;
        return p + (smoothed - p) * this.renderAlpha();
    }
    // --- RollbackController hooks ----------------------------------------------
    smoothedFields() {
        return this.numericFields;
    }
    readCurrent(field) {
        return this.local[field];
    }
    applyStep(input) {
        // Explicit-subset dev diagnostic: hand `step` a proxied view that warns
        // on undeclared-schema-field touches. Overlay checked per step (its
        // dynamic import races construction). Raw local otherwise.
        const state = this.undeclared !== null && (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["diagnosticsActive"])() ? this.stepView() : this.local;
        this.step(this.stepCtx, state, input);
        // Record this seq's predicted state (live and replay alike — after a
        // rollback the replayed values are the canonical prediction).
        if (this.historyOn) {
            const seq = this.stepCtx.tick;
            const slot = seq % this.historySize;
            const base = slot * this.fields.length;
            for(let i = 0; i < this.fields.length; i++){
                this.history[base + i] = asScalar(this.local[this.fields[i]]);
            }
            this.historySeq[slot] = seq;
        }
    }
    /** Dev-only view of `local` for `step`: warns ONCE per schema scalar missing
     *  from the explicit `fields` list on first read/write — the "step touched a
     *  field the reconciler doesn't mirror" hazard (prediction integrates on a
     *  stale value; rubber-bands only under latency). String keys only: symbols
     *  (runtime probes) and non-schema scratch keys forward untouched. Built
     *  lazily on the first overlay-active step, then cached — identity is stable
     *  across live and replay steps. Non-semantic by construction (forwards
     *  everything unchanged) — ports substitute a native check or skip it, see
     *  PORTING.md. */ stepView() {
        if (this.devView !== null) return this.devView;
        const undeclared = this.undeclared;
        const warned = new Set();
        const check = (verb, prop)=>{
            if (typeof prop !== "string" || !undeclared.has(prop) || warned.has(prop)) return;
            warned.add(prop);
            console.warn(`@colyseus/sdk predict: step ${verb} "${prop}" — a schema field NOT in this ` + `reconciler's \`fields\` list, so it is never mirrored or replayed: prediction ` + `integrates on top of a stale value and rubber-bands under latency. Add "${prop}" ` + `to \`fields\`, or omit \`fields\` to mirror every scalar field. Read adopt-only ` + `fields off the raw instance instead of the predicted state.`);
        };
        this.devView = new Proxy(this.local, {
            get (t, prop, recv) {
                check("read", prop);
                return Reflect.get(t, prop, recv);
            },
            set (t, prop, v, recv) {
                check("wrote", prop);
                return Reflect.set(t, prop, v, recv);
            }
        });
        return this.devView;
    }
    /**
     * Wire-precision compare: the prediction at `acked` (from the history ring)
     * against the decoded truth on the instance, each predicted value passed
     * through its field's wire quantizer. All fields indistinguishable ⇒ the
     * wire could not have told the server anything different ⇒ skip adopt+replay
     * (see {@link RollbackController.reconcile}). Any miss — ring slot aged out
     * or pre-reset, NaN, a genuine mismatch — falls back to a full adopt.
     */ truthMatchesAt(acked) {
        if (!this.historyOn) return false;
        const slot = acked % this.historySize;
        if (this.historySeq[slot] !== acked) return false;
        const base = slot * this.fields.length;
        const inst = this.instance;
        for(let i = 0; i < this.fields.length; i++){
            if (this.wireRound[i](this.history[base + i]) !== asScalar(inst[this.fields[i]])) return false;
        }
        return true;
    }
    snapshotPrev() {
        for (const f of this.numericFields)this.prev[f] = this.local[f] + this.error[f];
    }
    adoptTruth() {
        const inst = this.instance;
        for (const f of this.fields)this.local[f] = inst[f];
    }
    reseedState() {
        const inst = this.instance;
        for (const f of this.fields)this.local[f] = inst[f];
        for (const f of this.numericFields){
            this.prev[f] = this.local[f];
            this.error[f] = 0;
        }
        // Prior life's predictions must not certify a post-reset ack as matching.
        this.historySeq.fill(-1);
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/rollback.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RollbackController",
    ()=>RollbackController,
    "isReplaying",
    ()=>isReplaying
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/drift.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/divergence.mjs [app-ssr] (ecmascript)");
;
;
/**
 * RollbackController — the shared server-reconciled rollback engine behind both
 * {@link Reconciler} (flat `fields` mirrored off one schema instance) and
 * `SimReconciler` (composite `world` + `adopt`/`pose` callbacks).
 *
 * Both controllers run the SAME loop: step each input the app sends immediately
 * (zero-latency local feel), buffer the unacknowledged ones on the input handle,
 * and when the server's authoritative state arrives rewind to that truth and
 * replay the still-unacked inputs on top — the rewind-and-replay rollback loop,
 * with the *server* as the authority that provides the restore point. They differ
 * only in WHERE the predicted state lives and how truth is adopted / read back for
 * rendering; everything else — the ack poll, the reconcile scaffold, smooth error
 * correction, `ctx.memo` memoization, drift telemetry — is identical and lives here.
 *
 * The acknowledgement lives on the INPUT HANDLE, not a clock: inputs go through
 * `room.input(...)`, so that handle knows the server ack (`input.lastProcessed`)
 * and the seq you've sent (`input.sentCount`). Reconcile is driven by polling
 * `lastProcessed` in {@link tick} — no schema field, no per-field subscription.
 *
 * Smooth error correction: a misprediction is absorbed into a per-field visual
 * offset (error = renderedBefore − correctedLocal) that decays to 0 over a few
 * frames, so corrections never pop. Correct predictions ⇒ ~zero offset.
 *
 * OBSERVER MODEL — the controller never stages or sends. You mutate + send through
 * the handle directly (`input.data.x = …; input.send()`); the controller subscribes
 * to the handle's {@link InputHandle.onSend} and steps its predicted simulation for
 * each sent input right then, so the render reads stay pure. Fixed-timestep pacing
 * lives on the owning `Predict`: `predict.tick(now)` returns HOW MANY fixed steps
 * are due this frame and pushes the interpolation `alpha` in via {@link tick}. The
 * user loop stays callback-free (`for (n) { input.data = …; input.send() }`) so it
 * ports to C# / C / Lua by transcription — only the loop and transport live in the shell.
 *
 * The subclass supplies the small set of hooks that genuinely differ:
 *   - {@link smoothedFields} / {@link readCurrent} — the numeric field set that
 *     gets smoothed, and how to read one's current predicted value.
 *   - {@link adoptTruth} — seed the server's authoritative state before replay.
 *   - {@link applyStep} — run the user step for one buffered input (live or replay).
 *   - {@link snapshotPrev} — capture the pre-step smoothed value for interpolation.
 *   - {@link reseedState} — re-seed local state on a hard {@link reset}.
 *   - {@link refreshRender} / {@link markDirty} — optional post-hooks (a pose
 *     reconciler re-samples its pose + marks its render cache dirty; the flat one no-ops).
 */ /**
 * Per-seq memo backing {@link StepContext.memo}: run a closure ONCE on the
 * live step, freeze its result keyed by `(seq, key)`, and on every rollback
 * REPLAY of that seq return the frozen value WITHOUT re-running it. Pruned when
 * the seq is acked, cleared on reset. Shared by {@link Reconciler} and
 * `SimReconciler` (both replay the same per-seq input buffer the same way).
 *
 * Storage is sparse — only seqs that memoized ≥1 value get an entry — so it
 * stays as small as the hand-rolled per-seq Maps it replaces. With dev
 * diagnostics on, warns once per key when two calls in one step share a slot.
 */ class MemoStore {
    /** seq → (key → memoized value). */ byTick = new Map();
    // Collision diagnostic (live path, diagnostics-gated): keys seen this tick.
    // Tracked separately from byTick — undefined computes are never stored there.
    diagTick = -1;
    diagKeys = new Set();
    warnedKeys = new Set();
    /**
     * LIVE (`isReplay=false`): run `compute`, memoize a non-`undefined` result
     * under `(tick, key)`, return it. REPLAY (`isReplay=true`): return the memo
     * (or `undefined` if the live step memoized none) WITHOUT running `compute`.
     */ run(tick, isReplay, key, compute) {
        if (isReplay) return this.byTick.get(tick)?.get(key);
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["diagnosticsActive"])()) {
            if (tick !== this.diagTick) {
                this.diagTick = tick;
                this.diagKeys.clear();
            } else if (this.diagKeys.has(key) && !this.warnedKeys.has(key)) {
                this.warnedKeys.add(key);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["warnMemoCollision"])(tick, key);
            }
            this.diagKeys.add(key);
        }
        const v = compute();
        if (v !== undefined) {
            let m = this.byTick.get(tick);
            if (m === undefined) {
                m = new Map();
                this.byTick.set(tick, m);
            }
            m.set(key, v);
        }
        return v;
    }
    /** Drop memos for seqs the server has acked (they'll never replay again). */ prune(acked) {
        for (const tick of this.byTick.keys())if (tick <= acked) this.byTick.delete(tick);
    }
    clear() {
        this.byTick.clear();
        // Epoch reset reuses tick numbers — stale diag state would false-positive.
        // warnedKeys survives: warn-once per store lifetime, no re-spam on respawn.
        this.diagTick = -1;
        this.diagKeys.clear();
    }
}
/**
 * Depth of rollback replay currently executing (module-wide). Replay loops are
 * synchronous and never interleave across controllers, so a simple counter is
 * exact. Backstop for event channels: `channel.predict(...)` called from inside
 * a replayed step (instead of the blessed `ctx.predict`) can detect the replay
 * and no-op rather than re-fire feedback.
 */ let replayDepth = 0;
/** Is a rollback replay executing right now? @see replayDepth */ function isReplaying() {
    return replayDepth > 0;
}
/**
 * Shared rollback engine — a pure OBSERVER of an input handle. Owns the ack poll,
 * the reconcile scaffold, smooth error correction, `ctx.memo` memoization, and
 * drift telemetry; subclasses fill the state-shape hooks (see the class header).
 *
 * It never stages or sends: you mutate + send through the handle directly
 * (`input.data.x = …; input.send()`), and the controller — subscribed to the
 * handle's `onSend` — runs your `step` for that input right then (so render reads
 * stay pure). The server ack is the one thing it polls (`input.lastProcessed`, in
 * {@link tick}), since that arrives asynchronously over the network. The parent
 * `Predict` paces the room (`predict.tick(now)` returns how many fixed steps are
 * due); this controller derives its own render interpolation from that same
 * `tick(now)` (see {@link renderAlpha}). Not exported from the package — consumers
 * use {@link Reconciler} / `SimReconciler`.
 */ class RollbackController {
    // --- Debug telemetry (no effect on prediction) ---------------------------
    /** Per-numeric-field correction injected by the most recent reconcile — the
     *  raw pop (rendered-before − corrected), nonzero even in snap mode. Reused
     *  object, overwritten each reconcile; read it right after, don't retain. */ lastCorrection = {};
    /** Max |{@link lastCorrection}| across fields (world/pose units). ~0 ⇒ the
     *  prediction matched the server at the acked input. */ lastCorrectionMag = 0;
    /** Increments once per reconcile — lets a consumer detect a fresh one
     *  (compare against a stored value) without a callback. */ reconcileSeq = 0;
    /** Rolling reconcile drift (world/pose units). `ema` = persistent component
     *  (steady nonzero ⇒ divergence / rubber-banding); `peak` = recent decaying
     *  max (a spike over a low `ema` ⇒ network jitter, not divergence). Both ~0 ⇒
     *  the prediction matched the server. Updated once per reconcile. @see Drift */ drift = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["newDrift"])();
    /** Per-field visual offset decaying toward 0 (numeric/pose fields only). */ error = {};
    /** Previous step's SMOOTHED value (`current + error`) — render interpolates
     *  from this by {@link alpha} so motion is smooth above the step rate. */ prev = {};
    /** Reused scratch for reconcile's pre-snap rendered values — no per-reconcile alloc. */ renderedBefore = {};
    lastTick = -1;
    lastAcked = 0;
    /** Cached `input.epoch` — {@link tick} self-resets when the handle's epoch
     *  moves (reconnect / `input.reset()`), so the app never wires it manually. */ lastEpoch;
    /** Seq floor for replay: inputs sent at/before this aren't replayed (they
     *  applied to a prior life — set to the sent count on {@link reset}). The
     *  unacked INPUTS themselves live on the input handle, not here. */ replayFrom = 0;
    /** Highest input seq the LIVE prediction has stepped. Advanced by {@link catchUp}
     *  as the app sends (via the `onSend` hook); reconcile brings it back to
     *  `input.sentCount` after replay. */ predictedSeq = 0;
    /** Re-entrancy guard: a user `step` that reads back a predicted value must not
     *  recurse into {@link catchUp}. */ catching = false;
    /** Unsubscribe from the input handle's `onSend` (set in the constructor). */ unsubscribeSend = ()=>{};
    /** Render interpolation accumulator: real time (ms) past the latest APPLIED
     *  step. `renderAlpha() = clamp(renderAcc / stepMs, 0, 1)`. Advanced by frame
     *  time in {@link tick}, consumed one `stepMs` per applied step in
     *  {@link catchUp}. While stepping keeps up it equals the exact fixed-timestep
     *  leftover (smooth) and stays in `[0, stepMs)`. The consume rule (see
     *  {@link catchUp}) is what makes it robust across all four render regimes —
     *  steady play, LOAD offset, PAUSE, and a tab-in HITCH — with no cap or special
     *  case: it grows freely (alpha just clamps at 1, so a pause HOLDS at the latest
     *  step), and every applied step snaps it back into `[0, stepMs)` so play,
     *  resume, and hitch all render smooth. */ renderAcc = 0;
    /** Frame counter (one bump per {@link tick}) — pairs with
     *  {@link clampedReadTick} to catch render reads that precede the frame's
     *  sends (see {@link noteRenderRead}). */ tickSeq = 0;
    /** `tickSeq` of the last render read taken while a full step was due but
     *  unapplied (alpha clamped at 1) — armed by {@link noteRenderRead},
     *  checked against the current frame by {@link catchUp}. */ clampedReadTick = -1;
    /** One-shot: the read-before-pump warning already fired for this controller. */ warnedStaleRead = false;
    stepCtx;
    /** Ack watermark handed to event sinks with each `ctx.predict` (one shared
     *  closure — no per-emit alloc). @see PredictSink._predictFromSim */ ackWatermark = ()=>this.input_.lastProcessed;
    /** Per-seq memo backing `ctx.memo` — computed live, replayed verbatim, pruned on ack. */ memos = new MemoStore();
    smoothMs;
    /** Teleport pop threshold — see {@link RollbackOptions.snap}. 0 = off. */ snapThreshold;
    /** The fixed simulation step (ms) this controller predicts at — read by the
     *  owning `Predict` to pace `predict.tick(now)`. */ stepMs;
    input_;
    onReconcile;
    /** Divergence-warning tolerance; `undefined` ⇒ off. @see warnOnDivergence */ warnTolerance;
    /** Resolves ctx.reckonTime's unstamped fallback. @see RollbackOptions.clock */ clock;
    constructor(opts){
        this.input_ = opts.input;
        this.clock = opts.clock;
        // Default the decay window to the server's correction cadence (τ = one
        // patch interval) so corrections ease out before the next one — no stacking.
        this.smoothMs = opts.smoothMs ?? (this.input_.patchRate ? this.input_.patchRate : 50);
        this.snapThreshold = opts.snap ?? 0;
        // Fixed step: prefer an explicit ms, else the handle's server-advertised
        // rate, else derive from an explicit stepSeconds. A wrong dt silently
        // diverges rollback-replay, so we refuse to guess (no 60Hz fallback):
        // the server must advertise a rate (setFixedTimestep/setTimestep) or the
        // caller must pass stepMs/stepSeconds.
        const stepMs = opts.stepMs ?? this.input_.stepMs ?? (opts.stepSeconds !== undefined ? opts.stepSeconds * 1000 : undefined);
        if (stepMs === undefined) {
            throw new Error("@colyseus/sdk reconciler: fixed simulation step is unknown. The " + "server room must call setFixedTimestep() (or setTimestep()) so the " + "input handle advertises a tick rate, or pass stepMs/stepSeconds " + "explicitly — a wrong dt silently diverges rollback-replay.");
        }
        this.stepMs = stepMs;
        // ctx.dt: authoritative seconds. Prefer the handle's stepSeconds (server's
        // exact 1/tickRate); fall back to stepMs/1000 (1-ULP off at some rates).
        const dt = opts.stepSeconds ?? this.input_.stepSeconds ?? stepMs / 1000;
        // subDt = dt/subSteps: same expression as the server's ctx → bit-identical.
        const subSteps = opts.subSteps ?? this.input_.subSteps ?? 1;
        this.stepCtx = {
            dt,
            dtMs: stepMs,
            tick: 0,
            isReplay: false,
            reckonTime: 0,
            lagCompActive: false,
            subSteps,
            subDt: dt / subSteps,
            subDtMs: stepMs / subSteps,
            // key-less form shares one slot per seq ("" — see StepContext.memo)
            memo: (keyOrCompute, compute)=>typeof keyOrCompute === "string" ? this.memos.run(this.stepCtx.tick, this.stepCtx.isReplay, keyOrCompute, compute) : this.memos.run(this.stepCtx.tick, this.stepCtx.isReplay, "", keyOrCompute),
            // live-only by construction: replayed steps re-run the physics, never the event
            predict: (sink, payload)=>{
                if (!this.stepCtx.isReplay) sink._predictFromSim(this.stepCtx.tick, payload, this.ackWatermark);
            }
        };
        this.onReconcile = opts.onReconcile;
        this.warnTolerance = opts.warnOnDivergence;
        this.lastAcked = this.input_.lastProcessed;
        this.lastEpoch = this.input_.epoch;
        // Only inputs sent AFTER this controller exists are predicted (catch-up
        // starts here); pre-existing sends belong to whatever ran before.
        this.predictedSeq = this.input_.sentCount;
        // OBSERVE the input stream: step our predicted simulation for each input
        // the app sends through the handle. The listener fires synchronously at the
        // end of `input.send()`, so prediction is current right after — reads
        // (`value`/`state`/`pose`) never have to trigger a catch-up. Fires after
        // subclass construction (only on a later send), so the hooks it calls are ready.
        this.unsubscribeSend = this.input_.onSend(()=>this.catchUp());
    }
    // --- Shared observe/reconcile loop -----------------------------------------
    /**
     * Advance one render frame (called by the owning `Predict.tick`): stamp the
     * render clock, reconcile if the server acked new input, then decay the
     * smooth-correction error. Live inputs are already stepped (eagerly, via the
     * `onSend` hook), so tick does NOT step them. The interpolation fraction is
     * derived from elapsed render time vs the fixed step (see {@link renderAlpha}),
     * so it holds steady at the latest step when stepping pauses.
     */ tick(now) {
        this.tickSeq++; // new frame — see noteRenderRead/catchUp
        const dt = this.lastTick < 0 ? 0 : now - this.lastTick;
        this.lastTick = now;
        // Advance the render interpolation clock by real frame time. Consumed per
        // applied step in catchUp; equals the fixed-step leftover while stepping
        // keeps up, so interpolation is as smooth as a classic accumulator. It just
        // grows when nothing consumes it (a PAUSE) — alpha clamps at 1 so the render
        // HOLDS at the latest step, and catchUp snaps the backlog back on resume.
        if (dt > 0 && this.stepMs > 0) this.renderAcc += dt;
        // Follow the handle's reset (reconnect / `input.reset()`): the epoch moved,
        // so our seq cursors describe a dead seq space — without this, predictedSeq
        // sits above the re-zeroed sentCount and catch-up no-ops (a frozen entity).
        // Must run BEFORE the ack poll: reset() re-syncs lastAcked, so the poll
        // below sees no phantom delta. Compare (not +1) absorbs multiple resets.
        const epoch = this.input_.epoch;
        if (epoch !== this.lastEpoch) {
            this.lastEpoch = epoch;
            this.reset();
        }
        const acked = this.input_.lastProcessed;
        if (acked > this.lastAcked) {
            this.lastAcked = acked;
            this.reconcile(acked);
        }
        this.markDirty(); // render clock advanced → any cached render pose is stale
        if (dt <= 0) return;
        const k = this.smoothMs <= 0 ? 1 : 1 - Math.exp(-dt / this.smoothMs);
        for (const f of this.smoothedFields())this.error[f] -= this.error[f] * k;
    }
    /**
     * Render interpolation fraction ∈ [0, 1]: how far into the current step interval
     * we are — the {@link renderAcc} leftover over `stepMs`. Eases 0→1 across one
     * step, then CLAMPS at 1 — so when stepping pauses (input gated off on death, a
     * menu, a freeze) the render HOLDS at the latest step instead of sawtoothing
     * back to the previous one. Read by the subclasses' `value`/`pose`.
     */ renderAlpha() {
        if (this.stepMs <= 0) return 1;
        const a = this.renderAcc / this.stepMs;
        return a < 0 ? 0 : a > 1 ? 1 : a;
    }
    /**
     * Record a render read (`value`/`pose` — the subclasses call this at the top
     * of theirs). A read taken while a full fixed step is DUE but not yet applied
     * (`renderAcc ≥ stepMs`, alpha clamped at 1) returns a one-step-stale pose; if
     * this frame's `input.send()` calls then arrive AFTER it, the app rendered
     * stale motion — the read-before-pump wiring bug ({@link catchUp} warns once).
     * The correct frame order is: `predict.tick(now)` → send the due inputs →
     * read `value()`/`pose()`. Raw `state`/`world` reads (game logic, hit-reg)
     * don't come through here and are order-independent. Reads made from inside
     * controller-driven user code (a `step` or effect during catch-up/replay) are
     * skipped — they aren't the app's render pass.
     */ noteRenderRead() {
        if (this.catching || this.stepMs <= 0 || this.renderAcc < this.stepMs) return;
        this.clampedReadTick = this.tickSeq;
    }
    /**
     * Step every input sent since the last catch-up (predict each, zero-latency).
     * Driven by the input handle's `onSend` hook (subscribed in the constructor),
     * so it runs synchronously at the end of each `input.send()` — normally
     * stepping exactly the one just-sent input. The loop (rather than a single
     * step) makes it robust to a missed notification. Idempotent once caught up.
     */ catchUp() {
        const sent = this.input_.sentCount;
        if (this.predictedSeq >= sent || this.catching) return;
        // A render value was read earlier THIS frame at clamped alpha, and the
        // frame's sends are only arriving now — the app rendered a one-step-stale
        // pose (frame jitter becomes visible stutter on fast objects). Warn once.
        if (this.clampedReadTick === this.tickSeq && !this.warnedStaleRead) {
            this.warnedStaleRead = true;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["warnReadBeforePump"])();
        }
        this.catching = true;
        this.stepCtx.isReplay = false; // live forward steps
        for(let seq = this.predictedSeq + 1; seq <= sent; seq++){
            const inp = this.input_.at(seq);
            if (inp !== undefined) {
                // Snapshot the pre-step smoothed value so the render lerps prev →
                // current across this step by `renderAlpha()`.
                this.snapshotPrev();
                this.runStep(seq, inp); // predict from the round-tripped wire input
                this.refreshRender();
                // Consume one step of the render clock, resyncing it into [0, stepMs)
                // so the interpolation is smooth across every regime:
                //   • steady play: the clock is already < stepMs after each step, so
                //     this leaves the exact fixed-step leftover (both branches skip).
                //   • LOAD offset (reconciler born mid-frame, first tick dt=0 → clock
                //     lags the pacing accumulator): the subtract goes negative → snap
                //     to 0, resyncing instead of drifting out of phase.
                //   • PAUSE / tab-in HITCH (input gated off, so the clock grew for
                //     many frames with no consume): a WHOLE step of lead remains after
                //     the subtract → drop the stale whole-steps (%=), so the resuming
                //     step renders from the real leftover, not a pinned alpha=1.
                this.renderAcc -= this.stepMs;
                if (this.renderAcc < 0) this.renderAcc = 0;
                else if (this.renderAcc >= this.stepMs) this.renderAcc %= this.stepMs;
            }
            this.predictedSeq = seq;
        }
        this.catching = false;
    }
    /**
     * Set the shared step context for `seq` (tick + reckon instant), then let the
     * subclass run the user step. Used by both the live input path and the
     * reconcile replay loop, so the exact same step invocation drives forward and
     * rollback. `isReplay` is set by the caller before this.
     */ runStep(seq, input) {
        this.stepCtx.tick = seq;
        // Per-seq stamp when lag-comp stamped this seq (same value live + on
        // every replay); else resolve to the live serverNow() — the fallback
        // every consumer previously hand-wrote. 0 only with no clock (bare tests).
        const raw = this.input_.reckonTimeAt(seq);
        this.stepCtx.lagCompActive = raw > 0;
        this.stepCtx.reckonTime = raw > 0 ? raw : this.clock !== undefined ? this.clock.serverNow() : 0;
        this.applyStep(input);
    }
    /**
     * Adopt the authoritative state and replay unacked inputs. Captures the
     * rendered pose first, adopts truth, replays the still-unacked inputs, then
     * re-bases the error so the rendered pose is UNCHANGED at this instant — the
     * correction then decays out via {@link tick}, hiding the pop.
     *
     * WIRE-PRECISION SHORT-CIRCUIT: when {@link truthMatchesAt} reports the
     * prediction at `acked` is wire-indistinguishable from the decoded truth,
     * adopt+replay are SKIPPED and the client keeps its own (full-precision)
     * state. This is what makes lossy wire types (float32 / auto `number`)
     * safe for reconciled fields: adopting a rounded truth over a correct
     * prediction injects rounding noise into the restore point, and at a
     * knife-edge sim branch (a grounded check, a step-up test) that epsilon
     * flips the branch — a real mispredict born from the wire, not the sim.
     * Skipping is also the fast path: a clean reconcile costs one per-field
     * compare instead of adopt + replay × pending. Ack bookkeeping still runs
     * (memo prune, `onReconcile`, zero-correction telemetry).
     */ reconcile(acked) {
        // Drift telemetry runs only when watched — `warnOnDivergence` set or the
        // debug bundle loaded — so production that uses neither pays nothing.
        const diag = this.warnTolerance !== undefined || (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["diagnosticsActive"])();
        if (this.truthMatchesAt(acked)) {
            if (diag) {
                for (const f of this.smoothedFields())this.lastCorrection[f] = 0;
                this.lastCorrectionMag = 0;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateDrift"])(this.drift, 0); // a perfect reconcile — decay the rolling drift
            }
            this.reconcileSeq++;
            this.memos.prune(acked);
            this.onReconcile?.(acked);
            return;
        }
        // Smoothed value before reconcile (NON-interpolated): keeping `prev`
        // intact lets step-smoothing continue, and a prediction that MATCHED the
        // server induces ZERO new correction (error stays 0).
        const renderedBefore = this.renderedBefore; // reused scratch (no per-reconcile alloc)
        for (const f of this.smoothedFields())renderedBefore[f] = this.readCurrent(f) + this.error[f];
        this.adoptTruth();
        // Replay still-unacked inputs from the handle's buffer (controller keeps
        // no copies). Skip anything sent at/before the last reset — it applied to
        // a prior life (respawn) and must not re-run.
        const from = Math.max(acked, this.replayFrom);
        this.stepCtx.isReplay = true; // rollback re-sim of buffered inputs
        this.catching = true; // guard: replay-driven user code isn't a render pass, and must not recurse
        replayDepth++; // backstop for channel.predict() called without ctx (see isReplaying)
        try {
            for(let seq = from + 1; seq <= this.input_.sentCount; seq++){
                const inp = this.input_.at(seq);
                if (inp !== undefined) this.runStep(seq, inp);
            }
        } finally{
            replayDepth--;
        }
        this.catching = false;
        this.refreshRender();
        // Replay reconstructed the predicted state up to the latest send, so the
        // live cursor is now current — subsequent catch-up has nothing to do.
        this.predictedSeq = this.input_.sentCount;
        // Re-base `error` so the smoothed value is unchanged at this instant, then
        // decays out via tick(). `prev` untouched (interpolation keeps flowing).
        // The raw correction (pre-smoothing pop) doubles as a debug gauge —
        // recorded regardless of smoothing mode so telemetry sees it either way.
        // The `error` rebase below is the REAL reconciliation and always runs.
        const hard = this.smoothMs <= 0;
        const wantMag = diag || this.snapThreshold > 0;
        let mag = 0;
        for (const f of this.smoothedFields()){
            const correction = renderedBefore[f] - this.readCurrent(f);
            this.error[f] = hard ? 0 : correction;
            if (wantMag) {
                const a = correction < 0 ? -correction : correction;
                if (a > mag) mag = a;
            }
            if (diag) this.lastCorrection[f] = correction;
        }
        // Past the snap threshold the correction is a TELEPORT, not an error: pop
        // every smoothed field to the corrected pose (see RollbackOptions.snap).
        // `prev` must re-seed too — zeroing `error` alone still lerps one render
        // step from the pre-jump pose (a one-frame glide across the map).
        const popped = this.snapThreshold > 0 && mag > this.snapThreshold;
        if (popped) {
            for (const f of this.smoothedFields()){
                this.error[f] = 0;
                this.prev[f] = this.readCurrent(f);
            }
        }
        this.reconcileSeq++;
        if (diag) {
            this.lastCorrectionMag = mag;
            // A detected teleport is not divergence — feeding it to the drift EMA
            // would false-fire warnOnDivergence on every respawn.
            if (!popped) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["updateDrift"])(this.drift, mag);
                if (this.warnTolerance !== undefined && (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyDrift"])(this.drift, this.warnTolerance) === "diverging") {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$divergence$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["warnDivergence"])(acked, this.lastCorrection, this.drift.ema, this.warnTolerance);
                }
            }
        }
        // Drop ctx.memo entries for acked seqs (they won't replay again) BEFORE
        // user code — replay only touches seqs > acked, so this never removes a
        // memo a still-pending replay needs.
        this.memos.prune(acked);
        this.onReconcile?.(acked);
    }
    /** Number of unacknowledged inputs currently buffered. */ get pendingCount() {
        return this.input_.pendingCount;
    }
    /**
     * Re-seed local state from the authoritative instance(s): clears the error
     * offsets, memos, and the in-flight window (prior-life sends won't replay).
     *
     * Mostly the library's job: the controller self-resets when the input handle
     * resets (reconnect / `input.reset()` — it polls `input.epoch`), and a
     * {@link RollbackOptions.snap} threshold pops big positional jumps
     * (teleport / respawn) with no reset at all. Call this yourself only for
     * discontinuities the library can't see: a schema field changed meaning with
     * no positional jump and no input flow (a round flip in a backgrounded tab),
     * app-side context went stale (a map swap), or in-flight inputs the app
     * knows are void (death).
     */ reset() {
        this.reseedState();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$drift$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resetDrift"])(this.drift); // fresh life — don't carry the prior life's drift
        // Forget in-flight inputs from the prior life — don't replay or re-step them.
        this.replayFrom = this.input_.sentCount;
        this.predictedSeq = this.input_.sentCount;
        this.lastAcked = this.input_.lastProcessed;
        this.renderAcc = 0; // fresh life renders at the reseeded state (alpha 0)
        this.memos.clear(); // prior life's memoized values must not replay
        this.markDirty();
    }
    /** Set when {@link dispose} is called — the owning Predict drops a `dead`
     *  child from its drive list on the next tick. */ dead = false;
    /** Teardown hooks run synchronously by {@link dispose} (after `dead` is
     *  set) — the owning Predict restores its `value()` overlay here, so bound
     *  reads fall back the instant the controller dies, not a tick later. */ disposedHooks = [];
    /** Register a teardown hook for {@link dispose}. Idempotent-safe: hooks run
     *  once (the list is drained). */ onDisposed(hook) {
        this.disposedHooks.push(hook);
    }
    /** Stop being driven by the owning Predict and unsubscribe from the input
     *  handle's sends. Runs {@link onDisposed} hooks synchronously. */ dispose() {
        this.dead = true;
        this.unsubscribeSend();
        for (const hook of this.disposedHooks.splice(0))hook();
    }
    /**
     * Is the prediction AT the acked seq wire-indistinguishable from the decoded
     * authoritative truth? `true` short-circuits {@link reconcile} (no adopt, no
     * replay — the client's own full-precision state stands). Requires per-seq
     * predicted-state history plus knowledge of each field's wire precision, so
     * only the flat `Reconciler` implements it (its truth is a declared `fields`
     * list on one schema instance); `SimReconciler` can't see through its
     * `adopt`/`pose` closures and inherits this default.
     */ truthMatchesAt(_acked) {
        return false;
    }
    /** Refresh any derived render state after a step (SimReconciler re-samples its
     *  pose). Called after each live catch-up step and once after reconcile replay.
     *  Default no-op (the flat Reconciler mutates its state in place). */ refreshRender() {}
    /** Invalidate any cached render pose after state/alpha changes. Default no-op
     *  (the flat Reconciler recomputes `value()` on read). */ markDirty() {}
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/predict/simReconciler.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SimReconciler",
    ()=>SimReconciler
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/predict/rollback.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/core/schema-reflect.mjs [app-ssr] (ecmascript)");
;
;
/**
 * SimReconciler — server-reconciled rollback for the entity (or entities) your
 * inputs control, when their authoritative truth isn't a single flat scalar list.
 *
 * The general counterpart to {@link Reconciler}. Both run the SAME rollback loop
 * (shared via {@link RollbackController}); where `Reconciler` mirrors a declared
 * `fields` list off ONE authoritative schema instance, `SimReconciler`
 * orchestrates that loop over whatever your inputs affect:
 *   - **composite scalar state** — several schema instances stepped together by a
 *     shared plain-math sim (e.g. `{ paddle, puck }`: your paddle by input, the puck
 *     it bounces, reconciled as one), or
 *   - **opaque engine state** — a physics solver whose truth (contacts, velocities,
 *     sub-bodies) is far more than a handful of numbers.
 *
 * AUTO-BOUND ENTRIES — the composite-scalar case is declarative: put the DECODED
 * schema instances themselves in `world` and the controller derives everything
 * from their schema metadata:
 *   - each bound entry is replaced IN PLACE by a plain scratch **mirror** seeded
 *     from the instance's scalar fields — `step` mutates the mirror, never the
 *     decoded tree;
 *   - reconcile re-copies every bound field from the instance on EVERY ack
 *     (unconditional pull — replay has mutated the mirror since the last adopt,
 *     so even an unchanged field must be re-seeded or replay double-applies);
 *   - numeric bound fields become render-pose fields keyed `"<part>.<field>"`
 *     (`"paddle.x"`, `"puck.vx"`), smoothed + interpolated like any pose field;
 *     non-numeric scalars (strings, booleans) are adopted verbatim but not posed.
 *     The owning `Predict` also registers each bound (instance, numeric field)
 *     into `predict.value(instance, field)`, so bound entities render through the
 *     same read idiom as remotes.
 *
 * Detection is by decode identity, top-level `world` entries only (deliberately
 * shallow): an entry with a decoder-assigned refId is part of the replicated tree,
 * i.e. a truth source — bound. A locally-constructed schema instance (no refId)
 * throws (pass the decoded one, or a plain object for scratch). Anything else —
 * engine handles, plain literals — is opaque and untouched; to keep a decoded
 * instance opaque on purpose, nest it below a plain wrapper.
 *
 * Bound sources are PINNED at construction: a server-side ref swap
 * (`state.puck = new Puck()`) is not followed — recreate the controller if your
 * server replaces instances (in-place mutation is the norm).
 *
 * For opaque state, `adopt` / `pose` remain what they always were, and compose
 * with bound entries: bound triples adopt FIRST, then your `adopt` covers the
 * rest (it may derive from just-adopted mirrors); a custom `pose` contributes
 * fields in addition to the bound parts' auto fields (its keys win on collision).
 * At least one restore path is required — zero bound entries and no `adopt`
 * throws at construction.
 *
 * > **Tradeoff:** adopt reseeds SCALARS (bound fields + whatever your `adopt`
 * > copies) and replay reproduces the rest. Engine-INTERNAL non-scalar state
 * > (contact caches, sleeping islands, solver accumulators) is NOT rolled back
 * > across reconcile. Both shipped consumers (composite scalars; a physics-engine
 * > shooter reseeding position+velocity) are well-served by this; an engine that
 * > depends on internal state surviving reconcile would need a per-tick snapshot
 * > ring, which this controller intentionally does not carry.
 *
 * Smooth error correction operates on the RENDER POSE (auto-derived from bound
 * numeric fields, and/or returned by {@link SimReconcilerOptions.pose}): a
 * misprediction is absorbed into a per-pose-field visual offset that decays to 0
 * over a few frames, so corrections never pop. For non-lerp poses (3D
 * quaternions) pass {@link SimReconcilerOptions.interpolate} — the default is a
 * per-field numeric lerp (translation/scalar only).
 *
 * Fixed-timestep, same shape as `Reconciler`, and a pure OBSERVER: you mutate + send
 * through the input handle directly; `predict.tick(now)` returns how many fixed steps
 * are due and drives reconcile + decay; the controller subscribes to the handle's
 * `onSend` and runs `step` for each input right as you send it. Render reads
 * ({@link value}/{@link pose}) interpolate between the two latest steps so motion stays
 * smooth above the step rate.
 *
 * The lifecycle, keyed to network acks the app never sees directly:
 *
 *     your render frame:
 *                                          ┌─ new ack? ─▶ adopt (bound pulls + adopt())  adopt server truth
 *       n = predict.tick(now) ─────────────┤             step(ctx, world, cmd) × pend    replay, isReplay=true
 *                                          │             refresh pose (once)
 *                                          └─ always ──▶ error decay
 *       n × (input.data = …; input.send()) ─▶            step(ctx, world, cmd)           live, isReplay=false (on send)
 *       draw(predict.value(player, "x"))   ◀── pure read: interpolate + smooth
 *
 * Composite-scalar example (no engine — the common case):
 *
 *     const input = room.input({ type: MoveInput, mode: "reliable" });
 *     const me = predict.sim({
 *         input,
 *         world: {
 *             paddle: player,                                      // decoded schema ⇒ auto-bound
 *             puck:   room.state.puck,                             // ⇒ auto-bound (x, y, vx, vy)
 *         },
 *         step: (ctx, w, cmd) => stepWorld(w, cmd, ctx.dt),        // SHARED with the server
 *         smoothMs: 65,
 *     });
 *     const n = predict.tick(now);                                 // fixed steps due this frame
 *     for (let i = 0; i < n; i++) { stage(input.data); input.send(); } // mutate + send via handle
 *     draw(predict.value(player, "x"), predict.value(room.state.puck, "x")); // one read idiom
 *     aim(me.world.paddle);                                        // raw predicted state for logic
 *
 * Engine-backed example (a physics solver — opaque world, explicit adopt/pose):
 *
 *     const me = predict.sim({
 *         input,
 *         world: { world, body },                                  // the engine handle
 *         step:  (ctx, w, cmd) => { applyInput(w.body, cmd); w.world.step(); }, // dt = ctx.dt
 *         adopt: (w) => { w.body.setTranslation({ x: self.x, y: self.y }, true); },
 *         pose:  (w) => { const t = w.body.translation(); return { x: t.x, y: t.y }; },
 *     });
 */ class SimReconciler extends __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$predict$2f$rollback$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RollbackController"] {
    /** Your world handle — set once at construction (bound entries already
     *  materialized into mirrors), passed to every callback, never swapped. */ worldHandle;
    /** Auto-bound entries (decoded schema instances found in `world`),
     *  resolved once at construction. Empty for fully-opaque worlds. */ bindings = [];
    /** Current step's RAW pose, refreshed after every step: bound
     *  `"<part>.<field>"` fields read off the mirrors + the custom `pose`
     *  callback's fields (written after — custom wins on key collision). */ curPose = {};
    /** Pose field names (bound keys ∪ custom keys), captured on the first
     *  {@link refreshPose}. */ poseFields = [];
    /** The custom `pose` callback's own field names (first-call snapshot). */ customFields = [];
    fieldsReady = false;
    /** Reused scratch for {@link pose}: smoothed prev/cur endpoints + memo. */ poseA = {};
    poseB = {};
    renderPose = {};
    /** Set whenever the pose endpoints/alpha change; {@link pose} recomputes once. */ poseDirty = true;
    step;
    adopt;
    /** The `pose` option callback, stored under a distinct name so it doesn't
     *  shadow the public {@link pose} method. */ readPose;
    interpolate;
    constructor(opts){
        super(opts);
        // Scan the world for decoded schema instances (top-level entries only —
        // deliberately shallow) and materialize each into a plain mirror IN
        // PLACE, so `step` and the app (via `me.world`) see the same object.
        const world = opts.world;
        for (const part of Object.keys(world)){
            const src = world[part];
            if (src === null || typeof src !== "object") continue;
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["refIdOf"])(src) === undefined) {
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["metadataOf"])(src) !== undefined) {
                    throw new Error(`predict.sim(): world.${part} is a schema instance that hasn't been ` + "decoded (no refId). Pass the decoded instance from room.state (e.g. " + "inside onAdd), or a plain object for opaque scratch.");
                }
                continue; // opaque entry (engine handle, scratch literal)
            }
            const { fields, numeric } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$core$2f$schema$2d$reflect$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["scalarFieldsOf"])(src);
            if (fields.length === 0) {
                throw new Error(`predict.sim(): world.${part} is a decoded ref with no scalar fields ` + "to bind. Binding a whole COLLECTION isn't supported (yet) — spread " + "its children into world parts (one entry per entity, fixed at " + "construction). Nest a scalar-less instance below a plain wrapper " + "if you meant it as an opaque handle.");
            }
            const mirror = {};
            for (const f of fields)mirror[f] = src[f];
            world[part] = mirror;
            const poseKeys = numeric.map((f)=>`${part}.${f}`);
            this.bindings.push({
                source: src,
                mirror,
                fields,
                numeric,
                poseKeys
            });
        }
        if (this.bindings.length === 0 && opts.adopt === undefined) {
            throw new Error("predict.sim(): no restore point — world has no schema-bound entries " + "and no adopt() was provided. Put decoded schema instances in world " + "(auto-bound), or provide adopt().");
        }
        this.worldHandle = opts.world;
        this.step = opts.step;
        this.adopt = opts.adopt;
        this.readPose = opts.pose;
        this.interpolate = opts.interpolate;
        // Seed pose from the world's current state.
        this.refreshPose();
        for (const f of this.poseFields){
            this.prev[f] = this.curPose[f];
            this.error[f] = 0;
        }
    }
    /** Read the world pose into {@link curPose}: bound fields off the mirrors,
     *  then the custom `pose` callback's fields (custom wins on collision).
     *  Captures the pose field set once, on the first call. */ refreshPose() {
        const cur = this.curPose;
        for (const b of this.bindings){
            const { mirror, numeric, poseKeys } = b;
            for(let i = 0; i < numeric.length; i++)cur[poseKeys[i]] = mirror[numeric[i]];
        }
        if (this.readPose !== undefined) {
            const pose = this.readPose(this.worldHandle);
            if (!this.fieldsReady) this.customFields = Object.keys(pose);
            for (const f of this.customFields)cur[f] = pose[f];
        }
        if (!this.fieldsReady) {
            const keys = [];
            for (const b of this.bindings)for (const k of b.poseKeys)keys.push(k);
            for (const f of this.customFields)if (!keys.includes(f)) keys.push(f);
            this.poseFields = keys;
            this.fieldsReady = true;
        }
        this.poseDirty = true;
    }
    /** Your world handle (passed to every callback). Bound entries read as their
     *  plain mirrors — capture parts from HERE (post-construction), not from the
     *  literal you passed in. Always current — inputs are stepped eagerly as you
     *  `send()` them (the reconciler observes the handle). */ get world() {
        return this.worldHandle;
    }
    /** @internal Bound (instance, numeric field, pose key) registrations for the
     *  owning Predict's `value()` overlay — one entry per bound world part. */ get boundRegistrations() {
        return this.bindings.map((b)=>({
                source: b.source,
                fields: b.numeric,
                poseKeys: b.poseKeys
            }));
    }
    /**
     * Rendered value for one pose field — bound fields by their dotted key
     * (`"paddle.x"`), custom pose fields by their own name: the predicted pose
     * interpolated between the previous and current fixed step by
     * {@link renderAlpha}, plus the decaying correction offset. When a custom
     * {@link SimReconcilerOptions.interpolate} is set, reads it off the
     * interpolated {@link pose}. For bound entities prefer the room-wide idiom
     * `predict.value(instance, field)` — same value, no handle threading.
     */ value(field) {
        this.noteRenderRead();
        if (this.interpolate) return this.pose()[field];
        const c = this.curPose[field] + (this.error[field] ?? 0);
        const p = this.prev[field] ?? c;
        return p + (c - p) * this.renderAlpha();
    }
    /**
     * The full interpolated + smooth-corrected render pose (bound `"part.field"`
     * keys included). Use this (not repeated {@link value} calls) when a custom
     * `interpolate` is set — it's computed once per frame and memoized. The
     * returned record is REUSED — read it synchronously.
     */ pose() {
        this.noteRenderRead();
        if (!this.poseDirty) return this.renderPose;
        const t = this.renderAlpha();
        const a = this.poseA, b = this.poseB;
        for (const f of this.poseFields){
            a[f] = this.prev[f] ?? this.curPose[f];
            b[f] = this.curPose[f] + (this.error[f] ?? 0);
        }
        if (this.interpolate) {
            const out = this.interpolate(a, b, t);
            for (const f of this.poseFields)this.renderPose[f] = out[f];
        } else {
            for (const f of this.poseFields)this.renderPose[f] = a[f] + (b[f] - a[f]) * t;
        }
        this.poseDirty = false;
        return this.renderPose;
    }
    // --- RollbackController hooks ----------------------------------------------
    smoothedFields() {
        return this.poseFields;
    }
    readCurrent(field) {
        return this.curPose[field];
    }
    applyStep(input) {
        this.step(this.stepCtx, this.worldHandle, input);
    }
    /** Bound triples pull first — every bound field, unconditionally (replay has
     *  mutated the mirrors since the last adopt, so even a server-unchanged field
     *  must be re-seeded or the next replay double-applies inputs on top of a
     *  stale predicted value). The user `adopt` then covers the opaque rest. */ adoptTruth() {
        for (const b of this.bindings){
            const { source, mirror, fields } = b;
            for(let i = 0; i < fields.length; i++)mirror[fields[i]] = source[fields[i]];
        }
        this.adopt?.(this.worldHandle);
    }
    refreshRender() {
        this.refreshPose();
    }
    markDirty() {
        this.poseDirty = true;
    }
    snapshotPrev() {
        for (const f of this.poseFields)this.prev[f] = this.curPose[f] + this.error[f];
    }
    reseedState() {
        this.adoptTruth();
        this.refreshPose();
        for (const f of this.poseFields){
            this.prev[f] = this.curPose[f];
            this.error[f] = 0;
        }
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/serializer/NoneSerializer.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NoneSerializer",
    ()=>NoneSerializer
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
class NoneSerializer {
    setState(rawState) {}
    getState() {
        return null;
    }
    patch(patches) {}
    teardown() {}
    handshake(bytes) {}
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/serializer/SchemaSerializer.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SchemaSerializer",
    ()=>SchemaSerializer,
    "getStateCallbacks",
    ()=>getStateCallbacks
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
;
//
// TODO: use a schema interface, which even having duplicate definitions, it could be used to get the callback proxy.
//
// ```ts
//     export type SchemaCallbackProxy<RoomState> = (<T extends ISchema>(instance: T) => CallbackProxy<T>);
//     export function getStateCallbacks<T extends ISchema>(room: Room<T>) {
// ```
//
function getStateCallbacks(room) {
    try {
        // SchemaSerializer
        // @ts-ignore
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDecoderStateCallbacks"])(room['serializer'].decoder);
    } catch (e) {
        // NoneSerializer
        return undefined;
    }
}
class SchemaSerializer {
    state;
    decoder;
    setState(encodedState, it) {
        // A full snapshot is authoritative: on a rejoin (decoder already
        // holds refs beyond the root) reconcile — entries the snapshot
        // doesn't contain were deleted/hidden while this client was off the
        // wire. A first join decodes onto a fresh tree — nothing to
        // reconcile, skip the bookkeeping (measured +10-25% on large
        // states). Patches stay additive. Older @colyseus/schema
        // resolutions lack decodeResync — degrade to the additive decode.
        if (this.decoder.root.refs.size > 1 && typeof this.decoder.decodeResync === "function") {
            this.decoder.decodeResync(encodedState, it);
        } else {
            this.decoder.decode(encodedState, it);
        }
    }
    getState() {
        return this.state;
    }
    patch(patches, it) {
        return this.decoder.decode(patches, it);
    }
    teardown() {
        this.decoder.root.clearRefs();
    }
    handshake(bytes, it) {
        if (this.state) {
            //
            // TODO: validate definitions against concreate this.state instance
            //
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Reflection"].decode(bytes, it); // no-op
            this.decoder = new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Decoder"](this.state);
        } else {
            // initialize reflected state from server
            this.decoder = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Reflection"].decode(bytes, it);
            this.state = this.decoder.state;
        }
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/serializer/Serializer.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSerializer",
    ()=>getSerializer,
    "registerSerializer",
    ()=>registerSerializer
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
const serializers = {};
function registerSerializer(id, serializer) {
    serializers[id] = serializer;
}
function getSerializer(id) {
    const serializer = serializers[id];
    if (!serializer) {
        throw new Error("missing serializer: " + id);
    }
    return serializer;
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/transport/H3Transport.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FrameReassembler",
    ()=>FrameReassembler,
    "H3TransportTransport",
    ()=>H3TransportTransport
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/schema/build/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
;
;
// 9 bytes is the maximum length of a variable-length integer prefix
const MAX_LENGTH_PREFIX_BYTES = 9;
/**
 * Reassembles length-prefixed frames from arbitrary byte chunks.
 *
 * A single WebTransport `reader.read()` may:
 *   - deliver multiple whole frames in one chunk
 *   - split a frame (or its length prefix) across multiple chunks
 *
 * This reassembler buffers partial data across reads so each dispatched
 * frame is exactly one complete message.
 */ class FrameReassembler {
    pending = new Uint8Array(0);
    push(chunk) {
        if (!chunk || chunk.byteLength === 0) {
            return [];
        }
        const bytes = this.pending.byteLength === 0 ? chunk : concatBytes(this.pending, chunk);
        const frames = [];
        let offset = 0;
        while(offset < bytes.byteLength){
            const it = {
                offset
            };
            let length;
            try {
                length = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decode"].number(bytes, it);
            } catch (e) {
                // length prefix is incomplete — wait for more bytes
                if (bytes.byteLength - offset <= MAX_LENGTH_PREFIX_BYTES) {
                    break;
                }
                throw e;
            }
            const frameEnd = it.offset + length;
            if (frameEnd > bytes.byteLength) {
                break;
            }
            frames.push(bytes.subarray(it.offset, frameEnd));
            offset = frameEnd;
        }
        this.pending = offset < bytes.byteLength ? bytes.slice(offset) : new Uint8Array(0);
        return frames;
    }
}
function concatBytes(a, b) {
    const out = new Uint8Array(a.byteLength + b.byteLength);
    out.set(a, 0);
    out.set(b, a.byteLength);
    return out;
}
class H3TransportTransport {
    wt;
    /** Connect URL — exposed so tooling (e.g. the debug panel) can show the
     *  endpoint, mirroring `WebSocketTransport.ws.url`. */ url;
    isOpen = false;
    events;
    reader;
    writer;
    unreliableReader;
    unreliableWriter;
    lengthPrefixBuffer = new Uint8Array(9);
    reliableReassembler = new FrameReassembler();
    unreliableReassembler = new FrameReassembler();
    constructor(events){
        this.events = events;
    }
    connect(url, options = {}) {
        this.url = url;
        const wtOpts = options.fingerprint && {
            // requireUnreliable: true,
            // congestionControl: "default", // "low-latency" || "throughput"
            serverCertificateHashes: [
                {
                    algorithm: 'sha-256',
                    // Pass the Uint8Array VIEW, not `.buffer`: the @fails-components Node client
                    // (1.6) rejects a raw ArrayBuffer here, silently failing the cert-hash match
                    // → "Opening handshake failed". Browsers accept either; Node wants the view.
                    value: new Uint8Array(options.fingerprint)
                }
            ]
        } || undefined;
        this.wt = new WebTransport(url, wtOpts);
        this.wt.ready.then((e)=>{
            console.log("WebTransport ready!", e);
            this.isOpen = true;
            this.unreliableReader = this.wt.datagrams.readable.getReader();
            // Datagram writer differs by runtime: the browser's native WebTransport
            // exposes `datagrams.writable` (a WritableStream); @fails-components/webtransport
            // 1.6 (Node) deprecates that in favor of `createWritable()`. Prefer the method
            // when present (silences the Node deprecation), else the standard property.
            const datagrams = this.wt.datagrams;
            this.unreliableWriter = (datagrams.createWritable ? datagrams.createWritable() : datagrams.writable).getWriter();
            const incomingBidi = this.wt.incomingBidirectionalStreams.getReader();
            incomingBidi.read().then((stream)=>{
                this.reader = stream.value.readable.getReader();
                this.writer = stream.value.writable.getWriter();
                // immediately write room/sessionId for establishing the room connection
                this.sendSeatReservation(options.roomId, options.sessionId, options.reconnectionToken, options.skipHandshake);
                // start reading incoming data
                this.readIncomingData();
                this.readIncomingUnreliableData();
            }).catch((e)=>{
                console.error("failed to read incoming stream", e);
                console.error("TODO: close the connection");
            });
        // this.events.onopen(e);
        }).catch((e)=>{
            // this.events.onerror(e);
            // this.events.onclose({ code: e.closeCode, reason: e.reason });
            console.log("WebTransport not ready!", e);
            this._close();
        });
        this.wt.closed.then((e)=>{
            console.log("WebTransport closed w/ success", e);
            this.events.onclose({
                code: e.closeCode,
                reason: e.reason
            });
        }).catch((e)=>{
            console.log("WebTransport closed w/ error", e);
            this.events.onerror(e);
            this.events.onclose({
                code: e.closeCode,
                reason: e.reason
            });
        }).finally(()=>{
            this._close();
        });
    }
    send(data) {
        this.writer.write(this.frame(data));
    }
    sendUnreliable(data) {
        this.unreliableWriter.write(this.frame(data));
    }
    /**
     * Length-prefix a payload for the wire. Normalizes the input to a typed array
     * first: unlike `ws.send()` (which accepts an ArrayBuffer directly), we frame
     * manually — reading `.length` and copying via `.set()` — so a bare ArrayBuffer
     * (e.g. the debug panel's latency-sim clone) must be wrapped, or `.length` is
     * `undefined` and the allocation/copy goes out of bounds.
     */ frame(data) {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const prefixLength = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].number(this.lengthPrefixBuffer, bytes.length, {
            offset: 0
        });
        const out = new Uint8Array(prefixLength + bytes.length);
        out.set(this.lengthPrefixBuffer.subarray(0, prefixLength), 0);
        out.set(bytes, prefixLength);
        return out;
    }
    close(code, reason) {
        this.isOpen = false; // stop the reader loops; mark closed before tearing down
        try {
            // close() is void in the browser but can reject async (e.g. "session is
            // closed" when already closing/closed) in some impls — swallow both the
            // sync throw and any rejected promise so it doesn't surface as uncaught.
            const ret = this.wt?.close({
                closeCode: code,
                reason: reason
            });
            if (ret && typeof ret.catch === "function") {
                ret.catch(()=>{});
            }
        } catch (e) {
        /* already closed / invalid state — benign during a simulated drop */ }
    }
    readIncomingData() {
        return this.readLoop(this.reader, this.reliableReassembler, "reliable");
    }
    readIncomingUnreliableData() {
        return this.readLoop(this.unreliableReader, this.unreliableReassembler, "unreliable");
    }
    async readLoop(reader, reassembler, channel) {
        while(this.isOpen){
            let result;
            try {
                result = await reader.read();
            } catch (e) {
                await this.onChannelFailure(channel, e);
                return;
            }
            // Stream ended (close/drop): a `done` read has no `value` — bail
            // before decoding, or `decode.number(undefined)` throws on teardown.
            if (result.done || !result.value) {
                return;
            }
            //
            // a single read may contain multiple messages
            // each message is prefixed with its length
            // a read may also deliver a partial frame; buffer across reads
            //
            for (const frame of reassembler.push(result.value)){
                this.events.onmessage({
                    data: frame
                });
            }
        }
    }
    /**
     * Drops the connection after a read loop failed.
     *
     * A rejected `read()` is the end of that channel, never a hiccup: an errored
     * ReadableStream stays errored, so retrying re-raises the same rejection (a
     * busy loop) and a fresh reader taken off the same stream is born errored.
     * With nothing to recover, the only alternative to closing is a transport
     * that reports itself open but can never deliver another frame.
     */ async onChannelFailure(channel, e) {
        // Yield one turn before deciding. An implementation settles `wt.closed`
        // in the same turn it errors the streams, and this rejection lands
        // first, so letting that path flip `isOpen` keeps an ordinary
        // disconnect quiet. `WebTransport` exposes no session state to read
        // instead — the server side checks `_wtSession.state` synchronously.
        await new Promise((resolve)=>setTimeout(resolve, 0));
        if (!this.isOpen) {
            return;
        }
        console.error(`H3Transport: stopped reading the ${channel} channel while the session was open`, e);
        // ABNORMAL_CLOSURE so the room treats it as a drop and reconnects,
        // rather than a consented leave.
        this.close(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].ABNORMAL_CLOSURE, `h3 ${channel} channel failed`);
    }
    sendSeatReservation(roomId, sessionId, reconnectionToken, skipHandshake) {
        const it = {
            offset: 0
        };
        const bytes = [];
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(bytes, roomId, it);
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(bytes, sessionId, it);
        if (reconnectionToken) {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].string(bytes, reconnectionToken, it);
        }
        if (skipHandshake) {
            __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$schema$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encode"].boolean(bytes, 1, it);
        }
        this.writer.write(new Uint8Array(bytes).buffer);
    }
    _close() {
        this.isOpen = false;
    }
}
;
}),
"[project]/mtg/node_modules/@colyseus/sdk/build/transport/WebSocketTransport.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WebSocketTransport",
    ()=>WebSocketTransport
]);
// Copyright (c) 2026 Endel Dreyer.
//
// This software is released under the MIT License.
// https://opensource.org/license/MIT
//
// colyseus.js@0.18.6
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$ws$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/ws/wrapper.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/shared-types/build/Protocol.mjs [app-ssr] (ecmascript)");
;
;
const WebSocket = globalThis.WebSocket || __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$ws$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"];
// Once per process — the fallback is per-send, and a 60Hz input ring would
// otherwise flood the console.
let warnedNoUnreliableChannel = false;
class WebSocketTransport {
    ws;
    protocols;
    events;
    constructor(events){
        this.events = events;
    }
    send(data) {
        this.ws.send(data);
    }
    /**
     * WebSocket has no unreliable channel, so this falls back to the reliable
     * one — which is what every caller is written against (see `sendRequest`,
     * and the input handle's redundancy ring). Dropping instead loses every
     * `mode:"unreliable"` input and request silently: the server never sees
     * them, and the client's pending set grows without bound because nothing
     * is ever acked.
     *
     * The cost of falling back is bandwidth, not correctness — an input ring
     * carries `historySize` redundant slots the ordered channel doesn't need,
     * and the server dedupes them by wire seq exactly as it would over
     * datagrams. Use `@colyseus/h3-transport` for real unreliable delivery.
     */ sendUnreliable(data) {
        if (!warnedNoUnreliableChannel) {
            warnedNoUnreliableChannel = true;
            console.warn("@colyseus/sdk: the WebSocket transport has no unreliable channel — sending `mode:\"unreliable\"` traffic reliably instead. Use @colyseus/h3-transport (WebTransport) for datagram delivery.");
        }
        this.send(data);
    }
    /**
     * @param url URL to connect to
     * @param headers custom headers to send with the connection (only supported in Node.js. Web Browsers do not allow setting custom headers)
     */ connect(url, headers) {
        try {
            // Node or Bun environments (supports custom headers)
            this.ws = new WebSocket(url, {
                headers,
                protocols: this.protocols
            });
        } catch (e) {
            // browser environment (custom headers not supported)
            this.ws = new WebSocket(url, this.protocols);
        }
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = (event)=>this.events.onopen?.(event);
        this.ws.onmessage = (event)=>this.events.onmessage?.(event);
        this.ws.onclose = (event)=>this.events.onclose?.(event);
        this.ws.onerror = (event)=>this.events.onerror?.(event);
    }
    close(code, reason) {
        //
        // trigger the onclose event immediately if the code is MAY_TRY_RECONNECT
        // when "offline" event is triggered, the close frame is delayed. this
        // way client can try to reconnect immediately.
        //
        if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$shared$2d$types$2f$build$2f$Protocol$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CloseCode"].MAY_TRY_RECONNECT && this.events.onclose) {
            this.ws.onclose = null;
            this.events.onclose({
                code,
                reason
            });
        }
        // then we close the connection
        this.ws.close(code, reason);
    }
    get isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }
}
;
}),
];})()

//# sourceMappingURL=0lq9_%40colyseus_sdk_build_0posd1h0al1ef._.js.map
(()=>{"use strict";module.exports = [
"[project]/mtg/app/LiveWallpaper.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LiveWallpaper,
    "holdWallpaper",
    ()=>holdWallpaper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/motion.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
// The moving background of a page (the home page and the Decks page).
//   1. If you put your own file in  mtg/public/backgrounds/  named  home.mp4  or  home.webm  (a video), or  home.gif / home.webp /
//      home.png / home.jpg  (a picture), that plays behind the page.
//   2. Otherwise the page is just a plain dark background.
// The "Animations" switch in the top bar freezes it either way. It is all CSS (plus your file), so it costs almost nothing.
const PICTURE_TYPES = [
    "gif",
    "webp",
    "png",
    "jpg"
];
let holds = 0;
function holdWallpaper() {
    holds++;
    window.dispatchEvent(new Event("mtg-wallpaper-hold"));
    return ()=>{
        holds--;
        window.dispatchEvent(new Event("mtg-wallpaper-hold"));
    };
}
function subscribe(callback) {
    window.addEventListener("mtg-animations", callback);
    window.addEventListener("storage", callback);
    return ()=>{
        window.removeEventListener("mtg-animations", callback);
        window.removeEventListener("storage", callback);
    };
}
function LiveWallpaper({ name = "home" }) {
    const PICTURES = PICTURE_TYPES.map((type)=>`/backgrounds/${name}.${type}`);
    const running = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["animationsEnabled"], ()=>true);
    // Your file is only added once the page is running in the browser: an image that finished loading before the page woke up would never report it.
    const mounted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(()=>()=>undefined, ()=>true, ()=>false);
    // A pop-up with a blurred glass panel asks the wallpaper to hold still (blurring a frozen frame is far cheaper than a moving one).
    const held = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])((callback)=>{
        window.addEventListener("mtg-wallpaper-hold", callback);
        return ()=>window.removeEventListener("mtg-wallpaper-hold", callback);
    }, ()=>holds > 0, ()=>false);
    const video = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [videoReady, setVideoReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [videoFailed, setVideoFailed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false); // neither video file exists: only then are pictures looked for
    const [picture, setPicture] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0); // which picture name is being tried
    const [pictureReady, setPictureReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // The switch in the top bar also pauses your video.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = video.current;
        if (!el) return;
        if (running && !held) void el.play().catch(()=>undefined);
        else el.pause();
    }, [
        running,
        held,
        videoReady
    ]);
    // No point decoding frames nobody can see.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const onVisible = ()=>{
            const el = video.current;
            if (!el) return;
            if (document.hidden || !running || held) el.pause();
            else void el.play().catch(()=>undefined);
        };
        document.addEventListener("visibilitychange", onVisible);
        return ()=>document.removeEventListener("visibilitychange", onVisible);
    }, [
        running,
        held
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "aria-hidden": "true",
        className: `live-wallpaper ${running ? "" : "live-wallpaper-paused"}`,
        children: [
            mounted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: video,
                className: `live-custom ${videoReady ? "live-custom-on" : ""}`,
                autoPlay: true,
                loop: true,
                muted: true,
                playsInline: true,
                preload: "metadata",
                disablePictureInPicture: true,
                onLoadedData: ()=>setVideoReady(true),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                        src: `/backgrounds/${name}.mp4`,
                        type: "video/mp4"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/LiveWallpaper.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                        src: `/backgrounds/${name}.webm`,
                        type: "video/webm",
                        onError: ()=>setVideoFailed(true)
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/LiveWallpaper.tsx",
                        lineNumber: 95,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/LiveWallpaper.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            mounted && videoFailed && picture < PICTURES.length && !videoReady && // eslint-disable-next-line @next/next/no-img-element
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: PICTURES[picture],
                alt: "",
                className: `live-custom ${pictureReady ? "live-custom-on" : ""}`,
                onLoad: ()=>setPictureReady(true),
                onError: ()=>setPicture((p)=>p + 1)
            }, void 0, false, {
                fileName: "[project]/mtg/app/LiveWallpaper.tsx",
                lineNumber: 100,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/mtg/app/LiveWallpaper.tsx",
        lineNumber: 80,
        columnNumber: 5
    }, this);
}
}),
"[project]/mtg/app/login/LoginForm.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$Logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/Logo.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$dashCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/dashCache.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$LiveWallpaper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/LiveWallpaper.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/auth.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
const REQUEST_LIMIT_MS = 20_000;
/** A request that never answers (a dropped connection, a stuck server) must not leave the form on "Please wait…" for good. */ function withLimit(work) {
    return new Promise((resolve, reject)=>{
        const timer = setTimeout(()=>reject(new Error("timeout")), REQUEST_LIMIT_MS);
        Promise.resolve(work).then((v)=>(clearTimeout(timer), resolve(v)), (e)=>(clearTimeout(timer), reject(e)));
    });
}
function LoginForm() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [mode, setMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("login");
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [busy, setBusy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    async function submit(e) {
        e.preventDefault();
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeUsername"])(username);
        if (name.length < __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MIN_USERNAME_LENGTH"]) {
            setError("Enter a username.");
            return;
        }
        if (name.length > __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_USERNAME_LENGTH"]) {
            setError(`Username can be at most ${__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_USERNAME_LENGTH"]} characters.`);
            return;
        }
        if (password.length < __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MIN_PASSWORD_LENGTH"]) {
            setError("Enter a password.");
            return;
        }
        if (password.length > __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_PASSWORD_LENGTH"]) {
            setError(`Password can be at most ${__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_PASSWORD_LENGTH"]} characters.`);
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await attempt(name);
        } catch  {
            setError("The server did not answer in time. Check your connection and try again.");
            setBusy(false);
        }
    }
    async function attempt(name) {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])();
        const email = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usernameToEmail"])(name);
        if (mode === "login") {
            // signing in goes through our own route, which counts wrong passwords (5 wrong tries lock the account for 10 minutes)
            const res = await withLimit(fetch("/api/login", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    username: name,
                    password
                })
            })).catch(()=>null);
            const body = await res?.json().catch(()=>null);
            if (!res || !res.ok || !body?.access_token || !body.refresh_token) {
                setError(body?.error ?? "Could not reach the server. Try again.");
                setBusy(false);
                return;
            }
            const { error } = await withLimit(supabase.auth.setSession({
                access_token: body.access_token,
                refresh_token: body.refresh_token
            }));
            if (error) {
                setError(error.message);
                setBusy(false);
                return;
            }
        } else {
            const { data, error } = await withLimit(supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: name
                    }
                }
            }));
            if (error) {
                setError(error.message.includes("already registered") ? "That username is taken." : error.message);
                setBusy(false);
                return;
            }
            if (!data.session) {
                setError('Account created but not signed in: turn OFF "Confirm email" in Supabase (Authentication → Sign In / Providers → Email).');
                setBusy(false);
                return;
            }
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$dashCache$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearCached"])(); // whatever an earlier player left on this computer
        router.replace("/");
        router.refresh();
        // signed in, but the next page is slow to open: let the button come back rather than hang
        setTimeout(()=>setBusy(false), REQUEST_LIMIT_MS);
    }
    const signup = mode === "signup";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "relative flex flex-1 items-center justify-center overflow-x-clip p-5 text-white sm:p-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$LiveWallpaper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative flex w-full max-w-md flex-col items-center gap-7",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hero-scrim",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                        lineNumber: 121,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex flex-col items-center gap-2 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$Logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                size: 96,
                                glow: true,
                                className: "hero-rise mb-2"
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 123,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "hero-eyebrow hero-rise",
                                children: "A two-player card duel game"
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 124,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "hero-rise flex flex-col items-center gap-2 font-title",
                                style: {
                                    animationDelay: "0.06s"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "hero-title",
                                        style: {
                                            fontSize: "clamp(2.2rem, 9vw, 3.4rem)"
                                        },
                                        children: "DuelRealm"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 126,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "hero-mtg",
                                        children: "MTG"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 127,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 125,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: submit,
                        className: "panel-glass hero-rise relative flex w-full flex-col gap-5 p-6 sm:p-7",
                        style: {
                            animationDelay: "0.16s"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col gap-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "font-title text-xl font-extrabold uppercase tracking-[0.16em] text-[#ffe29a]",
                                        children: signup ? "Create account" : "Welcome back"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 133,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-slate-300",
                                        children: signup ? "Pick a username and a password to start dueling." : "Log in to build decks and join a match."
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 134,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 132,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex flex-col gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "field-label",
                                        children: "Username"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 138,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "auth-input",
                                        maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_USERNAME_LENGTH"],
                                        value: username,
                                        onChange: (e)=>setUsername(e.target.value),
                                        autoComplete: "username",
                                        autoFocus: true
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 139,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 137,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex flex-col gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "field-label",
                                        children: "Password"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 142,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "auth-input",
                                        type: "password",
                                        maxLength: __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MAX_PASSWORD_LENGTH"],
                                        value: password,
                                        onChange: (e)=>setPassword(e.target.value),
                                        autoComplete: signup ? "new-password" : "current-password"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                        lineNumber: 143,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 141,
                                columnNumber: 11
                            }, this),
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                role: "alert",
                                className: "rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-[#fecaca]",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 154,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "submit",
                                disabled: busy,
                                className: "btn-gold w-full justify-center py-2.5",
                                children: busy ? "Please wait…" : signup ? "Create account" : "Log in"
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 159,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>{
                                    setMode(signup ? "login" : "signup");
                                    setError(null);
                                },
                                className: "text-sm text-slate-300 underline-offset-4 hover:text-[#ffe29a] hover:underline",
                                children: signup ? "Already have an account? Log in" : "No account yet? Create one"
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                                lineNumber: 163,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/mtg/app/login/LoginForm.tsx",
                        lineNumber: 131,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/login/LoginForm.tsx",
                lineNumber: 120,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/mtg/app/login/LoginForm.tsx",
        lineNumber: 118,
        columnNumber: 5
    }, this);
}
}),
"[project]/mtg/lib/auth.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MAX_PASSWORD_LENGTH",
    ()=>MAX_PASSWORD_LENGTH,
    "MAX_USERNAME_LENGTH",
    ()=>MAX_USERNAME_LENGTH,
    "MIN_PASSWORD_LENGTH",
    ()=>MIN_PASSWORD_LENGTH,
    "MIN_USERNAME_LENGTH",
    ()=>MIN_USERNAME_LENGTH,
    "normalizeUsername",
    ()=>normalizeUsername,
    "usernameToEmail",
    ()=>usernameToEmail
]);
// Supabase Auth needs an email, but this game uses plain usernames.
// Each username maps to a placeholder address. Supabase rejects domains that have no mail
// servers (example.com and friends), so this must be a domain with real MX records.
// Nothing is ever sent to these addresses as long as "Confirm email" stays OFF in Supabase
// and password-reset emails are never used. Override with NEXT_PUBLIC_AUTH_EMAIL_DOMAIN.
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "mailinator.com";
const MIN_USERNAME_LENGTH = 1;
const MAX_USERNAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 1;
const MAX_PASSWORD_LENGTH = 50;
const normalizeUsername = (username)=>username.trim().toLowerCase();
/** 53-bit string hash (cyrb53). Works over plain http too, unlike crypto.subtle. */ function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for(let i = 0; i < str.length; i++){
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const hash = (s)=>[
        1,
        2
    ].map((seed)=>cyrb53(s, seed).toString(16).padStart(14, "0")).join("");
function usernameToEmail(username) {
    const name = normalizeUsername(username);
    const local = /^[a-z0-9_]+$/.test(name) ? name : `h.${hash(name)}`;
    return `${local}@${EMAIL_DOMAIN}`;
}
}),
];})()

//# sourceMappingURL=mtg_1f_38zyxu4g3v._.js.map
(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/mtg/app/AudioMenu.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AudioMenu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/music/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/sound.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const HINT_KEY = "mtg-music-hint";
const HINT_MS = 9000;
const seenHint = ()=>{
    try {
        return localStorage.getItem(HINT_KEY) === "seen";
    } catch  {
        return true;
    }
};
const markHint = ()=>{
    try {
        localStorage.setItem(HINT_KEY, "seen");
    } catch  {
    // ignore: the hint may show once more
    }
};
const heading = "font-display text-xs font-bold uppercase tracking-widest text-amber-200";
function Volume({ label, value, onChange, onDone, disabled }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: `flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "w-14 shrink-0",
                children: label
            }, void 0, false, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "range",
                min: 0,
                max: 100,
                value: Math.round(value * 100),
                disabled: disabled,
                onChange: (e)=>onChange(Number(e.target.value) / 100),
                onPointerUp: onDone,
                onKeyUp: onDone,
                className: "min-w-0 flex-1 accent-amber-400"
            }, void 0, false, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "w-10 shrink-0 text-right tabular-nums",
                children: [
                    Math.round(value * 100),
                    "%"
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/mtg/app/AudioMenu.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_c = Volume;
function AudioMenu() {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hint, setHint] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [, setVersion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0); // re-read the settings when the music starts, stops or changes
    const [volume, setVolume] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["musicVolume"]);
    const [effects, setEffects] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["soundEnabled"]);
    const [effectsVolume, setEffectsVolume] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["soundVolume"]);
    const root = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // The first time the music starts, say where to change it.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AudioMenu.useEffect": ()=>{
            let hide;
            const onChange = {
                "AudioMenu.useEffect.onChange": ()=>{
                    setVersion({
                        "AudioMenu.useEffect.onChange": (n)=>n + 1
                    }["AudioMenu.useEffect.onChange"]);
                    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playingTrack"])() || seenHint()) return;
                    markHint();
                    setHint(true);
                    hide = setTimeout({
                        "AudioMenu.useEffect.onChange": ()=>setHint(false)
                    }["AudioMenu.useEffect.onChange"], HINT_MS);
                }
            }["AudioMenu.useEffect.onChange"];
            window.addEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MUSIC_EVENT"], onChange);
            return ({
                "AudioMenu.useEffect": ()=>{
                    window.removeEventListener(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MUSIC_EVENT"], onChange);
                    clearTimeout(hide);
                }
            })["AudioMenu.useEffect"];
        }
    }["AudioMenu.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AudioMenu.useEffect": ()=>{
            if (!open) return;
            const away = {
                "AudioMenu.useEffect.away": (e)=>!root.current?.contains(e.target) && setOpen(false)
            }["AudioMenu.useEffect.away"];
            const esc = {
                "AudioMenu.useEffect.esc": (e)=>e.key === "Escape" && setOpen(false)
            }["AudioMenu.useEffect.esc"];
            window.addEventListener("pointerdown", away);
            window.addEventListener("keydown", esc);
            return ({
                "AudioMenu.useEffect": ()=>{
                    window.removeEventListener("pointerdown", away);
                    window.removeEventListener("keydown", esc);
                }
            })["AudioMenu.useEffect"];
        }
    }["AudioMenu.useEffect"], [
        open
    ]);
    const on = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["musicEnabled"])();
    const track = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["musicTrack"])();
    const playing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playingTrack"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: root,
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>{
                    setOpen(!open);
                    setHint(false);
                },
                "aria-expanded": open,
                "aria-haspopup": "dialog",
                title: "Change the music, or the music and sound volume",
                className: "flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-400/15 px-2 py-1 transition hover:bg-amber-400/25",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": "true",
                        children: "♫"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-semibold text-amber-100 max-[479px]:hidden",
                        children: on ? track.name : "Music off"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 103,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": "true",
                        className: "text-xs",
                        children: "▾"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this),
            hint && !open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "status",
                className: "absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-950 shadow-xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-amber-300 bg-amber-50",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 111,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            "Now playing ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-semibold",
                                children: track.name
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 113,
                                columnNumber: 25
                            }, this),
                            ". Click here to pick another tune or change the volume."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 112,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 110,
                columnNumber: 9
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                role: "dialog",
                "aria-label": "Music and sound",
                className: "absolute right-0 top-full z-50 mt-2 flex w-80 flex-col gap-3 rounded-xl border border-white/20 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "flex flex-col gap-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: heading,
                                children: "Music"
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 121,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                role: "radiogroup",
                                "aria-label": "Music",
                                className: "flex flex-col gap-1",
                                children: [
                                    __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRACKS"].map((t)=>{
                                        const chosen = on && t.id === track.id;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            role: "radio",
                                            "aria-checked": chosen,
                                            onClick: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setMusicTrack"])(t.id),
                                            className: `rounded-lg border px-2.5 py-1.5 text-left transition ${chosen ? "border-amber-400 bg-amber-400/20" : "border-white/15 bg-white/5 hover:bg-white/10"}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "flex items-center gap-2 font-semibold",
                                                    children: [
                                                        t.name,
                                                        chosen && playing?.id === t.id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "rounded bg-amber-400 px-1.5 text-[10px] font-extrabold uppercase text-black",
                                                            children: "Playing"
                                                        }, void 0, false, {
                                                            fileName: "[project]/mtg/app/AudioMenu.tsx",
                                                            lineNumber: 135,
                                                            columnNumber: 58
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/mtg/app/AudioMenu.tsx",
                                                    lineNumber: 133,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block text-xs text-slate-300",
                                                    children: t.blurb
                                                }, void 0, false, {
                                                    fileName: "[project]/mtg/app/AudioMenu.tsx",
                                                    lineNumber: 137,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, t.id, true, {
                                            fileName: "[project]/mtg/app/AudioMenu.tsx",
                                            lineNumber: 126,
                                            columnNumber: 19
                                        }, this);
                                    }),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        role: "radio",
                                        "aria-checked": !on,
                                        onClick: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setMusicEnabled"])(false),
                                        className: `rounded-lg border px-2.5 py-1.5 text-left text-sm font-semibold transition ${!on ? "border-amber-400 bg-amber-400/20" : "border-white/15 bg-white/5 hover:bg-white/10"}`,
                                        children: "No music"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                                        lineNumber: 141,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 122,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Volume, {
                                label: "Volume",
                                value: volume,
                                disabled: !on,
                                onChange: (v)=>{
                                    setVolume(v);
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setMusicVolume"])(v);
                                }
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 150,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 120,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: "flex flex-col gap-1.5 border-t border-white/15 pt-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: heading,
                                        children: "Sound effects"
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                                        lineNumber: 163,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setSoundEnabled"])(!effects);
                                            setEffects(!effects);
                                            if (!effects) (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playSound"])("draw");
                                        },
                                        "aria-pressed": effects,
                                        className: "rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-sm transition hover:bg-white/20",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: effects ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400",
                                            children: effects ? "On" : "Off"
                                        }, void 0, false, {
                                            fileName: "[project]/mtg/app/AudioMenu.tsx",
                                            lineNumber: 173,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                                        lineNumber: 164,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 162,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Volume, {
                                label: "Volume",
                                value: effectsVolume,
                                disabled: !effects,
                                onChange: (v)=>{
                                    setEffectsVolume(v);
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setSoundVolume"])(v);
                                },
                                onDone: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playSound"])("hit")
                            }, void 0, false, {
                                fileName: "[project]/mtg/app/AudioMenu.tsx",
                                lineNumber: 176,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/mtg/app/AudioMenu.tsx",
                        lineNumber: 161,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/AudioMenu.tsx",
                lineNumber: 119,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/mtg/app/AudioMenu.tsx",
        lineNumber: 91,
        columnNumber: 5
    }, this);
}
_s(AudioMenu, "ct6f16vrdWTFcAKoqvF6OpL0Qww=");
_c1 = AudioMenu;
var _c, _c1;
__turbopack_context__.k.register(_c, "Volume");
__turbopack_context__.k.register(_c1, "AudioMenu");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/Logo.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The DuelRealm logo (public/logo.svg) as a round picture: a gold ring with the five-color wheel.
 * `size` is in pixels. The picture has square corners in its file, the circle crop hides them.
 */ __turbopack_context__.s([
    "default",
    ()=>Logo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Logo({ size = 40, className = "", glow = false }) {
    return(// eslint-disable-next-line @next/next/no-img-element
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: "/logo.svg",
        alt: "",
        width: size,
        height: size,
        draggable: false,
        className: `shrink-0 select-none rounded-full object-cover ${glow ? "shadow-[0_0_34px_rgba(244,180,61,0.45)]" : ""} ${className}`,
        style: {
            width: size,
            height: size
        }
    }, void 0, false, {
        fileName: "[project]/mtg/app/Logo.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this));
}
_c = Logo;
var _c;
__turbopack_context__.k.register(_c, "Logo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/Music.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Music
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/music/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/sound.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Music() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Music.useEffect": ()=>{
            const begin = {
                "Music.useEffect.begin": ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["audioContext"])();
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startMusic"])();
                }
            }["Music.useEffect.begin"];
            window.addEventListener("pointerdown", begin, {
                once: true
            });
            window.addEventListener("keydown", begin, {
                once: true
            });
            return ({
                "Music.useEffect": ()=>{
                    window.removeEventListener("pointerdown", begin);
                    window.removeEventListener("keydown", begin);
                }
            })["Music.useEffect"];
        }
    }["Music.useEffect"], []);
    return null;
}
_s(Music, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = Music;
var _c;
__turbopack_context__.k.register(_c, "Music");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/RegisterSW.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RegisterSW
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function RegisterSW() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RegisterSW.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) return;
            //TURBOPACK unreachable
            ;
        }
    }["RegisterSW.useEffect"], []);
    return null;
}
_s(RegisterSW, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = RegisterSW;
var _c;
__turbopack_context__.k.register(_c, "RegisterSW");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/UserBar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>UserBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$Logo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/Logo.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/motion.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/online/session.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$dashCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/dashCache.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$AudioMenu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/AudioMenu.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
function UserBar() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [username, setUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [animations, setAnimations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["animationsEnabled"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserBar.useEffect": ()=>{
            const { data } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])().auth.onAuthStateChange({
                "UserBar.useEffect": (_event, session)=>{
                    setUsername(session ? session.user.user_metadata.username ?? "player" : null);
                    // signed in: friends can see this player is online, on whatever page they are
                    if (session) void (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocial"])();
                    else {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["disconnectSocial"])();
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$dashCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearCached"])(); // the next person on this computer must not see this player's name
                    }
                }
            }["UserBar.useEffect"]);
            return ({
                "UserBar.useEffect": ()=>data.subscription.unsubscribe()
            })["UserBar.useEffect"];
        }
    }["UserBar.useEffect"], []);
    if (!username) return null;
    async function signOut() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$dashCache$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearCached"])();
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])().auth.signOut();
        router.replace("/login");
        router.refresh();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "topbar",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: "/",
                className: "flex items-center gap-2",
                "aria-label": "DuelRealm MTG home",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$Logo$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        size: 26
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 43,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "brand",
                        children: "DUELREALM"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "flex-1"
            }, void 0, false, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 46,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setAnimationsEnabled"])(!animations);
                    setAnimations(!animations);
                },
                "aria-pressed": animations,
                title: "Turn attack, confetti and other animations on or off",
                "aria-label": `Animations: ${animations ? "on" : "off"}`,
                className: "bar-btn",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "min-[480px]:hidden",
                        "aria-hidden": "true",
                        children: "✨ "
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "max-[479px]:hidden",
                        children: "Animations: "
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 57,
                        columnNumber: 74
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: animations ? "font-semibold text-[#6ee7b7]" : "font-semibold text-slate-400",
                        children: animations ? "On" : "Off"
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 57,
                        columnNumber: 130
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$AudioMenu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "hidden sm:inline",
                children: [
                    "Signed in as ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-semibold text-white",
                        children: username
                    }, void 0, false, {
                        fileName: "[project]/mtg/app/UserBar.tsx",
                        lineNumber: 61,
                        columnNumber: 22
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: signOut,
                className: "bar-btn",
                children: "Sign out"
            }, void 0, false, {
                fileName: "[project]/mtg/app/UserBar.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/mtg/app/UserBar.tsx",
        lineNumber: 41,
        columnNumber: 5
    }, this);
}
_s(UserBar, "qbJauP8SR5AxMJo9i6F46AOdjQo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = UserBar;
var _c;
__turbopack_context__.k.register(_c, "UserBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/cardText.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Help",
    ()=>Help,
    "cardAt",
    ()=>cardAt,
    "defNamed",
    ()=>defNamed,
    "itemName",
    ()=>itemName,
    "madeFor",
    ()=>madeFor,
    "paidPart",
    ()=>paidPart,
    "payWithLabel",
    ()=>payWithLabel,
    "printedLine",
    ()=>printedLine,
    "pumpNow",
    ()=>pumpNow,
    "readable",
    ()=>readable,
    "targetKey",
    ()=>targetKey,
    "targetName",
    ()=>targetName,
    "tokenNames",
    ()=>tokenNames
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/engine/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/engine/dist/core/permanents.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$glossary$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/glossary.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/players.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$stats$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/stats.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
;
function Help({ text, max = 3, large }) {
    const lines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$glossary$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["helpFor"])(text, max);
    if (lines.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: large ? "mt-1.5 block text-[15px] font-normal leading-relaxed text-zinc-700" : "mt-1 block text-xs font-normal leading-snug text-zinc-500",
        children: lines.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "block",
                children: [
                    "ⓘ ",
                    l
                ]
            }, `${i}-${l}`, true, {
                fileName: "[project]/mtg/app/play/cardText.tsx",
                lineNumber: 16,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/mtg/app/play/cardText.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = Help;
const targetKey = (t)=>t.kind === "player" || t.kind === "stack" ? `${t.kind}:${t.id}` : t.kind === "none" ? "none" : `${t.kind}:${t.iid}`;
function targetName(state, t) {
    if (t.kind === "none") return "No target (skip)";
    if (t.kind === "player") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(t.id);
    if (t.kind === "stack") {
        const item = state.stack.find((i)=>i.id === t.id);
        return item ? `${itemName(state, item)} (on the stack)` : "a spell";
    }
    for (const p of Object.values(state.players)){
        const perm = p.battlefield.find((x)=>x.card.iid === t.iid);
        if (perm) return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$stats$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nameWithStats"])(state, perm)} (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(p.id)})`;
        const dead = p.graveyard.find((x)=>x.iid === t.iid);
        if (dead) return `${state.cards[dead.defId].name} (in ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(p.id)}'s graveyard)`;
    }
    return t.iid;
}
function itemName(state, item) {
    return item.kind === "spell" ? state.cards[item.card.defId].name : `${item.sourceName} ability`;
}
const SELF = /\bthis (?:creature|artifact|token|enchantment|land|vehicle|permanent|card)\b/gi;
function printedLine(text, def) {
    if (!def?.text) return text;
    const self = (s)=>s.replace(SELF, "~").split(def.name).join("~");
    const plain = (s)=>self(s).replace(/\.$/, "").toLowerCase();
    const line = def.text.split("\n").map((l)=>l.replace(/\s*\([^)]*\)/g, "").trim()).find((l)=>plain(l) === plain(text));
    return line ? self(line).replace(/\.$/, "") : text;
}
const defNamed = (state, name)=>Object.values(state.cards).find((d)=>d.name === name);
function cardAt(state, iid) {
    for (const p of Object.values(state.players)){
        const card = [
            ...p.battlefield.map((x)=>x.card),
            ...p.hand,
            ...p.graveyard
        ].find((c)=>c.iid === iid);
        if (card) return {
            def: state.cards[card.defId],
            player: p.id
        };
    }
    return null;
}
function pumpNow(state, controller, effects) {
    const pump = effects.find((e)=>e.type === "pump" && e.per !== undefined);
    if (pump?.type !== "pump" || !pump.per) return null;
    const n = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["countFor"])(state, controller, pump.per);
    const signed = (each)=>`${each < 0 ? "-" : "+"}${Math.abs(each * n)}`;
    const per = pump.per;
    const what = per.kind !== "permanents" ? null : per.what === "subtype" ? per.subtype : per.what === "landType" ? per.landType : per.what;
    return `Right now: ${signed(pump.power)}/${signed(pump.toughness)}${what ? ` (${what.charAt(0).toUpperCase()}${what.slice(1)} ×${n})` : ""}${n === 0 ? ": it would do nothing" : ""}`;
}
function madeFor(effects, toughness) {
    const branch = effects.find((e)=>e.type === "ifSacrificedToughness");
    if (branch?.type !== "ifSacrificedToughness") return null;
    const made = (toughness >= branch.atLeast ? branch.then : branch.otherwise).flatMap((e)=>e.type === "createToken" && typeof e.amount === "number" ? [
            `${e.amount} ${e.token.name}`
        ] : []);
    return made.length > 0 ? made.join(" and ") : null;
}
function payWithLabel(state, iid, effects) {
    const perm = Object.values(state.players).flatMap((p)=>p.battlefield).find((p)=>p.card.iid === iid);
    if (!perm) return cardAt(state, iid)?.def.name ?? "a card";
    const made = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$stats$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isCreatureNow"])(state, perm) ? madeFor(effects, (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["toughnessOf"])(state, perm)) : null;
    return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$stats$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["nameWithStats"])(state, perm)}${perm.tapped ? " (tapped)" : ""}${made ? ` → ${made}` : ""}`;
}
function paidPart(text) {
    const m = /if this spell's additional cost was paid, ([^.]+\.)/i.exec(text);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null;
}
const tokenNames = (text)=>text.replace(/\b(food|treasure|blood|clue)(s?)\b/g, (_, t, s)=>`${t.charAt(0).toUpperCase()}${t.slice(1)}${s}`);
function readable(text, cardName) {
    const t = tokenNames(text.replace(/~/g, cardName).replace(/\{([a-z0-9]+)\}/g, (_, x)=>`{${x.toUpperCase()}}`));
    return t.charAt(0).toUpperCase() + t.slice(1);
}
var _c;
__turbopack_context__.k.register(_c, "Help");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/glossary.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// A plain-English reference for abilities and effects, so a player can see what a card or button really does.
// `helpFor(text)` looks through some rules text (a card, an ability, a stack item) and returns an explanation of each
// special term or effect it finds.
__turbopack_context__.s([
    "helpFor",
    ()=>helpFor,
    "helpForWord",
    ()=>helpForWord
]);
const RULES = [
    {
        match: /\bcycling\b/i,
        help: "Cycling: pay the cost and discard this card from your hand to draw a card. You can do it any time you have priority, even if you couldn't cast the card."
    },
    {
        match: /\bcrew \d+/i,
        help: "Crew N: tap any untapped creatures you control with total power N or more. This Vehicle then becomes an artifact creature until end of turn (it can attack and block, and be hit by creature spells)."
    },
    {
        match: /\bequip\b/i,
        help: "Equip: pay the cost to attach this Equipment to a creature you control. Only in your main phase with an empty stack. It stays attached (giving its bonus) until you move it; if the creature leaves, the Equipment stays."
    },
    {
        match: /\bflashback\b/i,
        help: "Flashback: you may cast this from your graveyard by paying its flashback cost. It is exiled afterwards (even if it is countered)."
    },
    {
        match: /\bprepared\b/i,
        help: "Prepared: while this creature is prepared, you may cast a copy of the spell printed beside it (paying that spell's cost, at that spell's timing). Doing so unprepares the creature. The copy goes nowhere afterwards."
    },
    {
        match: /\braid\b/i,
        help: "Raid: this ability does something only if you attacked with a creature this turn."
    },
    {
        match: /\beerie\b/i,
        help: "Eerie: triggers whenever an enchantment you control enters (an Aura, or an enchantment creature, counts)."
    },
    {
        match: /\bwarp\b/i,
        help: "Warp: you may cast this from your hand for its warp cost instead. It is exiled at the beginning of the next end step, and you may cast it from exile (for its normal cost) on a later turn."
    },
    {
        match: /\boffspring\b/i,
        help: "Offspring: you may pay the offspring cost as well when you cast this creature. If you do, when it enters you also get a 1/1 token copy of it."
    },
    {
        match: /\bblight \d+/i,
        help: "Blight N: put N -1/-1 counters on a creature you control. As an optional additional cost, it makes the spell do more."
    },
    {
        match: /\bexplores?\b/i,
        help: "Explore: reveal the top card of your library. A land goes into your hand. Otherwise this creature gets a +1/+1 counter, and you choose to keep that card on top or put it into your graveyard."
    },
    {
        match: /\binfusion\b/i,
        help: "Infusion: the extra effect happens only if you gained life this turn."
    },
    {
        match: /\bfinality counter\b/i,
        help: "Finality counter: if this permanent would go to the graveyard from the battlefield, it is exiled instead."
    },
    {
        match: /\bto solve\b/i,
        help: "Case: if the \"To solve\" condition is true at the beginning of your end step, the Case becomes solved for good, and its \"Solved\" ability can be used from then on."
    },
    {
        match: /\bward—pay \d+ life\b/i,
        help: "Ward—Pay N life: when this becomes the target of a spell or ability an opponent controls, that spell or ability is countered unless its controller pays N life."
    },
    {
        match: /\bstun counters?\b/i,
        help: "Stun counter: if the permanent would untap, one stun counter is removed from it instead."
    },
    {
        match: /\bkicker\b|\bkicked\b/i,
        help: "Kicker: when casting, you may pay the extra kicker cost. If you do, the parts that say \"if this was kicked\" happen too."
    },
    {
        match: /\bward\b/i,
        help: "Ward: when an opponent's spell or ability targets this, it is countered unless that player pays the ward cost."
    },
    {
        match: /\blandfall\b|whenever a land (you control )?enters/i,
        help: "Landfall: triggers every time a land enters the battlefield under your control (playing a land counts)."
    },
    {
        match: /\bexalted\b/i,
        help: "Exalted: whenever a creature you control attacks alone, it gets +1/+1 until end of turn. Each instance of exalted you control triggers, so they add up."
    },
    {
        match: /\bdelve\b/i,
        help: "Delve: while casting it, you may exile cards from your graveyard. Each card exiled pays for {1} of its cost."
    },
    {
        match: /\btoxic\b/i,
        help: "Toxic N: whenever this creature deals combat damage to a player, that player also gets N poison counters. Ten poison counters and they lose."
    },
    {
        match: /\binfect\b/i,
        help: "Infect: deals its damage to creatures as -1/-1 counters and to players as poison counters (no life is lost). Ten poison counters and they lose."
    },
    {
        match: /\bferocious\b/i,
        help: "Ferocious: the extra effect happens only if you control a creature with power 4 or greater when it resolves."
    },
    {
        match: /\bdelirium\b/i,
        help: "Delirium: the bonus applies while there are four or more card types (artifact, creature, instant, land, sorcery...) among cards in your graveyard."
    },
    {
        match: /\bplot\b|\bplotted\b/i,
        help: "Plot: pay the plot cost in your main phase to exile this card from your hand face up. On a later turn you may cast it as a sorcery without paying its mana cost."
    },
    {
        match: /\breplicate\b/i,
        help: "Replicate: when you cast it, you may pay the replicate cost any number of times. Each payment makes a copy of the spell, with a target of its own. Copies aren't cast, so they don't trigger prowess."
    },
    {
        match: /\brevolt\b/i,
        help: "Revolt: the better effect happens if a permanent you controlled left the battlefield this turn (sacrificed, destroyed, bounced...)."
    },
    {
        match: /\blearn\b/i,
        help: "Learn: you may put a Lesson card from your sideboard into your hand, or discard a card to draw a card, or do neither."
    },
    {
        match: /\bchannel\b/i,
        help: "Channel: an ability used from your hand, by discarding this card and paying its cost."
    },
    {
        match: /\bwaterbend\b/i,
        help: "Waterbend: while paying it, you can tap your untapped artifacts and creatures, each one paying for {1}. The game taps the ones that cost you nothing first (artifacts, creatures that couldn't attack this turn anyway), then uses mana."
    },
    {
        match: /\bfirebending \d+/i,
        help: "Firebending N: whenever this creature attacks, you add N red mana. It lasts until end of combat."
    },
    {
        match: /\bparadigm\b/i,
        help: "Paradigm: after it resolves the spell is exiled. At the beginning of each of your first main phases after that, you may cast a copy of it for free."
    },
    {
        match: /\blevel \d\b/i,
        help: "Class: pay a level's cost (as a sorcery, one level at a time) and the Class gains that level's ability, on top of the ones before it."
    },
    {
        match: /\bfood\b/i,
        help: "Food: an artifact token with \"{2}, {T}, Sacrifice this artifact: You gain 3 life.\" Some cards sacrifice a Food for something else (Cauldron Familiar comes back from the graveyard)."
    },
    {
        match: /\bblood token\b/i,
        help: "Blood token: an artifact with \"{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card.\""
    },
    {
        match: /\bflurry\b/i,
        help: "Flurry: triggers when you cast your second spell each turn."
    },
    {
        match: /\badventure\b/i,
        help: "Adventure: you may cast the spell printed beside the creature instead. When it resolves, the card goes into exile, and later you may cast the creature from exile. If the Adventure is countered, the card goes to the graveyard."
    },
    {
        match: /\bharmonize\b/i,
        help: "Harmonize: you may cast this from your graveyard for its harmonize cost. You may tap an untapped creature you control to pay {X} of the cost, X being its power. It is exiled afterwards."
    },
    {
        match: /\bopus\b/i,
        help: "Opus: triggers whenever you cast an instant or sorcery spell, and does more if five or more mana was spent to cast it."
    },
    {
        match: /\bstorm\b/i,
        help: "Storm: when you cast the spell, copy it for each other spell cast before it this turn (by any player). Copies aren't cast."
    },
    {
        match: /\bemblem\b/i,
        help: "Emblem: a lasting effect in the command zone. Nothing can remove it, and it lasts for the rest of the game."
    },
    {
        match: /you may pay \d+ life\. if you don't, it enters tapped/i,
        help: "Shock land: as it enters you choose to pay 2 life to have it untapped, or let it enter tapped."
    },
    {
        match: /search your library for an? [a-z ]*(plains|island|swamp|mountain|forest) card/i,
        help: "Fetch land: pay 1 life and sacrifice it to put a land of those types from your library onto the battlefield (a shock land counts: it has the types). Then the library is shuffled."
    },
    {
        match: /\{[wubrg]\/p\}/i,
        help: "Phyrexian mana ({G/P}, {B/P}...): pay it with mana of that color, or with 2 life instead. You choose when you cast it."
    },
    {
        match: /\bprowess\b/i,
        help: "Prowess: whenever you cast a noncreature spell, this gets +1/+1 until end of turn."
    },
    {
        match: /\bregenerate\b/i,
        help: "Regenerate: creates a shield until end of turn. The next time the creature would be destroyed, it is instead tapped, healed of all damage and removed from combat."
    },
    {
        match: /\bscry\b/i,
        help: "Scry: look at the top cards of your library; you may put any of them on the bottom, the rest stay on top."
    },
    {
        match: /\bsurveil\b/i,
        help: "Surveil: look at the top cards of your library; you may put any of them into your graveyard, the rest stay on top."
    },
    {
        match: /\bmills?\b/i,
        help: "Mill: the top cards of a library are put into its owner's graveyard."
    },
    {
        match: /protection from/i,
        help: "Protection: it can't be damaged, enchanted or equipped, blocked, or targeted by anything with the stated quality (a color, or artifacts)."
    },
    {
        match: /\bhexproof\b/i,
        help: "Hexproof: can't be the target of spells or abilities your opponents control."
    },
    {
        match: /\bshroud\b/i,
        help: "Shroud: can't be the target of any spells or abilities."
    },
    {
        match: /enchant (creature|permanent|land)|\baura\b/i,
        help: "Aura: cast on a target. It stays attached to it and changes it. If the thing it enchants leaves, the Aura goes to the graveyard."
    },
    {
        match: /\btreasure\b/i,
        help: "Treasure: an artifact token. Tap it and sacrifice it to add one mana of any color."
    },
    {
        match: /\bfights?\b/i,
        help: "Fight: the two creatures each deal damage equal to their power to the other."
    },
    {
        match: /deals damage equal to its power/i,
        help: "One-sided fight: the first creature deals damage equal to its power to the target; the target deals none back."
    },
    {
        match: /\bdevoid\b/i,
        help: "Devoid: this card has no color."
    },
    {
        match: /\bpartner\b/i,
        help: "Partner: lets two commanders be used together. It has no effect in this game."
    },
    {
        match: /\bchangeling\b/i,
        help: "Changeling: counts as every creature type."
    },
    {
        match: /\b(plains|island|swamp|mountain|forest)walk\b/i,
        help: "Landwalk: this creature can't be blocked while the defending player controls a land of that type."
    },
    {
        match: /can't be blocked except by/i,
        help: "Evasion: only the kinds of creatures named can block this creature."
    },
    {
        match: /can't be blocked by more than one/i,
        help: "Only one creature can block it."
    },
    {
        match: /can't block/i,
        help: "It can't be declared as a blocker."
    },
    {
        match: /\bhaste\b/i,
        help: "Haste: can attack and use {T} abilities the turn it comes under your control."
    },
    {
        match: /gain control of/i,
        help: "Control change: you control the creature until end of turn, then it goes back to its owner. It can't attack unless it has haste."
    },
    {
        match: /counter target spell/i,
        help: "Counter: the spell is removed from the stack and does nothing; it goes to its owner's graveyard."
    },
    {
        match: /return .* to its owner's hand/i,
        help: "Bounce: the permanent goes back to its owner's hand (tokens just disappear)."
    },
    {
        match: /\bdestroy\b/i,
        help: "Destroy: the permanent goes to the graveyard (not if it is indestructible, or has a regeneration shield)."
    },
    {
        match: /\bexile\b/i,
        help: "Exile: removed from the game; it does not go to the graveyard."
    },
    {
        match: /\bsacrifice\b/i,
        help: "Sacrifice: you put your own permanent into the graveyard. When it is a cost, it is paid up front and can't be responded to."
    },
    {
        match: /\+1\/\+1 counter/i,
        help: "+1/+1 counter: stays on the permanent (it doesn't wear off) and adds +1 power and +1 toughness. A -1/-1 counter cancels one."
    },
    {
        match: /-1\/-1 counter/i,
        help: "-1/-1 counter: stays on the permanent and gives -1/-1. It cancels out a +1/+1 counter if there is one."
    },
    {
        match: /until end of turn/i,
        help: "Until end of turn: the effect lasts through this turn only, and wears off at the start of the next one."
    },
    {
        match: /activate only as a sorcery/i,
        help: "Sorcery speed: can only be used in your own main phase with nothing on the stack."
    },
    {
        match: /activate only once each turn/i,
        help: "Once per turn: after you use it, you can't use it again until next turn."
    },
    {
        match: /^\s*\{t\}|\{T\}:/,
        help: "{T}: tap this permanent as part of the cost. It can't be used if it is already tapped, or (for a creature) if it just arrived."
    },
    {
        match: /\bloyalty\b|^[+\-−]\d+:/i,
        help: "Planeswalker ability: the number is added to (or removed from) its loyalty. You may use only one per planeswalker each turn, in your main phase. At 0 loyalty it dies."
    },
    {
        match: /draws? (a|\d+|two|three) cards?/i,
        help: "Draw: the player takes cards from the top of their library into their hand. Drawing from an empty library loses the game."
    },
    {
        match: /gain (\d+|x) life|gains (\d+|x) life/i,
        help: "Gain life: the player's life total goes up by that much."
    },
    {
        match: /deals? (\d+|x) damage/i,
        help: "Damage: a creature is destroyed when it has damage equal to its toughness. Damage to a player lowers their life; to a planeswalker lowers its loyalty. Damage wears off at end of turn."
    },
    {
        match: /\buntap\b/i,
        help: "Untap: the permanent can be used again (tapped creatures can attack/block again)."
    },
    {
        match: /\bchoose (one|a color)\b|choose one/i,
        help: "Choice: you pick when it is cast or enters (one mode, or a color). The unchosen options do nothing."
    }
];
function helpFor(text, max = 4) {
    if (!text) return [];
    const out = [];
    for (const rule of RULES){
        if (rule.match.test(text) && !out.includes(rule.help)) out.push(rule.help);
        if (out.length >= max) break;
    }
    return out;
}
function helpForWord(word) {
    return RULES.find((r)=>r.match.test(word))?.help;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/log.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "announcementsFrom",
    ()=>announcementsFrom,
    "describeEvents",
    ()=>describeEvents,
    "endReason",
    ()=>endReason,
    "mergeAnnouncements",
    ()=>mergeAnnouncements,
    "nameOf",
    ()=>nameOf,
    "worthTelling",
    ()=>worthTelling
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/engine/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/engine/dist/types.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$cardText$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/cardText.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$outcomeText$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/outcomeText.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/players.ts [app-client] (ecmascript)");
;
;
;
;
;
function nameOf(state, iid) {
    const spell = state.stack.find((i)=>i.kind === "spell" && i.card.iid === iid);
    if (spell?.kind === "spell") return state.cards[spell.card.defId].name;
    for (const p of Object.values(state.players)){
        const all = [
            ...p.hand,
            ...p.graveyard,
            ...p.library,
            ...p.exile,
            ...p.battlefield.map((x)=>x.card)
        ];
        const card = all.find((c)=>c.iid === iid);
        if (card) return state.cards[card.defId].name;
    }
    return iid;
}
// What a resolution did that its own events already put in the log (damage, life, poison, cards drawn, creatures arriving).
const LOGGED_ELSEWHERE = new Set([
    "damaged",
    "life",
    "poison",
    "drew",
    "entered"
]);
/** Turn engine events into log lines. `state` is the state AFTER the events. */ /** What was cast: a copy is gone from the stack once it resolves, so it is named by the card it copies. */ function castName(state, e) {
    const copyOf = e.type === "spellCast" ? e.copyOf : undefined;
    return copyOf ? `a copy of ${state.cards[copyOf]?.name ?? "a spell"}` : nameOf(state, e.iid);
}
const sentence = (s)=>/[.!?]$/.test(s) ? s : `${s}.`;
/** "Player 1 sacrificed Blood." / "Grizzly Bears died." / "Witch's Oven was put into the graveyard." */ function diedLine(state, e) {
    const name = e.name ?? nameOf(state, e.iid);
    if (e.sacrificed) return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} sacrificed ${name}.`;
    return e.noncreature ? `${name} was put into the graveyard.` : `${name} died.`;
}
/** "Player 1 draws 2 cards." said right after those cards were drawn: each is in the log already ("drew a card"). */ const drawsAgain = (events)=>new Set(events.filter((e, i)=>e.type === "effect" && /^Player [12] draws \d+ cards?\.$/.test(e.text) && events[i - 1]?.type === "cardDrawn"));
function describeEvents(events, state) {
    const lines = [];
    const drawSummed = drawsAgain(events);
    for (const e of events){
        switch(e.type){
            case "mulliganTaken":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} takes a mulligan (${e.count}).`);
                break;
            case "handKept":
                lines.push(e.bottomed ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} keeps their hand and puts ${e.bottomed} card${e.bottomed > 1 ? "s" : ""} on the bottom.` : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} keeps their hand.`);
                break;
            case "cardsDiscarded":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} discards ${e.iids.map((i)=>nameOf(state, i)).join(", ")}.`);
                break;
            case "conceded":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} concedes.`);
                break;
            case "landPlayed":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} played ${nameOf(state, e.iid)}.`);
                break;
            case "creatureCast":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} cast ${nameOf(state, e.iid)}.`);
                break;
            case "spellCast":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} cast ${castName(state, e)}.`);
                break;
            case "abilityActivated":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} used ${e.name}: ${sentence((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$cardText$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readable"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$cardText$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["printedLine"])(e.text, (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$cardText$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defNamed"])(state, e.name)), e.name))}`);
                break;
            case "permanentEntered":
                break;
            case "damage":
                {
                    const target = e.target === "p1" || e.target === "p2" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.target) : nameOf(state, e.target);
                    lines.push(`${nameOf(state, e.source)} deals ${e.amount} damage to ${target}.`);
                    break;
                }
            case "lifeLost":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} loses ${e.amount} life.`);
                break;
            case "poisoned":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} gets ${e.amount} poison counter${e.amount === 1 ? "" : "s"} (${state.players[e.player].poison ?? 0} of 10).`);
                break;
            case "effect":
                if (!drawSummed.has(e)) lines.push(e.text);
                break;
            case "countered":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${e.name} is countered${e.by ? ` by ${e.by}` : ""}.`);
                break;
            case "resolved":
                if (e.fizzled) lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${e.name} does nothing (it fizzles): ${e.fizzled}.`);
                else if (e.trigger) lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${e.name.replace(/'s ability$/, "")} triggered.`);
                else lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${e.name.replace(/'s ability$/, " ability")} resolves.`);
                lines.push(...(e.did ?? []).filter((o)=>!LOGGED_ELSEWHERE.has(o.k) && !(o.k === "left" && o.to === "graveyard")).map((o)=>`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$outcomeText$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["outcomeLine"])(o)}.`));
                break;
            case "manaPaid":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$outcomeText$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["paymentLine"])(e).replace(/^Paid/, "paid")}.`);
                break;
            case "turnStarted":
                lines.push(`— Turn ${e.turn}: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} —`);
                break;
            case "cardDrawn":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} drew a card.`);
                break;
            case "attackersDeclared":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} attacks with ${e.attackers.map((i)=>nameOf(state, i)).join(", ")}.`);
                break;
            case "blockersDeclared":
                lines.push(e.blocks.length ? e.blocks.map((b)=>`${nameOf(state, b.blocker)} blocks ${nameOf(state, b.attacker)}.`).join(" ") : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} doesn't block.`);
                break;
            case "combatDamage":
                {
                    const toPlayer = e.target === "p1" || e.target === "p2";
                    const target = toPlayer ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.target) : nameOf(state, e.target);
                    lines.push(`${nameOf(state, e.source)} deals ${e.amount} to ${target}${e.infect && !toPlayer ? " as -1/-1 counters" : ""}.`);
                    break;
                }
            case "lifeGained":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} gains ${e.amount} life.`);
                break;
            case "creatureDied":
                lines.push(diedLine(state, e));
                break;
            case "gameWon":
                lines.push(`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} wins!`);
                break;
            case "gameDrawn":
                lines.push("Both players lost at the same time: the game is a draw.");
                break;
            case "phaseChanged":
                break;
        }
    }
    return lines;
}
function endReason(events, state) {
    if (events.some((e)=>e.type === "gameDrawn")) return "Both players ran out of life at the same time.";
    const resigned = events.find((e)=>e.type === "conceded");
    if (resigned) return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(resigned.player)} resigned.`;
    const won = events.find((e)=>e.type === "gameWon");
    if (!won) return null;
    const loser = __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OPPONENT"][won.player];
    if ((state.players[loser].poison ?? 0) >= 10) return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(loser)} got ten poison counters.`;
    return state.players[loser].life <= 0 ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(loser)} ran out of life.` : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(loser)} ran out of cards to draw.`;
}
let nextAnnouncement = 1;
function defIdOf(state, iid) {
    for (const p of Object.values(state.players)){
        const card = [
            ...p.hand,
            ...p.graveyard,
            ...p.library,
            ...p.exile,
            ...p.battlefield.map((x)=>x.card)
        ].find((c)=>c.iid === iid);
        if (card) return card.defId;
    }
    const item = state.stack.find((i)=>i.kind === "spell" && i.card.iid === iid);
    return item && item.kind === "spell" ? item.card.defId : undefined;
}
// Events that end what a spell or ability is doing, and events its result already says ("Player 2 loses 3 life (now 17)").
const OUTSIDE = new Set([
    "phaseChanged",
    "turnStarted",
    "attackersDeclared",
    "blockersDeclared",
    "combatDamage"
]);
const IN_RESULT = new Set([
    "damage",
    "lifeLost",
    "lifeGained",
    "poisoned",
    "creatureDied",
    "cardDrawn",
    "permanentEntered"
]);
const unfinished = (list, iid)=>[
        ...list
    ].reverse().find((a)=>a.iid === iid && !a.done && a.kind !== "trigger");
/** What a spell or ability did when it resolved: added to its announcement, or a new one (a triggered ability, or one cast earlier). */ function resolution(out, e, state) {
    const did = (e.did ?? []).filter((o)=>!(o.k === "entered" && o.iid === e.iid)); // a creature spell entering says nothing new
    const result = e.fizzled ? [
        `Did nothing: ${e.fizzled}`
    ] : did.map(__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$outcomeText$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["outcomeLine"]);
    const done = e.fizzled ? "fizzled" : "resolved";
    const cast = e.trigger ? undefined : unfinished(out, e.iid);
    if (cast) return Object.assign(cast, {
        done,
        result
    });
    const source = e.name.replace(/'s ability$/, "");
    const a = {
        id: nextAnnouncement++,
        turn: state.turn,
        kind: e.trigger ? "trigger" : e.ability ? "ability" : "spell",
        iid: e.iid,
        defId: defIdOf(state, e.iid),
        player: e.controller,
        title: e.trigger ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${source} triggered` : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)} ${e.ability ? "used" : "cast"} ${source}`,
        lines: e.trigger && e.text ? [
            e.text.replace(/~/g, source).replace(/^./, (c)=>c.toUpperCase())
        ] : [],
        done,
        result,
        ...e.trigger ? {} : {
            later: true
        }
    };
    out.push(a);
    return a;
}
/** A countered spell or ability: said on what countered it, and on its own announcement. */ function countering(out, e, by, state) {
    if (by) (by.done ? by.result ??= [] : by.lines).push(`Counters ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)}'s ${e.name}`);
    const result = [
        `Countered${e.by ? ` by ${e.by}` : ""}`
    ];
    const cast = unfinished(out, e.iid);
    if (cast) {
        Object.assign(cast, {
            done: "countered",
            result
        });
        return;
    }
    const ability = e.name.endsWith("'s ability");
    const name = e.name.replace(/'s ability$/, "");
    out.push({
        id: nextAnnouncement++,
        turn: state.turn,
        kind: ability ? "ability" : "spell",
        iid: e.iid,
        defId: defIdOf(state, e.iid),
        player: e.controller,
        title: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.controller)} ${ability ? "used" : "cast"} ${name}`,
        lines: [],
        done: "countered",
        result,
        later: true
    });
}
function announcementsFrom(events, state) {
    const out = [];
    let open = null; // what later events belong to
    let paid = null; // a payment comes just before the spell or ability it paid for
    let shown = null; // a resolution whose result already says what changed: its own messages would repeat it
    const start = (a, first = [])=>{
        open = {
            id: nextAnnouncement++,
            turn: state.turn,
            ...a,
            lines: [
                ...first,
                ...paid ? [
                    paid
                ] : []
            ]
        };
        paid = null;
        out.push(open);
    };
    for (const e of events){
        if (e.type === "manaPaid") paid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$outcomeText$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["paymentLine"])(e);
        else if (e.type === "spellCast" || e.type === "creatureCast") start({
            kind: "spell",
            player: e.player,
            iid: e.iid,
            defId: (e.type === "spellCast" ? e.copyOf : undefined) ?? defIdOf(state, e.iid),
            title: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} cast ${castName(state, e)}`
        });
        else if (e.type === "abilityActivated") start({
            kind: "ability",
            player: e.player,
            iid: e.iid,
            defId: defIdOf(state, e.iid),
            title: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(e.player)} used ${e.name}`
        }, [
            e.text.replace(/~/g, e.name).replace(/^./, (c)=>c.toUpperCase())
        ]);
        else if (e.type === "resolved") {
            open = resolution(out, e, state);
            shown = (e.did ?? []).length > 0 ? open : null;
        } else if (e.type === "countered") countering(out, e, open, state);
        else if (OUTSIDE.has(e.type)) open = null;
        else if (open && !IN_RESULT.has(e.type) && !(e.type === "effect" && open === shown)) {
            const at = open;
            (at.done ? at.result ??= [] : at.lines).push(...describeEvents([
                e
            ], state));
        }
    }
    if (paid && out.length > 0) out[out.length - 1].lines.push(paid); // paid during a resolution ("you may pay {1}", ward)
    return out;
}
function mergeAnnouncements(list, told) {
    let next = [
        ...list
    ];
    for (const t of told){
        const i = t.later && t.iid ? next.findLastIndex((a)=>a.iid === t.iid && !a.done && a.kind !== "trigger") : -1;
        if (i < 0) {
            next.push(t);
            continue;
        }
        const merged = {
            ...next[i],
            done: t.done,
            result: t.result
        };
        next = [
            ...next.slice(0, i),
            ...next.slice(i + 1),
            merged
        ];
    }
    return next;
}
const worthTelling = (a)=>!!a.done && (a.done !== "resolved" || (a.result ?? []).length > 0 || a.kind === "trigger");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/outcomeText.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "outcomeLine",
    ()=>outcomeLine,
    "paymentLine",
    ()=>paymentLine
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/players.ts [app-client] (ecmascript)");
;
const sign = (n)=>n >= 0 ? `+${n}` : `${n}`;
const plural = (n, word)=>`${n} ${word}${n === 1 ? "" : "s"}`;
const LEFT_TO = {
    graveyard: "goes to the graveyard",
    exile: "is exiled",
    hand: "returns to its owner's hand",
    library: "is put into its owner's library",
    gone: "leaves the battlefield"
};
function countersLine(o) {
    const parts = [
        o.plus > 0 ? `gets ${plural(o.plus, "+1/+1 counter")}` : o.plus < 0 ? `loses ${plural(-o.plus, "+1/+1 counter")}` : "",
        o.minus > 0 ? `gets ${plural(o.minus, "-1/-1 counter")}` : o.minus < 0 ? `loses ${plural(-o.minus, "-1/-1 counter")}` : ""
    ].filter(Boolean);
    return `${o.name} ${parts.join(" and ")} (now ${o.power}/${o.toughness})`;
}
function outcomeLine(o) {
    switch(o.k){
        case "pump":
            return `${o.name} gets ${sign(o.dp)}/${sign(o.dt)} (now ${o.power}/${o.toughness})`;
        case "counters":
            return countersLine(o);
        case "keywords":
            return [
                o.gained.length > 0 ? `${o.name} gains ${o.gained.join(", ")}` : "",
                o.lost.length > 0 ? `${o.name} loses ${o.lost.join(", ")}` : ""
            ].filter(Boolean).join("; ");
        case "shielded":
            return `${o.name} can't be the target of ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.from)}'s spells or abilities this turn`;
        case "animated":
            return `${o.name} becomes a ${o.power}/${o.toughness} creature`;
        case "tapped":
            return `${o.name} is tapped`;
        case "untapped":
            return `${o.name} untaps`;
        case "damaged":
            return `${o.name} is dealt ${o.n} damage`;
        case "entered":
            return `${o.name} enters the battlefield (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.player)})`;
        case "left":
            return `${o.name} ${LEFT_TO[o.to]}`;
        case "control":
            return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.player)} gains control of ${o.name}`;
        case "life":
            return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.player)} ${o.to > o.from ? "gains" : "loses"} ${Math.abs(o.to - o.from)} life (now ${o.to})`;
        case "poison":
            return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.player)} gets ${plural(o.to - o.from, "poison counter")} (${o.to} of 10)`;
        case "drew":
            return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playerName"])(o.player)} draws ${plural(o.n, "card")}`;
    }
}
function paymentLine(e) {
    const bySource = new Map();
    for (const m of e.made){
        const seen = bySource.get(m.iid);
        bySource.set(m.iid, {
            name: m.name,
            colors: `${seen?.colors ?? ""}{${m.color}}`
        });
    }
    const all = e.made.map((m)=>`{${m.color}}`).join("");
    return `Paid ${all}: ${[
        ...bySource.values()
    ].map((s)=>`${s.name} ${s.colors}`).join(", ")}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/players.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "playerName",
    ()=>playerName,
    "setPlayerNames",
    ()=>setPlayerNames
]);
let names = {
    p1: "Player 1",
    p2: "Player 2"
};
const setPlayerNames = (given)=>{
    names = {
        p1: given?.p1 || "Player 1",
        p2: given?.p2 || "Player 2"
    };
};
const playerName = (p)=>names[p];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/app/play/stats.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isCreatureNow",
    ()=>isCreatureNow,
    "liveCardProps",
    ()=>liveCardProps,
    "nameWithStats",
    ()=>nameWithStats,
    "ptText",
    ()=>ptText
]);
// A permanent as it is right now: power and toughness with pumps, counters, auras and anthems, and the damage it has taken.
// Every place that shows a creature uses these, so the numbers match the board everywhere.
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/engine/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/engine/dist/core/permanents.js [app-client] (ecmascript) <locals>");
;
const isCreatureNow = (state, p)=>state.cards[p.card.defId].type === "creature" || p.crewed === true;
const ptText = (state, p)=>isCreatureNow(state, p) ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["powerOf"])(state, p)}/${(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["toughnessOf"])(state, p) - p.damage}` : "";
const nameWithStats = (state, p)=>[
        state.cards[p.card.defId].name,
        ptText(state, p)
    ].filter(Boolean).join(" ");
function liveCardProps(state, p) {
    const creature = isCreatureNow(state, p);
    return {
        power: creature ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["powerOf"])(state, p) : undefined,
        toughness: creature ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$engine$2f$dist$2f$core$2f$permanents$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["toughnessOf"])(state, p) : undefined,
        damage: p.damage,
        counters: {
            plus: p.counters,
            minus: p.minusCounters,
            infected: p.infected
        },
        tapped: p.tapped
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/dashCache.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearCached",
    ()=>clearCached,
    "useCached",
    ()=>useCached,
    "writeCached",
    ()=>writeCached
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
// What the dashboard shows first (your profile, your friends) is kept on this device, so the next visit paints it at once
// while the fresh copy loads. It is the same data the pages fetch anyway: it is only shown sooner. It is cleared when the
// player signs out, so nobody sees the last person's name on a shared computer.
const PREFIX = "mtg-cache:";
const EVENT = "mtg-cache";
const parsed = new Map();
function readRaw(key) {
    try {
        return localStorage.getItem(PREFIX + key);
    } catch  {
        return null; // storage blocked: nothing is remembered
    }
}
/** The kept copy, parsed once per change so React sees the same object until the data really changes. */ function snapshot(key) {
    const raw = readRaw(key);
    const hit = parsed.get(key);
    if (hit && hit.raw === raw) return hit.value;
    let value = null;
    if (raw) {
        try {
            value = JSON.parse(raw);
        } catch  {
            value = null;
        }
    }
    parsed.set(key, {
        raw,
        value
    });
    return value;
}
const subscribe = (callback)=>{
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", callback); // another tab changed it
    return ()=>{
        window.removeEventListener(EVENT, callback);
        window.removeEventListener("storage", callback);
    };
};
function useCached(key) {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, {
        "useCached.useSyncExternalStore": ()=>snapshot(key)
    }["useCached.useSyncExternalStore"], {
        "useCached.useSyncExternalStore": ()=>null
    }["useCached.useSyncExternalStore"]);
}
_s(useCached, "FpwL93IKMLJZuQQXefVtWynbBPQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
function writeCached(key, value) {
    try {
        const raw = JSON.stringify(value);
        if (readRaw(key) === raw) return;
        localStorage.setItem(PREFIX + key, raw);
        window.dispatchEvent(new Event(EVENT));
    } catch  {
    // storage full or blocked: the page just loads the slower way next time
    }
}
function clearCached() {
    try {
        for (const key of Object.keys(localStorage))if (key.startsWith(PREFIX)) localStorage.removeItem(key);
        window.dispatchEvent(new Event(EVENT));
    } catch  {
    // nothing to forget
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/motion.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "animationsEnabled",
    ()=>animationsEnabled,
    "setAnimationsEnabled",
    ()=>setAnimationsEnabled,
    "useAnimationsOn",
    ()=>useAnimationsOn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
const KEY = "mtg-animations";
function animationsEnabled() {
    try {
        return localStorage.getItem(KEY) !== "off";
    } catch  {
        return true; // storage blocked, or running on the server
    }
}
function setAnimationsEnabled(on) {
    try {
        localStorage.setItem(KEY, on ? "on" : "off");
        window.dispatchEvent(new Event("mtg-animations")); // the live wallpaper listens for this
    } catch  {
    // ignore: the switch just won't be remembered
    }
}
function useAnimationsOn() {
    _s();
    const [on, setOn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAnimationsOn.useEffect": ()=>{
            const update = {
                "useAnimationsOn.useEffect.update": ()=>setOn(animationsEnabled())
            }["useAnimationsOn.useEffect.update"];
            update();
            window.addEventListener("mtg-animations", update);
            return ({
                "useAnimationsOn.useEffect": ()=>window.removeEventListener("mtg-animations", update)
            })["useAnimationsOn.useEffect"];
        }
    }["useAnimationsOn.useEffect"], []);
    return on;
}
_s(useAnimationsOn, "w46BMHgN9sqGmFSTfafl0xkHEzw=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/music/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MUSIC_EVENT",
    ()=>MUSIC_EVENT,
    "TRACKS",
    ()=>TRACKS,
    "musicEnabled",
    ()=>musicEnabled,
    "musicTrack",
    ()=>musicTrack,
    "musicVolume",
    ()=>musicVolume,
    "playingTrack",
    ()=>playingTrack,
    "setMusicEnabled",
    ()=>setMusicEnabled,
    "setMusicTrack",
    ()=>setMusicTrack,
    "setMusicVolume",
    ()=>setMusicVolume,
    "startMusic",
    ()=>startMusic,
    "stopMusic",
    ()=>stopMusic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/sound.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$theory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/music/theory.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$tracks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/music/tracks.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$voices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/music/voices.ts [app-client] (ecmascript)");
;
;
;
;
const FILE_TRACKS = [
    {
        id: "dashboard",
        name: "Dashboard theme",
        blurb: "The original music from the dashboard.",
        file: "/music/dashboard.mp3"
    }
];
const TRACKS = [
    ...__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$tracks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRACKS"],
    ...FILE_TRACKS
];
const FILE_GAIN = 0.3; // a recording is much louder than the written tunes at the same setting: this keeps the two alike
const KEY = "mtg-music";
const TRACK_KEY = "mtg-music-track";
const VOLUME_KEY = "mtg-music-volume";
const DEFAULT_VOLUME = 0.7;
const LOOKAHEAD = 0.3; // seconds of music scheduled ahead of time
const MUSIC_EVENT = "mtg-music";
const read = (key)=>{
    try {
        return localStorage.getItem(key);
    } catch  {
        return null; // storage blocked, or running on the server
    }
};
const write = (key, value)=>{
    try {
        localStorage.setItem(key, value);
    } catch  {
    // ignore: the setting just won't be remembered
    }
};
const changed = ()=>("TURBOPACK compile-time value", "object") !== "undefined" && window.dispatchEvent(new Event(MUSIC_EVENT));
const musicEnabled = ()=>read(KEY) !== "off";
const musicTrack = ()=>{
    const id = read(TRACK_KEY) ?? __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$tracks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_TRACK"];
    return FILE_TRACKS.find((t)=>t.id === id) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$tracks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackById"])(id);
};
function musicVolume() {
    const v = Number(read(VOLUME_KEY));
    return read(VOLUME_KEY) !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
}
function setMusicEnabled(on) {
    write(KEY, on ? "on" : "off");
    if (on) startMusic();
    else stopMusic();
}
function setMusicTrack(id) {
    write(TRACK_KEY, (FILE_TRACKS.find((t)=>t.id === id) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$tracks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["trackById"])(id)).id);
    write(KEY, "on");
    stopMusic();
    startMusic();
}
function setMusicVolume(v) {
    write(VOLUME_KEY, String(v));
    if (now) now.bus.out.gain.setTargetAtTime(now.track.volume * v, now.bus.ctx.currentTime, 0.05);
    if (file) file.audio.volume = v * FILE_GAIN;
    changed();
}
const compiled = new Map();
let now = null;
let timer = null;
// A sound file that is playing: one audio element that loops, paused while the tab is hidden.
let file = null;
const playingTrack = ()=>now?.track ?? file?.track ?? null;
function startFile(track) {
    const audio = new Audio(track.file);
    audio.loop = true;
    audio.volume = musicVolume() * FILE_GAIN;
    const onVisible = ()=>document.hidden ? audio.pause() : void audio.play().catch(()=>undefined);
    const mine = {
        track,
        audio,
        onVisible
    };
    file = mine;
    document.addEventListener("visibilitychange", onVisible);
    audio.play().then(changed, ()=>{
        // not allowed yet (nothing has been clicked): the first click starts it, see Music.tsx
        if (file === mine) stopMusic();
    });
    changed();
}
/** Schedules the next moment of music. Pauses while the tab is hidden, where timers are slowed and the tune would stutter. */ function tick() {
    if (!now || document.hidden) return;
    const { track, song, bus } = now;
    const step = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$theory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stepSeconds"])(track);
    const t0 = bus.ctx.currentTime;
    if (now.next < t0) now.next = t0 + 0.05; // just started, or back from a hidden tab
    while(now.next < t0 + LOOKAHEAD){
        const i = now.step % song.length;
        const t = now.next + (i % 2 === 1 ? track.swing * step : 0);
        for (const hit of song[i])(0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$voices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["playHit"])(bus, hit, t);
        if (track.crackle && Math.random() < 0.7) (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$voices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["crackle"])(bus, t + Math.random() * step);
        now.step++;
        now.next += step;
    }
}
function startMusic() {
    if (timer || file || !musicEnabled()) return;
    const track = musicTrack();
    if ("file" in track) return startFile(track);
    const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["audioContext"])();
    if (!c) return;
    let song = compiled.get(track.id);
    if (!song) {
        song = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$theory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["compileTrack"])(track);
        compiled.set(track.id, song);
    }
    now = {
        track,
        song,
        bus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$music$2f$voices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeBus"])(c, track, track.volume * musicVolume()),
        step: 0,
        next: 0
    };
    timer = setInterval(tick, 60);
    tick();
    changed();
}
function stopMusic() {
    if (file) {
        file.audio.pause();
        document.removeEventListener("visibilitychange", file.onVisible);
        file = null;
    }
    if (timer) clearInterval(timer);
    timer = null;
    const old = now?.bus;
    now = null;
    changed();
    if (!old) return;
    // The notes already scheduled fade out instead of cutting off.
    const t = old.ctx.currentTime;
    old.out.gain.setValueAtTime(old.out.gain.value, t);
    old.out.gain.linearRampToValueAtTime(0, t + 0.4);
    setTimeout(()=>old.out.disconnect(), 600);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/music/theory.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Turns a track written as text (notes, chord symbols, drum patterns) into what sounds on each step of the loop.
__turbopack_context__.s([
    "compileTrack",
    ()=>compileTrack,
    "noteMidi",
    ()=>noteMidi,
    "parseChord",
    ()=>parseChord,
    "stepSeconds",
    ()=>stepSeconds
]);
const SEMITONE = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
};
const accidental = (a)=>a === "#" ? 1 : a === "b" ? -1 : 0;
function noteMidi(note) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(note);
    if (!m) throw new Error(`Not a note: ${note}`);
    return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + accidental(m[2]);
}
const QUALITY = {
    "": [
        0,
        4,
        7
    ],
    m: [
        0,
        3,
        7
    ],
    "7": [
        0,
        4,
        7,
        10
    ],
    maj7: [
        0,
        4,
        7,
        11
    ],
    m7: [
        0,
        3,
        7,
        10
    ],
    "9": [
        0,
        4,
        7,
        10,
        14
    ],
    m9: [
        0,
        3,
        7,
        10,
        14
    ],
    maj9: [
        0,
        4,
        7,
        11,
        14
    ],
    "7b9": [
        0,
        4,
        7,
        10,
        13
    ],
    dim: [
        0,
        3,
        6
    ]
};
function parseChord(symbol) {
    const m = /^([A-G])(#|b)?(.*)$/.exec(symbol);
    const intervals = m ? QUALITY[m[3]] : undefined;
    if (!m || !intervals) throw new Error(`Not a chord: ${symbol}`);
    return {
        root: (SEMITONE[m[1]] + accidental(m[2]) + 12) % 12,
        intervals
    };
}
const BASS_STEP = {
    R: 0,
    f: -5,
    F: 7,
    O: 12,
    "7": 10
};
/** The lowest MIDI note at or above `base` with this pitch class. */ const above = (pitchClass, base)=>base + ((pitchClass - base) % 12 + 12) % 12;
/** Where each note of a bar starts, and how many steps it lasts (itself and the "-" after it). */ function runs(tokens) {
    const out = [];
    tokens.forEach((token, at)=>{
        if (token === "-" || token === ".") return;
        let len = 1;
        while(tokens[at + len] === "-")len++;
        out.push({
            at,
            token,
            len
        });
    });
    return out;
}
function bar(text, per, what) {
    const tokens = text.trim().split(/\s+/);
    if (tokens.length !== per) throw new Error(`${what} has ${tokens.length} steps, not ${per}: "${text}"`);
    return tokens;
}
const stepSeconds = (t)=>60 / t.bpm / t.grid;
function compileTrack(t) {
    const per = t.grid * 4;
    const step = stepSeconds(t);
    if (t.melody.length !== t.harmony.length) throw new Error(`${t.name}: ${t.melody.length} bars of melody, ${t.harmony.length} of chords`);
    const freq = (midi)=>440 * 2 ** ((midi + t.transpose - 69) / 12);
    const steps = Array.from({
        length: t.harmony.length * per
    }, ()=>[]);
    const melody = t.melody.flatMap((b, i)=>bar(b, per, `${t.name} melody bar ${i + 1}`));
    for (const r of runs(melody))steps[r.at].push({
        voice: t.lead,
        freq: freq(noteMidi(r.token) + (t.leadShift ?? 0)),
        dur: r.len * step
    });
    const bass = runs(bar(t.bass.pattern, per, `${t.name} bass`));
    const chords = runs(bar(t.chords.pattern, per, `${t.name} chords`));
    for (const [voice, pattern] of Object.entries(t.drums)){
        if (pattern.length !== per) throw new Error(`${t.name} ${voice} has ${pattern.length} steps, not ${per}`);
    }
    t.harmony.forEach((symbol, b)=>{
        const halves = symbol.split("|").map(parseChord);
        const chordAt = (s)=>halves[halves.length === 1 || s < per / 2 ? 0 : 1];
        const at = b * per;
        for (const r of bass){
            const step0 = BASS_STEP[r.token];
            if (step0 === undefined) throw new Error(`${t.name} bass: unknown step "${r.token}"`);
            steps[at + r.at].push({
                voice: t.bass.voice,
                freq: freq(above(chordAt(r.at).root, t.bass.base) + step0),
                dur: r.len * step
            });
        }
        for (const r of chords){
            const c = chordAt(r.at);
            const root = above(c.root, t.chords.base);
            for (const i of c.intervals)steps[at + r.at].push({
                voice: t.chords.voice,
                freq: freq(root + i),
                dur: r.len * step
            });
        }
        for (const [voice, pattern] of Object.entries(t.drums)){
            [
                ...pattern
            ].forEach((ch, s)=>(ch === "x" || ch === "o") && steps[at + s].push({
                    voice,
                    freq: 0,
                    dur: 0,
                    ...ch === "o" ? {
                        soft: true
                    } : {}
                }));
        }
        if (t.wind && b % 2 === 0) steps[at].push({
            voice: "wind",
            freq: 0,
            dur: per * 2 * step
        });
    });
    return steps;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/music/tracks.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_TRACK",
    ()=>DEFAULT_TRACK,
    "TRACKS",
    ()=>TRACKS,
    "trackById",
    ()=>trackById
]);
// Original tunes, written for this site. See theory.ts for how a track is written down.
const MAPLE_A = [
    "E5 - G5 - C6 - B5 A5",
    "A5 - E5 - C5 - . D5",
    "F5 - A5 - C6 - A5 F5",
    "G5 - - - D5 E5 F5 D5",
    "E5 - G5 - C6 - D6 E6",
    "D6 C6 A5 - E5 - C5 D5",
    "F5 - A5 G5 - - B4 D5"
];
const MAPLE_A_CHORDS = [
    "C",
    "Am",
    "F",
    "G",
    "C",
    "Am",
    "Dm|G",
    "C"
];
const maple = {
    id: "maple",
    name: "Maple time",
    blurb: "A cheerful town tune: flute, oom-pah bass, a little shuffle.",
    bpm: 112,
    grid: 2,
    swing: 0.16,
    transpose: -7,
    volume: 0.22,
    melody: [
        ...MAPLE_A,
        "C5 - E5 G5 - - . .",
        "A5 - - G5 F5 - C5 -",
        "D5 - G5 - B5 - A5 G5",
        "G5 - - E5 B4 - E5 G5",
        "A5 - - - C6 - B5 A5",
        "F5 - A5 - D6 - C6 A5",
        "B5 - G5 - D5 - G5 B5",
        "C6 - G5 E5 F5 - A5 C6",
        "D6 - - - B5 - G5 -",
        ...MAPLE_A,
        "C5 - - - G4 - . .",
        "C6 - B5 A5 E5 - - .",
        "F5 - A5 C6 - - A5 -",
        "G5 - E5 C5 E5 - G5 -",
        "D5 - - - - - . .",
        "C6 - B5 A5 E5 - A5 B5",
        "C6 - A5 F5 - - C6 D6",
        "F6 - E6 D6 A5 - D6 -",
        "B5 - - - G5 - - -"
    ],
    harmony: [
        ...MAPLE_A_CHORDS,
        "F",
        "G",
        "Em",
        "Am",
        "Dm",
        "G",
        "C|F",
        "G",
        ...MAPLE_A_CHORDS,
        "Am",
        "F",
        "C",
        "G",
        "Am",
        "F",
        "Dm",
        "G"
    ],
    lead: "flute",
    bass: {
        voice: "triangle",
        pattern: "R - . . f - . .",
        base: 50
    },
    chords: {
        voice: "stab",
        pattern: ". . x . . . x .",
        base: 57
    },
    drums: {
        kick: "x...x...",
        hat: ".x.x.x.x"
    },
    echo: {
        steps: 3,
        feedback: 0.28,
        wet: 0.22
    }
};
const eerie = {
    id: "eerie",
    name: "Eerie suspense",
    blurb: "A music box in the dark: a slow lullaby, a heartbeat and the wind.",
    bpm: 66,
    grid: 2,
    swing: 0,
    transpose: 0,
    volume: 0.3,
    melody: [
        "A5 - - E5 - - C6 -",
        "B5 - - G#5 - - . .",
        "A5 - - F5 - - C6 -",
        "B5 - - - G#5 - - .",
        "F5 - - D5 - - A5 -",
        "G#5 - - A5 - - E5 -",
        "F5 - - D5 - - Bb5 -",
        "G#5 - - - - - . .",
        "C6 - B5 - A5 - E5 -",
        "G5 - - E5 - - C5 -",
        "D5 - F5 - A5 - D6 -",
        "B5 - - - G#5 - E5 -",
        "C6 - - A5 - - F5 -",
        "D6 - - A5 - - F5 -",
        "D6 - C#6 - D6 - F6 -",
        "E6 - - - D#6 - E6 -"
    ],
    harmony: [
        "Am",
        "Am",
        "F",
        "E",
        "Dm",
        "Am",
        "Bb",
        "E",
        "Am",
        "C",
        "Dm",
        "E",
        "F",
        "Dm",
        "Bb",
        "E7b9"
    ],
    lead: "musicbox",
    bass: {
        voice: "sub",
        pattern: "R - - - - - - -",
        base: 45
    },
    chords: {
        voice: "pad",
        pattern: "x - - - - - - -",
        base: 57
    },
    drums: {
        kick: "xo......"
    },
    echo: {
        steps: 3,
        feedback: 0.45,
        wet: 0.35
    },
    wind: true
};
const funk = {
    id: "funk",
    name: "Funk",
    blurb: "An E9 groove: slap bass, clavinet, brass and busy hi-hats.",
    bpm: 100,
    grid: 4,
    swing: 0.06,
    transpose: 0,
    leadShift: -12,
    volume: 0.24,
    melody: [
        "E5 . G5 . A5 - . E5 . . G5 A5 . . . .",
        "B5 - - . A5 . G5 . E5 - - - . . . .",
        "C#6 . . B5 . . A5 . . G5 . . E5 - . .",
        ". . . . G5 A5 . B5 . . D6 - B5 . A5 .",
        "E5 . G5 . A5 - . E5 . . G5 A5 . . . .",
        "B5 - . D6 - . E6 - - - D6 . B5 . G5 .",
        "F#5 - . A5 . B5 - . E5 . G5 . A5 - . .",
        "E5 - - - . . . . Bb5 - B5 - . . . ."
    ],
    harmony: [
        "E9",
        "E9",
        "A9",
        "A9",
        "E9",
        "E9",
        "B7|A9",
        "E9"
    ],
    lead: "brass",
    bass: {
        voice: "funk",
        pattern: "R . . R . . O - . R . 7 . O R .",
        base: 40
    },
    chords: {
        voice: "clav",
        pattern: ". . x . . x . . . . x . . x . .",
        base: 60
    },
    drums: {
        kick: "x......x..x.....",
        snare: "....x....o..x.o.",
        hat: "xoxoxoxoxoxoxoxo"
    }
};
const lofi = {
    id: "lofi",
    name: "Lo-fi",
    blurb: "Lazy jazz chords on an electric piano, a dusty beat and vinyl crackle.",
    bpm: 76,
    grid: 2,
    swing: 0.3,
    transpose: 0,
    volume: 0.3,
    melody: [
        ". . E5 - C5 - A4 -",
        "G4 - - - . . D5 -",
        "C5 - A4 - F4 - E5 -",
        "D5 - - B4 - - . .",
        ". . A5 - G5 - E5 C5",
        "D5 - B4 - G#4 - - .",
        "C5 - - - E5 - G5 -",
        "F5 - - E5 D5 - B4 -"
    ],
    harmony: [
        "Fmaj7",
        "Em7",
        "Dm9",
        "Cmaj7",
        "Fmaj7",
        "E7",
        "Am7",
        "Dm7|G7"
    ],
    lead: "keys",
    bass: {
        voice: "sub",
        pattern: "R - - - . . F -",
        base: 41
    },
    chords: {
        voice: "rhodes",
        pattern: "x - - - - - x -",
        base: 53
    },
    drums: {
        kick: "x....x..",
        snare: "..x...x.",
        hat: "oooooooo"
    },
    echo: {
        steps: 3,
        feedback: 0.2,
        wet: 0.15
    },
    lowpass: 2400,
    crackle: true
};
const TRACKS = [
    maple,
    eerie,
    funk,
    lofi
];
const DEFAULT_TRACK = maple.id;
const trackById = (id)=>TRACKS.find((t)=>t.id === id) ?? maple;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/music/voices.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "crackle",
    ()=>crackle,
    "makeBus",
    ()=>makeBus,
    "playHit",
    ()=>playHit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/sound.ts [app-client] (ecmascript)");
;
function makeBus(c, track, volume) {
    const out = c.createGain();
    out.gain.value = volume;
    if (track.lowpass) {
        const warm = c.createBiquadFilter();
        warm.type = "lowpass";
        warm.frequency.value = track.lowpass;
        out.connect(warm).connect(c.destination);
    } else {
        out.connect(c.destination);
    }
    const lead = c.createGain();
    lead.connect(out);
    if (track.echo) {
        const delay = c.createDelay(2);
        delay.delayTime.value = 60 / track.bpm / track.grid * track.echo.steps;
        const feedback = c.createGain();
        feedback.gain.value = track.echo.feedback;
        const wet = c.createGain();
        wet.gain.value = track.echo.wet;
        lead.connect(delay);
        delay.connect(feedback).connect(delay);
        delay.connect(wet).connect(out);
    }
    return {
        ctx: c,
        out,
        lead
    };
}
/** A quick rise to `peak`, then an exponential fade to silence by `end`. */ function env(c, t, attack, peak, end, to) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, t + attack + 0.01));
    g.connect(to);
    return g;
}
/** Like env, but held near `peak` until `hold` and then released over `release` seconds. */ function held(c, t, attack, peak, hold, release, to) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(peak * 0.7, Math.max(hold, t + attack + 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(hold, t + attack + 0.01) + release);
    g.connect(to);
    return g;
}
function osc(c, type, freq, t, stop, to, detune = 0) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(to);
    o.start(t);
    o.stop(stop);
    return o;
}
function filter(c, type, freq, q, to) {
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(to);
    return f;
}
function noise(c, t, dur, to) {
    const src = c.createBufferSource();
    src.buffer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$sound$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noiseBuffer"])(c);
    src.loop = true;
    src.connect(to);
    src.start(t);
    src.stop(t + dur + 0.05);
}
const VOICES = {
    // a breathy flute: a triangle with a soft octave above, and vibrato that grows as the note is held
    flute: ({ ctx: c, lead }, t, h)=>{
        const g = held(c, t, 0.03, 0.13, t + h.dur, 0.12, lead);
        const stop = t + h.dur + 0.15;
        const body = osc(c, "triangle", h.freq, t, stop, g);
        const air = c.createGain();
        air.gain.value = 0.22;
        air.connect(g);
        osc(c, "sine", h.freq * 2, t, stop, air);
        const depth = c.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(h.freq * 0.007, t + Math.min(0.35, h.dur));
        depth.connect(body.frequency);
        osc(c, "sine", 5.5, t, stop, depth);
    },
    // a music box tine: it rings on by itself, whatever the note's length
    musicbox: ({ ctx: c, lead }, t, h)=>{
        for (const [mult, peak] of [
            [
                1,
                0.08
            ],
            [
                3,
                0.012
            ],
            [
                5.4,
                0.006
            ]
        ]){
            const end = t + 1.8 / Math.sqrt(mult);
            osc(c, "sine", h.freq * mult, t, end + 0.05, env(c, t, 0.004, peak, end, lead));
        }
    },
    // two detuned saws through a filter that opens on the attack
    brass: ({ ctx: c, lead }, t, h)=>{
        const g = held(c, t, 0.02, 0.06, t + h.dur, 0.08, lead);
        const f = filter(c, "lowpass", 500, 3, g);
        f.frequency.setValueAtTime(500, t);
        f.frequency.exponentialRampToValueAtTime(2800, t + 0.05);
        f.frequency.exponentialRampToValueAtTime(1200, t + Math.max(h.dur, 0.06));
        const stop = t + h.dur + 0.12;
        osc(c, "sawtooth", h.freq, t, stop, f, -6);
        osc(c, "sawtooth", h.freq, t, stop, f, 6);
    },
    // soft keys: a sine with a little bell on top
    keys: ({ ctx: c, lead }, t, h)=>{
        const end = t + Math.max(h.dur, 0.5) + 0.4;
        osc(c, "sine", h.freq, t, end + 0.05, env(c, t, 0.005, 0.1, end, lead));
        osc(c, "sine", h.freq * 2, t, end + 0.05, env(c, t, 0.005, 0.03, end - 0.3, lead));
    },
    triangle: ({ ctx: c, out }, t, h)=>{
        osc(c, "triangle", h.freq, t, t + h.dur + 0.05, env(c, t, 0.01, 0.3, t + h.dur, out));
    },
    // a slap: a resonant filter snapping shut
    funk: ({ ctx: c, out }, t, h)=>{
        const end = t + Math.max(h.dur, 0.1) + 0.05;
        const f = filter(c, "lowpass", 2000, 8, env(c, t, 0.004, 0.2, end, out));
        f.frequency.setValueAtTime(2000, t);
        f.frequency.exponentialRampToValueAtTime(280, t + 0.14);
        osc(c, "sawtooth", h.freq, t, end + 0.05, f);
    },
    sub: ({ ctx: c, out }, t, h)=>{
        osc(c, "sine", h.freq, t, t + h.dur + 0.2, held(c, t, 0.03, 0.26, t + h.dur, 0.15, out));
    },
    stab: ({ ctx: c, out }, t, h)=>{
        const end = t + Math.min(h.dur, 0.2);
        osc(c, "square", h.freq, t, end + 0.05, filter(c, "lowpass", 1400, 1, env(c, t, 0.005, 0.035, end, out)));
    },
    // a slow swell that holds the whole chord
    pad: ({ ctx: c, out }, t, h)=>{
        const g = held(c, t, 0.7, 0.028, t + h.dur, 1, out);
        const f = filter(c, "lowpass", 1800, 0.7, g);
        const stop = t + h.dur + 1.1;
        osc(c, "triangle", h.freq, t, stop, f, -7);
        osc(c, "sine", h.freq, t, stop, f, 7);
    },
    // an electric piano: a round tone, an octave above it and a quick tine at the attack
    rhodes: ({ ctx: c, out }, t, h)=>{
        const g = held(c, t, 0.01, 0.045, t + h.dur, 0.3, out);
        const stop = t + h.dur + 0.35;
        osc(c, "sine", h.freq, t, stop, g);
        const octave = c.createGain();
        octave.gain.value = 0.25;
        octave.connect(g);
        osc(c, "sine", h.freq * 2, t, stop, octave);
        osc(c, "sine", h.freq * 4, t, t + 0.2, env(c, t, 0.003, 0.012, t + 0.15, out));
    },
    clav: ({ ctx: c, out }, t, h)=>{
        osc(c, "square", h.freq, t, t + 0.15, filter(c, "bandpass", 1600, 1.5, env(c, t, 0.004, 0.04, t + 0.1, out)));
    },
    kick: ({ ctx: c, out }, t, h)=>{
        const o = osc(c, "sine", 130, t, t + 0.16, env(c, t, 0.005, h.soft ? 0.11 : 0.22, t + 0.14, out));
        o.frequency.setValueAtTime(130, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    },
    snare: ({ ctx: c, out }, t, h)=>{
        noise(c, t, 0.16, filter(c, "bandpass", 1800, 0.7, env(c, t, 0.003, h.soft ? 0.045 : 0.14, t + 0.16, out)));
        const o = osc(c, "triangle", 190, t, t + 0.1, env(c, t, 0.003, h.soft ? 0.02 : 0.06, t + 0.08, out));
        o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    },
    hat: ({ ctx: c, out }, t, h)=>{
        noise(c, t, 0.035, filter(c, "highpass", 7000, 0.7, env(c, t, 0.003, h.soft ? 0.012 : 0.025, t + 0.035, out)));
    },
    // a gust of wind that rises and falls over two bars
    wind: ({ ctx: c, out }, t, h)=>{
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + h.dur * 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, t + h.dur);
        g.connect(out);
        const f = filter(c, "bandpass", 280, 5, g);
        f.frequency.setValueAtTime(280, t);
        f.frequency.exponentialRampToValueAtTime(900, t + h.dur / 2);
        f.frequency.exponentialRampToValueAtTime(300, t + h.dur);
        noise(c, t, h.dur, f);
    }
};
function playHit(bus, hit, t) {
    VOICES[hit.voice](bus, t, hit);
}
function crackle(bus, t) {
    const c = bus.ctx;
    noise(c, t, 0.008, filter(c, "highpass", 2500, 0.7, env(c, t, 0.001, 0.015 + Math.random() * 0.035, t + 0.008, bus.out)));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/online/protocol.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DECK_SIZES",
    ()=>DECK_SIZES,
    "KICKED",
    ()=>KICKED,
    "MATCH_GONE",
    ()=>MATCH_GONE
]);
const DECK_SIZES = [
    20,
    40,
    60
];
const KICKED = 4100;
const MATCH_GONE = 410;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/online/session.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearError",
    ()=>clearError,
    "connectLobby",
    ()=>connectLobby,
    "connectSocial",
    ()=>connectSocial,
    "createRoom",
    ()=>createRoom,
    "disconnectLobby",
    ()=>disconnectLobby,
    "disconnectSocial",
    ()=>disconnectSocial,
    "dismissCameOnline",
    ()=>dismissCameOnline,
    "dismissInvite",
    ()=>dismissInvite,
    "dismissNotice",
    ()=>dismissNotice,
    "inviteFriend",
    ()=>inviteFriend,
    "joinRoom",
    ()=>joinRoom,
    "leaveRoom",
    ()=>leaveRoom,
    "liveInvites",
    ()=>liveInvites,
    "notify",
    ()=>notify,
    "onGameUpdate",
    ()=>onGameUpdate,
    "send",
    ()=>send,
    "serverUrl",
    ()=>serverUrl,
    "spectateRoom",
    ()=>spectateRoom,
    "tryReconnect",
    ()=>tryReconnect,
    "useOnline",
    ()=>useOnline,
    "watchFriends",
    ()=>watchFriends
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Client$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@colyseus/sdk/build/Client.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$log$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/mtg/app/play/log.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/app/play/players.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$protocol$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/lib/online/protocol.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const empty = {
    lobby: "off",
    rooms: [],
    snapshot: null,
    game: null,
    matchId: null,
    chat: [],
    error: null,
    creating: false,
    reconnecting: false,
    social: "off",
    friends: {},
    notices: [],
    invites: [],
    cameOnline: {}
};
let state = empty;
const listeners = new Set();
const set = (patch)=>{
    state = {
        ...state,
        ...patch
    };
    listeners.forEach((l)=>l());
};
let client = null;
let lobbyRoom = null;
let matchRoom = null;
let chatId = 0;
function serverUrl() {
    const configured = __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_GAME_SERVER_URL;
    if (configured) return configured;
    return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:2567`;
}
async function accessToken() {
    const { data } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
}
function getClient() {
    client ??= new __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$colyseus$2f$sdk$2f$build$2f$Client$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Client"](serverUrl());
    return client;
}
let errorTimer;
/** Shows a message from the server, and lets it go after a few seconds. */ function flash(message) {
    clearTimeout(errorTimer);
    set({
        error: message
    });
    errorTimer = setTimeout(()=>set({
            error: null
        }), 5000);
}
const explain = (e)=>e instanceof Error && e.message ? e.message : typeof e === "string" ? e : "Could not reach the game server.";
// ───────── the lobby: the list of rooms ─────────
const LOBBY_RETRY_MS = 4000;
let wantLobby = false; // the dashboard is open: a lost lobby connection (a server restart) is picked up again
async function connectLobby() {
    wantLobby = true;
    if (lobbyRoom || state.lobby === "connecting") return;
    set({
        lobby: "connecting",
        error: null
    });
    try {
        const room = await getClient().joinOrCreate("lobby", {});
        lobbyRoom = room;
        const info = (r)=>{
            const meta = r.metadata ?? {};
            return {
                roomId: String(r.roomId),
                name: meta.name ?? "Room",
                host: meta.host ?? "",
                players: meta.players ?? [],
                status: meta.status ?? "waiting",
                turn: meta.turn ?? 0,
                bot: meta.bot === true,
                spectators: Number(meta.spectators ?? 0),
                clients: Number(r.clients ?? 0),
                maxClients: Number(r.maxClients ?? 2),
                locked: meta.locked === true
            };
        };
        room.onMessage("rooms", (rooms)=>set({
                rooms: [
                    ...new Map(rooms.filter((r)=>r.name === "match").map((r)=>[
                            String(r.roomId),
                            info(r)
                        ])).values()
                ]
            }));
        room.onMessage("+", ([id, r])=>{
            if (r.name !== "match") return;
            set({
                rooms: [
                    ...state.rooms.filter((x)=>x.roomId !== id),
                    info(r)
                ]
            });
        });
        room.onMessage("-", (id)=>set({
                rooms: state.rooms.filter((x)=>x.roomId !== id)
            }));
        room.onLeave(()=>{
            lobbyRoom = null;
            set({
                lobby: "off",
                rooms: []
            });
            if (wantLobby) setTimeout(()=>void connectLobby(), LOBBY_RETRY_MS);
        });
        set({
            lobby: "on"
        });
    } catch (e) {
        lobbyRoom = null;
        set({
            lobby: "off",
            error: `${explain(e)} (Is the game server running?)`
        });
        if (wantLobby) setTimeout(()=>void connectLobby(), LOBBY_RETRY_MS);
    }
}
function disconnectLobby() {
    wantLobby = false;
    void lobbyRoom?.leave(true);
    lobbyRoom = null;
    set({
        lobby: "off",
        rooms: []
    });
}
// ───────── a match room ─────────
const updateListeners = new Set();
const queued = []; // updates that arrived while no game screen was listening
const TICKET = "mtg-reconnect";
const keep = (token)=>{
    try {
        if (token) sessionStorage.setItem(TICKET, token);
        else sessionStorage.removeItem(TICKET);
    } catch  {
    // private window: a refresh then simply can't rejoin
    }
};
function attach(room, spectating = false) {
    matchRoom = room;
    rejoinFor = null;
    keep(spectating ? null : room.reconnectionToken); // a refreshed page can use this to come back to the same seat (a watcher has none)
    queued.length = 0;
    // back in the same match (after a server restart): the screen keeps showing it until the server's copy arrives
    const same = room.roomId === state.matchId;
    set({
        ...same ? {} : {
            snapshot: null,
            game: null,
            chat: []
        },
        matchId: room.roomId,
        reconnecting: false,
        error: null
    });
    room.onMessage("room", (s)=>set({
            snapshot: s
        }));
    room.onMessage("start", (g)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setPlayerNames"])(g.names); // the account names are used from the very first frame
        set({
            game: g
        });
    });
    room.onMessage("update", (u)=>{
        if (updateListeners.size === 0) queued.push(u);
        else updateListeners.forEach((l)=>l(u));
    });
    room.onMessage("chat", (m)=>set({
            chat: [
                ...state.chat,
                {
                    id: chatId++,
                    ...m
                }
            ].slice(-80)
        }));
    room.onMessage("error", (m)=>flash(m.message));
    room.onMessage("closed", (m)=>flash(m.message));
    // someone started watching this match: a friend is announced as one
    room.onMessage("spectator", (m)=>notify(m.friend ? `Your friend ${m.name} is spectating your game right now.` : `${m.name} is spectating your game.`));
    room.onDrop(()=>set({
            reconnecting: true
        })); // the SDK first tries to get the same connection back by itself
    room.onReconnect(()=>set({
            reconnecting: false
        }));
    room.onLeave((code)=>{
        if (matchRoom !== room) return;
        matchRoom = null;
        if (!spectating && code !== 4000 && code !== __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$protocol$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KICKED"]) {
            void rejoin(room.roomId); // the connection was lost, or the server restarted
            return;
        }
        keep(null); // a deliberate leave: nothing to come back to
        set({
            snapshot: null,
            game: null,
            chat: []
        });
        if (code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$protocol$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KICKED"]) flash("The host removed you from this room.");
    });
    room.send("hello"); // handlers are ready: now ask where things stand
}
async function createRoom(name, password = "") {
    if (state.creating) return;
    set({
        error: null,
        creating: true
    });
    try {
        attach(await getClient().create("match", {
            token: await accessToken(),
            name,
            password
        }));
    } catch (e) {
        set({
            error: explain(e)
        });
    } finally{
        set({
            creating: false
        });
    }
}
async function joinRoom(roomId, password) {
    set({
        error: null
    });
    try {
        attach(await getClient().joinById(roomId, {
            token: await accessToken(),
            password
        }));
        dismissInvite(roomId);
        return true;
    } catch (e) {
        set({
            error: explain(e)
        });
        return false;
    }
}
async function spectateRoom(roomId, password) {
    set({
        error: null
    });
    try {
        attach(await getClient().joinById(roomId, {
            token: await accessToken(),
            spectate: true,
            password
        }), true);
        return true;
    } catch (e) {
        set({
            error: explain(e)
        });
        return false;
    }
}
function leaveRoom() {
    keep(null);
    rejoinFor = null;
    const room = matchRoom;
    matchRoom = null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$app$2f$play$2f$players$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setPlayerNames"])();
    set({
        snapshot: null,
        game: null,
        chat: [],
        reconnecting: false
    });
    void room?.leave(true);
}
// ───────── messages for the play screen ─────────
let noticeId = 0;
function notify(text) {
    const id = noticeId++;
    set({
        notices: [
            ...state.notices,
            {
                id,
                text
            }
        ].slice(-4)
    });
    setTimeout(()=>dismissNotice(id), 9000);
}
const dismissNotice = (id)=>set({
        notices: state.notices.filter((n)=>n.id !== id)
    });
// ───────── who is online: the friends' status ─────────
const SOCIAL_RETRY_MS = 4000;
const SOCIAL_POLL_MS = 12_000; // also what keeps this player showing as online
let socialRoom = null;
let wantSocial = false;
let connectingSocial = false;
let friendIds = [];
let pollTimer;
const poll = ()=>socialRoom?.send("statuses", {
        ids: friendIds
    });
const OFFLINE_CONFIRM_MS = 2 * 60_000; // offline for this long before the next "is online" counts as new
const offlineSince = {}; // when each friend was first seen offline (cleared when they are seen online)
async function connectSocial() {
    wantSocial = true;
    if (socialRoom || connectingSocial) return;
    connectingSocial = true;
    try {
        const room = await getClient().joinOrCreate("social", {
            token: await accessToken()
        });
        socialRoom = room;
        room.onMessage("statuses", (list)=>{
            // the first answer only says how things are; after that, a friend going from offline to online is news
            // "Came online" is told once per time online: a friend whose connection blinks (a page reload, a bad network) is not "back"
            // until they have really been offline for a while. Only then does the next time they appear count as news again.
            const known = Object.keys(state.friends).length > 0;
            const cameOnline = {
                ...state.cameOnline
            };
            for (const s of list){
                if (!s.online) {
                    offlineSince[s.id] ??= known ? Date.now() : 0; // first seen offline when the page opened: that may have been long ago
                    if (Date.now() - offlineSince[s.id] >= OFFLINE_CONFIRM_MS) delete cameOnline[s.id]; // gone for good: an unread message about them is stale
                } else {
                    const since = offlineSince[s.id];
                    delete offlineSince[s.id];
                    if (known && since !== undefined && Date.now() - since >= OFFLINE_CONFIRM_MS) cameOnline[s.id] = Date.now();
                }
            }
            set({
                friends: Object.fromEntries(list.map((s)=>[
                        s.id,
                        s
                    ])),
                cameOnline
            });
        });
        room.onMessage("invite", (m)=>{
            const mine = {
                ...m,
                at: Date.now()
            };
            set({
                invites: [
                    mine,
                    ...state.invites.filter((i)=>!(i.roomId === m.roomId && i.fromId === m.fromId))
                ].slice(0, 10)
            });
        });
        room.onMessage("invite-failed", (m)=>flash(m.message));
        room.onLeave(()=>{
            socialRoom = null;
            clearInterval(pollTimer);
            set({
                social: "off"
            });
            if (wantSocial) setTimeout(()=>void connectSocial(), SOCIAL_RETRY_MS);
        });
        set({
            social: "on"
        });
        poll();
        clearInterval(pollTimer);
        pollTimer = setInterval(poll, SOCIAL_POLL_MS);
    } catch  {
        if (wantSocial) setTimeout(()=>void connectSocial(), SOCIAL_RETRY_MS);
    } finally{
        connectingSocial = false;
    }
}
const dismissCameOnline = (friendId)=>{
    const rest = {
        ...state.cameOnline
    };
    delete rest[friendId];
    set({
        cameOnline: rest
    });
};
const dismissInvite = (roomId)=>set({
        invites: state.invites.filter((i)=>i.roomId !== roomId)
    });
const INVITE_KEEP_MS = 15 * 60_000; // the server lets an invited friend in for this long
const liveInvites = (invites)=>invites.filter((i)=>Date.now() - i.at < INVITE_KEEP_MS);
async function inviteFriend(friendId, roomName) {
    if (!socialRoom) {
        flash("Not connected to the game server yet. Try again in a moment.");
        return false;
    }
    if (state.snapshot && state.snapshot.stage !== "waiting") {
        flash("Finish or leave your match before inviting someone.");
        return false;
    }
    let created = false;
    if (!matchRoom) {
        await createRoom(roomName);
        created = matchRoom !== null;
        if (!created) return false; // createRoom already said why
    }
    const roomId = matchRoom?.roomId;
    if (!roomId) return false;
    // a room just opened has not told the server's list who is inside yet: the invitation checks that list
    if (created) await new Promise((r)=>setTimeout(r, 700));
    socialRoom.send("invite", {
        to: friendId,
        roomId
    });
    return true;
}
function disconnectSocial() {
    wantSocial = false;
    clearInterval(pollTimer);
    void socialRoom?.leave(true);
    socialRoom = null;
    friendIds = [];
    for (const id of Object.keys(offlineSince))delete offlineSince[id];
    set({
        social: "off",
        friends: {},
        invites: [],
        cameOnline: {}
    });
}
function watchFriends(ids) {
    friendIds = ids;
    poll();
}
// ───────── getting back into a match ─────────
const REJOIN_FOR_MS = 120_000; // long enough for a deploy to finish
let rejoinFor = null; // the match being got back into; cleared once in, or when the player leaves it
/** The room again: still running, or brought back from the server's saved copy after a restart. */ async function findRoom(roomId) {
    const token = await accessToken();
    try {
        return await getClient().joinById(roomId, {
            token
        });
    } catch (e) {
        if (!(e instanceof Error) || !/not found/.test(e.message)) throw e;
        return getClient().create("match", {
            token,
            restore: roomId
        });
    }
}
/** After a lost connection or a server restart: keeps trying to get back in, with the match still on screen. */ async function rejoin(roomId) {
    rejoinFor = roomId;
    set({
        reconnecting: true
    });
    let ended = false;
    for(let wait = 1000, until = Date.now() + REJOIN_FOR_MS; Date.now() < until; wait = Math.min(wait * 2, 8000)){
        try {
            const room = await findRoom(roomId);
            if (rejoinFor !== roomId || matchRoom) {
                void room.leave(true); // the player moved on while this was on its way
                return;
            }
            attach(room);
            return;
        } catch (e) {
            if (e.code === __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$lib$2f$online$2f$protocol$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MATCH_GONE"]) {
                ended = true;
                break;
            }
        }
        await new Promise((r)=>setTimeout(r, wait));
        if (rejoinFor !== roomId) return;
    }
    if (rejoinFor !== roomId) return;
    rejoinFor = null;
    keep(null);
    set({
        snapshot: null,
        game: null,
        chat: [],
        reconnecting: false
    });
    flash(ended ? "That match has ended." : "Lost the connection to the match.");
}
let rejoining = false;
async function tryReconnect() {
    if (matchRoom || rejoining) return;
    let ticket = null;
    try {
        ticket = sessionStorage.getItem(TICKET);
    } catch  {
        return;
    }
    if (!ticket) return;
    rejoining = true;
    try {
        attach(await getClient().reconnect(ticket));
    } catch  {
        // the server may have restarted since (a deploy): the ticket starts with the room id, and the match can be brought back
        try {
            attach(await findRoom(ticket.split(":")[0]));
        } catch  {
            keep(null); // too late: the seat was given up, or the match is over
        }
    } finally{
        rejoining = false;
    }
}
function send(type, payload) {
    matchRoom?.send(type, payload);
}
const clearError = ()=>set({
        error: null
    });
function onGameUpdate(listener) {
    updateListeners.add(listener);
    for (const u of queued.splice(0))listener(u);
    return ()=>{
        updateListeners.delete(listener);
    };
}
// ───────── for React ─────────
const subscribe = (l)=>{
    listeners.add(l);
    return ()=>{
        listeners.delete(l);
    };
};
function useOnline() {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, {
        "useOnline.useSyncExternalStore": ()=>state
    }["useOnline.useSyncExternalStore"], {
        "useOnline.useSyncExternalStore": ()=>empty
    }["useOnline.useSyncExternalStore"]);
}
_s(useOnline, "FpwL93IKMLJZuQQXefVtWynbBPQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/sound.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "audioContext",
    ()=>audioContext,
    "noiseBuffer",
    ()=>noiseBuffer,
    "playSound",
    ()=>playSound,
    "setSoundEnabled",
    ()=>setSoundEnabled,
    "setSoundVolume",
    ()=>setSoundVolume,
    "soundEnabled",
    ()=>soundEnabled,
    "soundVolume",
    ()=>soundVolume
]);
const KEY = "mtg-sound";
function soundEnabled() {
    try {
        return localStorage.getItem(KEY) !== "off";
    } catch  {
        return true; // storage blocked, or running on the server
    }
}
function setSoundEnabled(on) {
    try {
        localStorage.setItem(KEY, on ? "on" : "off");
    } catch  {
    // ignore: the switch just won't be remembered
    }
}
const VOLUME_KEY = "mtg-sound-volume";
const DEFAULT_VOLUME = 0.8;
const LOUDEST = 0.6; // the effects' master gain at full volume
function soundVolume() {
    try {
        const saved = localStorage.getItem(VOLUME_KEY);
        const v = Number(saved);
        return saved !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
    } catch  {
        return DEFAULT_VOLUME;
    }
}
function setSoundVolume(v) {
    try {
        localStorage.setItem(VOLUME_KEY, String(v));
    } catch  {
    // ignore: the setting just won't be remembered
    }
    out?.out.gain.setTargetAtTime(v * LOUDEST, out.ctx.currentTime, 0.05);
}
let ctx = null;
let out = null;
let noise1s = null;
function audioContext() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        ctx ??= new AudioContext();
        // Browsers keep audio suspended until the page has been clicked; resume() starts it once that has happened.
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    } catch  {
        return null;
    }
}
function noiseBuffer(c) {
    if (!noise1s) {
        noise1s = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const data = noise1s.getChannelData(0);
        for(let i = 0; i < data.length; i++)data[i] = Math.random() * 2 - 1;
    }
    return noise1s;
}
function audio() {
    if (!soundEnabled()) return null;
    const c = audioContext();
    if (!c) return null;
    if (!out) {
        const master = c.createGain();
        master.gain.value = soundVolume() * LOUDEST;
        master.connect(c.destination);
        out = {
            ctx: c,
            out: master
        };
    }
    return out;
}
/** A quick rise to `gain`, then an exponential fade to silence over `dur` seconds. */ function envelope(a, t, dur, gain) {
    const env = a.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(a.out);
    return env;
}
function tone(a, { freq, to, type = "sine", at = 0, dur = 0.2, gain = 0.2 }) {
    const t = a.ctx.currentTime + at;
    const osc = a.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    osc.connect(envelope(a, t, dur, gain));
    osc.start(t);
    osc.stop(t + dur + 0.05);
}
/** Filtered white noise: high and narrow it is a swish, low it is a thud. */ function noise(a, { freq, to, filter = "bandpass", q = 1, at = 0, dur = 0.15, gain = 0.2 }) {
    const t = a.ctx.currentTime + at;
    const src = a.ctx.createBufferSource();
    src.buffer = noiseBuffer(a.ctx);
    const f = a.ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    src.connect(f).connect(envelope(a, t, dur, gain));
    src.start(t);
    src.stop(t + dur + 0.05);
}
const notes = (a, freqs, step, opts, at = 0)=>freqs.forEach((freq, i)=>tone(a, {
            ...opts,
            freq,
            at: at + i * step
        }));
const RECIPES = {
    // a card sliding off the library
    draw: (a, at)=>noise(a, {
            freq: 1800,
            to: 4800,
            q: 0.8,
            dur: 0.13,
            gain: 0.22,
            at
        }),
    shuffle: (a, at)=>{
        for(let i = 0; i < 7; i++)noise(a, {
            freq: 2600 + i % 3 * 500,
            q: 1.2,
            dur: 0.05,
            gain: 0.16,
            at: at + i * 0.045
        });
    },
    land: (a, at)=>{
        tone(a, {
            freq: 120,
            to: 50,
            dur: 0.24,
            gain: 0.45,
            at
        });
        noise(a, {
            freq: 500,
            filter: "lowpass",
            dur: 0.09,
            gain: 0.18,
            at
        });
    },
    creature: (a, at)=>{
        tone(a, {
            freq: 190,
            to: 70,
            type: "triangle",
            dur: 0.28,
            gain: 0.4,
            at
        });
        noise(a, {
            freq: 900,
            filter: "lowpass",
            dur: 0.12,
            gain: 0.2,
            at
        });
        notes(a, [
            330,
            494
        ], 0.06, {
            dur: 0.35,
            gain: 0.07
        }, at + 0.04);
    },
    // a shimmer rising
    cast: (a, at)=>{
        notes(a, [
            660,
            880,
            1320
        ], 0.05, {
            dur: 0.38,
            gain: 0.1
        }, at);
        noise(a, {
            freq: 6000,
            filter: "highpass",
            dur: 0.32,
            gain: 0.05,
            at
        });
    },
    ability: (a, at)=>tone(a, {
            freq: 520,
            to: 820,
            dur: 0.14,
            gain: 0.14,
            at
        }),
    // war drums
    attack: (a, at)=>{
        tone(a, {
            freq: 95,
            to: 60,
            type: "triangle",
            dur: 0.22,
            gain: 0.5,
            at
        });
        tone(a, {
            freq: 110,
            to: 65,
            type: "triangle",
            dur: 0.3,
            gain: 0.55,
            at: at + 0.16
        });
        noise(a, {
            freq: 300,
            filter: "lowpass",
            dur: 0.12,
            gain: 0.25,
            at: at + 0.16
        });
    },
    // the whoosh of a creature charging
    charge: (a, at)=>noise(a, {
            freq: 350,
            to: 1900,
            q: 0.7,
            dur: 0.34,
            gain: 0.26,
            at
        }),
    block: (a, at)=>{
        tone(a, {
            freq: 260,
            to: 190,
            type: "triangle",
            dur: 0.16,
            gain: 0.25,
            at
        });
        noise(a, {
            freq: 700,
            filter: "lowpass",
            dur: 0.08,
            gain: 0.2,
            at
        });
    },
    // a punch landing on the player
    hit: (a, at)=>{
        tone(a, {
            freq: 170,
            to: 40,
            dur: 0.26,
            gain: 0.6,
            at
        });
        noise(a, {
            freq: 1400,
            to: 200,
            filter: "lowpass",
            dur: 0.16,
            gain: 0.4,
            at
        });
    },
    // two creatures crashing into each other
    clash: (a, at)=>{
        noise(a, {
            freq: 3200,
            q: 7,
            dur: 0.22,
            gain: 0.3,
            at
        });
        notes(a, [
            587,
            831
        ], 0, {
            type: "triangle",
            dur: 0.26,
            gain: 0.08
        }, at);
        tone(a, {
            freq: 150,
            to: 50,
            dur: 0.2,
            gain: 0.4,
            at
        });
    },
    die: (a, at)=>{
        tone(a, {
            freq: 300,
            to: 55,
            type: "sawtooth",
            dur: 0.5,
            gain: 0.08,
            at
        });
        noise(a, {
            freq: 700,
            to: 90,
            filter: "lowpass",
            dur: 0.42,
            gain: 0.18,
            at
        });
    },
    lifeGain: (a, at)=>notes(a, [
            784,
            988,
            1175,
            1568
        ], 0.06, {
            dur: 0.32,
            gain: 0.1
        }, at),
    lifeLoss: (a, at)=>tone(a, {
            freq: 230,
            to: 170,
            dur: 0.26,
            gain: 0.2,
            at
        }),
    // a crackle of fire
    burn: (a, at)=>{
        noise(a, {
            freq: 1000,
            to: 280,
            q: 1.5,
            dur: 0.32,
            gain: 0.3,
            at
        });
        tone(a, {
            freq: 210,
            to: 80,
            type: "sawtooth",
            dur: 0.22,
            gain: 0.06,
            at
        });
    },
    counter: (a, at)=>{
        notes(a, [
            620,
            310
        ], 0.09, {
            type: "square",
            dur: 0.16,
            gain: 0.05
        }, at);
        noise(a, {
            freq: 2000,
            to: 500,
            dur: 0.2,
            gain: 0.12,
            at
        });
    },
    discard: (a, at)=>noise(a, {
            freq: 1300,
            to: 600,
            dur: 0.16,
            gain: 0.2,
            at
        }),
    // a bell: your turn
    turn: (a, at)=>{
        tone(a, {
            freq: 880,
            dur: 0.9,
            gain: 0.12,
            at
        });
        tone(a, {
            freq: 1320,
            dur: 0.9,
            gain: 0.1,
            at: at + 0.14
        });
    },
    // a new notification: two short rising notes, softer than the turn bell
    notify: (a, at)=>notes(a, [
            988,
            1319
        ], 0.11, {
            type: "sine",
            dur: 0.4,
            gain: 0.13
        }, at),
    win: (a, at)=>{
        notes(a, [
            523,
            659,
            784
        ], 0.12, {
            type: "triangle",
            dur: 0.3,
            gain: 0.18
        }, at);
        tone(a, {
            freq: 1047,
            type: "triangle",
            dur: 0.9,
            gain: 0.2,
            at: at + 0.36
        });
    },
    lose: (a, at)=>notes(a, [
            392,
            330,
            262
        ], 0.22, {
            type: "triangle",
            dur: 0.55,
            gain: 0.15
        }, at)
};
function playSound(sound, at = 0) {
    const a = audio();
    if (!a) return;
    try {
        RECIPES[sound](a, at);
    } catch  {
    // a sound that fails to play should never interrupt the game
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/mtg/lib/supabase/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/mtg/node_modules/@supabase/ssr/dist/module/createBrowserClient.js [app-client] (ecmascript)");
;
function createClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createBrowserClient"])(("TURBOPACK compile-time value", "https://pfhsfkmbcrlhvvjkxbom.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_3VNeUs3aIJbUPOqEKvey1Q_q3clccy7"));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=mtg_1_yejh1g2yt6p._.js.map
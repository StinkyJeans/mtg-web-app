(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
(()=>{"use strict";return[
"[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var _global_process, _global_process1;
module.exports = ((_global_process = /*TURBOPACK member replacement*/ __turbopack_context__.g.process) == null ? void 0 : _global_process.env) && typeof ((_global_process1 = /*TURBOPACK member replacement*/ __turbopack_context__.g.process) == null ? void 0 : _global_process1.env) === 'object' ? /*TURBOPACK member replacement*/ __turbopack_context__.g.process : __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/process/browser.js [app-client] (ecmascript)");
}),
"[project]/mtg/node_modules/next/dist/lib/constants.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ACTION_SUFFIX: null,
    APP_DIR_ALIAS: null,
    CACHE_ONE_YEAR_SECONDS: null,
    DOT_NEXT_ALIAS: null,
    ESLINT_DEFAULT_DIRS: null,
    GSP_NO_RETURNED_VALUE: null,
    GSSP_COMPONENT_MEMBER_ERROR: null,
    GSSP_NO_RETURNED_VALUE: null,
    HTML_CONTENT_TYPE_HEADER: null,
    INFINITE_CACHE: null,
    INSTRUMENTATION_HOOK_FILENAME: null,
    JSON_CONTENT_TYPE_HEADER: null,
    MATCHED_PATH_HEADER: null,
    MIDDLEWARE_FILENAME: null,
    MIDDLEWARE_LOCATION_REGEXP: null,
    NEXT_BODY_SUFFIX: null,
    NEXT_CACHE_IMPLICIT_TAG_ID: null,
    NEXT_CACHE_REVALIDATED_TAGS_HEADER: null,
    NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER: null,
    NEXT_CACHE_ROOT_PARAM_TAG_ID: null,
    NEXT_CACHE_SOFT_TAG_MAX_LENGTH: null,
    NEXT_CACHE_TAGS_HEADER: null,
    NEXT_CACHE_TAG_MAX_ITEMS: null,
    NEXT_CACHE_TAG_MAX_LENGTH: null,
    NEXT_DATA_SUFFIX: null,
    NEXT_INTERCEPTION_MARKER_PREFIX: null,
    NEXT_META_SUFFIX: null,
    NEXT_NAV_DEPLOYMENT_ID_HEADER: null,
    NEXT_QUERY_PARAM_PREFIX: null,
    NEXT_RESUME_HEADER: null,
    NEXT_RESUME_STATE_LENGTH_HEADER: null,
    NON_STANDARD_NODE_ENV: null,
    PAGES_DIR_ALIAS: null,
    PRERENDER_REVALIDATE_HEADER: null,
    PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER: null,
    PROXY_FILENAME: null,
    PROXY_LOCATION_REGEXP: null,
    PUBLIC_DIR_MIDDLEWARE_CONFLICT: null,
    ROOT_DIR_ALIAS: null,
    RSC_ACTION_CLIENT_WRAPPER_ALIAS: null,
    RSC_ACTION_ENCRYPTION_ALIAS: null,
    RSC_ACTION_PROXY_ALIAS: null,
    RSC_ACTION_VALIDATE_ALIAS: null,
    RSC_CACHE_WRAPPER_ALIAS: null,
    RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS: null,
    RSC_MOD_REF_PROXY_ALIAS: null,
    RSC_SEGMENTS_DIR_SUFFIX: null,
    RSC_SEGMENT_SUFFIX: null,
    RSC_SUFFIX: null,
    SERVER_PROPS_EXPORT_ERROR: null,
    SERVER_PROPS_GET_INIT_PROPS_CONFLICT: null,
    SERVER_PROPS_SSG_CONFLICT: null,
    SERVER_RUNTIME: null,
    SSG_FALLBACK_EXPORT_ERROR: null,
    SSG_GET_INITIAL_PROPS_CONFLICT: null,
    STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR: null,
    TEXT_PLAIN_CONTENT_TYPE_HEADER: null,
    UNSTABLE_REVALIDATE_RENAME_ERROR: null,
    WEBPACK_LAYERS: null,
    WEBPACK_RESOURCE_QUERIES: null,
    WEB_SOCKET_MAX_RECONNECTIONS: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ACTION_SUFFIX: function() {
        return ACTION_SUFFIX;
    },
    APP_DIR_ALIAS: function() {
        return APP_DIR_ALIAS;
    },
    CACHE_ONE_YEAR_SECONDS: function() {
        return CACHE_ONE_YEAR_SECONDS;
    },
    DOT_NEXT_ALIAS: function() {
        return DOT_NEXT_ALIAS;
    },
    ESLINT_DEFAULT_DIRS: function() {
        return ESLINT_DEFAULT_DIRS;
    },
    GSP_NO_RETURNED_VALUE: function() {
        return GSP_NO_RETURNED_VALUE;
    },
    GSSP_COMPONENT_MEMBER_ERROR: function() {
        return GSSP_COMPONENT_MEMBER_ERROR;
    },
    GSSP_NO_RETURNED_VALUE: function() {
        return GSSP_NO_RETURNED_VALUE;
    },
    HTML_CONTENT_TYPE_HEADER: function() {
        return HTML_CONTENT_TYPE_HEADER;
    },
    INFINITE_CACHE: function() {
        return INFINITE_CACHE;
    },
    INSTRUMENTATION_HOOK_FILENAME: function() {
        return INSTRUMENTATION_HOOK_FILENAME;
    },
    JSON_CONTENT_TYPE_HEADER: function() {
        return JSON_CONTENT_TYPE_HEADER;
    },
    MATCHED_PATH_HEADER: function() {
        return MATCHED_PATH_HEADER;
    },
    MIDDLEWARE_FILENAME: function() {
        return MIDDLEWARE_FILENAME;
    },
    MIDDLEWARE_LOCATION_REGEXP: function() {
        return MIDDLEWARE_LOCATION_REGEXP;
    },
    NEXT_BODY_SUFFIX: function() {
        return NEXT_BODY_SUFFIX;
    },
    NEXT_CACHE_IMPLICIT_TAG_ID: function() {
        return NEXT_CACHE_IMPLICIT_TAG_ID;
    },
    NEXT_CACHE_REVALIDATED_TAGS_HEADER: function() {
        return NEXT_CACHE_REVALIDATED_TAGS_HEADER;
    },
    NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER: function() {
        return NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER;
    },
    NEXT_CACHE_ROOT_PARAM_TAG_ID: function() {
        return NEXT_CACHE_ROOT_PARAM_TAG_ID;
    },
    NEXT_CACHE_SOFT_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_SOFT_TAG_MAX_LENGTH;
    },
    NEXT_CACHE_TAGS_HEADER: function() {
        return NEXT_CACHE_TAGS_HEADER;
    },
    NEXT_CACHE_TAG_MAX_ITEMS: function() {
        return NEXT_CACHE_TAG_MAX_ITEMS;
    },
    NEXT_CACHE_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_TAG_MAX_LENGTH;
    },
    NEXT_DATA_SUFFIX: function() {
        return NEXT_DATA_SUFFIX;
    },
    NEXT_INTERCEPTION_MARKER_PREFIX: function() {
        return NEXT_INTERCEPTION_MARKER_PREFIX;
    },
    NEXT_META_SUFFIX: function() {
        return NEXT_META_SUFFIX;
    },
    NEXT_NAV_DEPLOYMENT_ID_HEADER: function() {
        return NEXT_NAV_DEPLOYMENT_ID_HEADER;
    },
    NEXT_QUERY_PARAM_PREFIX: function() {
        return NEXT_QUERY_PARAM_PREFIX;
    },
    NEXT_RESUME_HEADER: function() {
        return NEXT_RESUME_HEADER;
    },
    NEXT_RESUME_STATE_LENGTH_HEADER: function() {
        return NEXT_RESUME_STATE_LENGTH_HEADER;
    },
    NON_STANDARD_NODE_ENV: function() {
        return NON_STANDARD_NODE_ENV;
    },
    PAGES_DIR_ALIAS: function() {
        return PAGES_DIR_ALIAS;
    },
    PRERENDER_REVALIDATE_HEADER: function() {
        return PRERENDER_REVALIDATE_HEADER;
    },
    PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER: function() {
        return PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER;
    },
    PROXY_FILENAME: function() {
        return PROXY_FILENAME;
    },
    PROXY_LOCATION_REGEXP: function() {
        return PROXY_LOCATION_REGEXP;
    },
    PUBLIC_DIR_MIDDLEWARE_CONFLICT: function() {
        return PUBLIC_DIR_MIDDLEWARE_CONFLICT;
    },
    ROOT_DIR_ALIAS: function() {
        return ROOT_DIR_ALIAS;
    },
    RSC_ACTION_CLIENT_WRAPPER_ALIAS: function() {
        return RSC_ACTION_CLIENT_WRAPPER_ALIAS;
    },
    RSC_ACTION_ENCRYPTION_ALIAS: function() {
        return RSC_ACTION_ENCRYPTION_ALIAS;
    },
    RSC_ACTION_PROXY_ALIAS: function() {
        return RSC_ACTION_PROXY_ALIAS;
    },
    RSC_ACTION_VALIDATE_ALIAS: function() {
        return RSC_ACTION_VALIDATE_ALIAS;
    },
    RSC_CACHE_WRAPPER_ALIAS: function() {
        return RSC_CACHE_WRAPPER_ALIAS;
    },
    RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS: function() {
        return RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS;
    },
    RSC_MOD_REF_PROXY_ALIAS: function() {
        return RSC_MOD_REF_PROXY_ALIAS;
    },
    RSC_SEGMENTS_DIR_SUFFIX: function() {
        return RSC_SEGMENTS_DIR_SUFFIX;
    },
    RSC_SEGMENT_SUFFIX: function() {
        return RSC_SEGMENT_SUFFIX;
    },
    RSC_SUFFIX: function() {
        return RSC_SUFFIX;
    },
    SERVER_PROPS_EXPORT_ERROR: function() {
        return SERVER_PROPS_EXPORT_ERROR;
    },
    SERVER_PROPS_GET_INIT_PROPS_CONFLICT: function() {
        return SERVER_PROPS_GET_INIT_PROPS_CONFLICT;
    },
    SERVER_PROPS_SSG_CONFLICT: function() {
        return SERVER_PROPS_SSG_CONFLICT;
    },
    SERVER_RUNTIME: function() {
        return SERVER_RUNTIME;
    },
    SSG_FALLBACK_EXPORT_ERROR: function() {
        return SSG_FALLBACK_EXPORT_ERROR;
    },
    SSG_GET_INITIAL_PROPS_CONFLICT: function() {
        return SSG_GET_INITIAL_PROPS_CONFLICT;
    },
    STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR: function() {
        return STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR;
    },
    TEXT_PLAIN_CONTENT_TYPE_HEADER: function() {
        return TEXT_PLAIN_CONTENT_TYPE_HEADER;
    },
    UNSTABLE_REVALIDATE_RENAME_ERROR: function() {
        return UNSTABLE_REVALIDATE_RENAME_ERROR;
    },
    WEBPACK_LAYERS: function() {
        return WEBPACK_LAYERS;
    },
    WEBPACK_RESOURCE_QUERIES: function() {
        return WEBPACK_RESOURCE_QUERIES;
    },
    WEB_SOCKET_MAX_RECONNECTIONS: function() {
        return WEB_SOCKET_MAX_RECONNECTIONS;
    }
});
const TEXT_PLAIN_CONTENT_TYPE_HEADER = 'text/plain';
const HTML_CONTENT_TYPE_HEADER = 'text/html; charset=utf-8';
const JSON_CONTENT_TYPE_HEADER = 'application/json; charset=utf-8';
const NEXT_QUERY_PARAM_PREFIX = 'nxtP';
const NEXT_INTERCEPTION_MARKER_PREFIX = 'nxtI';
const MATCHED_PATH_HEADER = 'x-matched-path';
const PRERENDER_REVALIDATE_HEADER = 'x-prerender-revalidate';
const PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER = 'x-prerender-revalidate-if-generated';
const RSC_SEGMENTS_DIR_SUFFIX = '.segments';
const RSC_SEGMENT_SUFFIX = '.segment.rsc';
const RSC_SUFFIX = '.rsc';
const ACTION_SUFFIX = '.action';
const NEXT_DATA_SUFFIX = '.json';
const NEXT_META_SUFFIX = '.meta';
const NEXT_BODY_SUFFIX = '.body';
const NEXT_NAV_DEPLOYMENT_ID_HEADER = 'x-nextjs-deployment-id';
const NEXT_CACHE_TAGS_HEADER = 'x-next-cache-tags';
const NEXT_CACHE_REVALIDATED_TAGS_HEADER = 'x-next-revalidated-tags';
const NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER = 'x-next-revalidate-tag-token';
const NEXT_RESUME_HEADER = 'next-resume';
const NEXT_RESUME_STATE_LENGTH_HEADER = 'x-next-resume-state-length';
const NEXT_CACHE_TAG_MAX_ITEMS = 128;
const NEXT_CACHE_TAG_MAX_LENGTH = 256;
const NEXT_CACHE_SOFT_TAG_MAX_LENGTH = 1024;
const NEXT_CACHE_IMPLICIT_TAG_ID = '_N_T_';
const NEXT_CACHE_ROOT_PARAM_TAG_ID = '_N_RP_';
const CACHE_ONE_YEAR_SECONDS = 31536000;
const INFINITE_CACHE = 0xfffffffe;
const MIDDLEWARE_FILENAME = 'middleware';
const MIDDLEWARE_LOCATION_REGEXP = `(?:src/)?${MIDDLEWARE_FILENAME}`;
const PROXY_FILENAME = 'proxy';
const PROXY_LOCATION_REGEXP = `(?:src/)?${PROXY_FILENAME}`;
const INSTRUMENTATION_HOOK_FILENAME = 'instrumentation';
const PAGES_DIR_ALIAS = 'private-next-pages';
const DOT_NEXT_ALIAS = 'private-dot-next';
const ROOT_DIR_ALIAS = 'private-next-root-dir';
const APP_DIR_ALIAS = 'private-next-app-dir';
const RSC_MOD_REF_PROXY_ALIAS = 'private-next-rsc-mod-ref-proxy';
const RSC_ACTION_VALIDATE_ALIAS = 'private-next-rsc-action-validate';
const RSC_ACTION_PROXY_ALIAS = 'private-next-rsc-server-reference';
const RSC_CACHE_WRAPPER_ALIAS = 'private-next-rsc-cache-wrapper';
const RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS = 'private-next-rsc-track-dynamic-import';
const RSC_ACTION_ENCRYPTION_ALIAS = 'private-next-rsc-action-encryption';
const RSC_ACTION_CLIENT_WRAPPER_ALIAS = 'private-next-rsc-action-client-wrapper';
const PUBLIC_DIR_MIDDLEWARE_CONFLICT = `You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://nextjs.org/docs/messages/public-next-folder-conflict`;
const SSG_GET_INITIAL_PROPS_CONFLICT = `You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`;
const SERVER_PROPS_GET_INIT_PROPS_CONFLICT = `You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`;
const SERVER_PROPS_SSG_CONFLICT = `You can not use getStaticProps or getStaticPaths with getServerSideProps. To use SSG, please remove getServerSideProps`;
const STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR = `can not have getInitialProps/getServerSideProps, https://nextjs.org/docs/messages/404-get-initial-props`;
const SERVER_PROPS_EXPORT_ERROR = `pages with \`getServerSideProps\` can not be exported. See more info here: https://nextjs.org/docs/messages/gssp-export`;
const GSP_NO_RETURNED_VALUE = 'Your `getStaticProps` function did not return an object. Did you forget to add a `return`?';
const GSSP_NO_RETURNED_VALUE = 'Your `getServerSideProps` function did not return an object. Did you forget to add a `return`?';
const UNSTABLE_REVALIDATE_RENAME_ERROR = 'The `unstable_revalidate` property is available for general use.\n' + 'Please use `revalidate` instead.';
const GSSP_COMPONENT_MEMBER_ERROR = `can not be attached to a page's component and must be exported from the page. See more info here: https://nextjs.org/docs/messages/gssp-component-member`;
const NON_STANDARD_NODE_ENV = `You are using a non-standard "NODE_ENV" value in your environment. This creates inconsistencies in the project and is strongly advised against. Read more: https://nextjs.org/docs/messages/non-standard-node-env`;
const SSG_FALLBACK_EXPORT_ERROR = `Pages with \`fallback\` enabled in \`getStaticPaths\` can not be exported. See more info here: https://nextjs.org/docs/messages/ssg-fallback-true-export`;
const ESLINT_DEFAULT_DIRS = [
    'app',
    'pages',
    'components',
    'lib',
    'src'
];
const SERVER_RUNTIME = {
    edge: 'edge',
    experimentalEdge: 'experimental-edge',
    nodejs: 'nodejs'
};
const WEB_SOCKET_MAX_RECONNECTIONS = 12;
/**
 * The names of the webpack layers. These layers are the primitives for the
 * webpack chunks.
 */ const WEBPACK_LAYERS_NAMES = {
    /**
   * The layer for the shared code between the client and server bundles.
   */ shared: 'shared',
    /**
   * The layer for server-only runtime and picking up `react-server` export conditions.
   * Including app router RSC pages and app router custom routes and metadata routes.
   */ reactServerComponents: 'rsc',
    /**
   * Server Side Rendering layer for app (ssr).
   */ serverSideRendering: 'ssr',
    /**
   * The browser client bundle layer for actions.
   */ actionBrowser: 'action-browser',
    /**
   * The Node.js bundle layer for the API routes.
   */ apiNode: 'api-node',
    /**
   * The Edge Lite bundle layer for the API routes.
   */ apiEdge: 'api-edge',
    /**
   * The layer for the middleware code.
   */ middleware: 'middleware',
    /**
   * The layer for the instrumentation hooks.
   */ instrument: 'instrument',
    /**
   * The layer for assets on the edge.
   */ edgeAsset: 'edge-asset',
    /**
   * The browser client bundle layer for App directory.
   */ appPagesBrowser: 'app-pages-browser',
    /**
   * The browser client bundle layer for Pages directory.
   */ pagesDirBrowser: 'pages-dir-browser',
    /**
   * The Edge Lite bundle layer for Pages directory.
   */ pagesDirEdge: 'pages-dir-edge',
    /**
   * The Node.js bundle layer for Pages directory.
   */ pagesDirNode: 'pages-dir-node'
};
const WEBPACK_LAYERS = {
    ...WEBPACK_LAYERS_NAMES,
    GROUP: {
        builtinReact: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ],
        serverOnly: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        neutralTarget: [
            // pages api
            WEBPACK_LAYERS_NAMES.apiNode,
            WEBPACK_LAYERS_NAMES.apiEdge
        ],
        clientOnly: [
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser
        ],
        bundled: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.shared,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        appPages: [
            // app router pages and layouts
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ]
    }
};
const WEBPACK_RESOURCE_QUERIES = {
    edgeSSREntry: '__next_edge_ssr_entry__',
    metadata: '__next_metadata__',
    metadataRoute: '__next_metadata_route__',
    metadataImageMeta: '__next_metadata_image_meta__'
};
}),
"[project]/mtg/node_modules/next/dist/lib/framework/boundary-components.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    MetadataBoundary: null,
    OutletBoundary: null,
    RootLayoutBoundary: null,
    ViewportBoundary: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    MetadataBoundary: function() {
        return MetadataBoundary;
    },
    OutletBoundary: function() {
        return OutletBoundary;
    },
    RootLayoutBoundary: function() {
        return RootLayoutBoundary;
    },
    ViewportBoundary: function() {
        return ViewportBoundary;
    }
});
const _boundaryconstants = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/lib/framework/boundary-constants.js [app-client] (ecmascript)");
// We use a namespace object to allow us to recover the name of the function
// at runtime even when production bundling/minification is used.
const NameSpace = {
    [_boundaryconstants.METADATA_BOUNDARY_NAME]: function({ children }) {
        return children;
    },
    [_boundaryconstants.VIEWPORT_BOUNDARY_NAME]: function({ children }) {
        return children;
    },
    [_boundaryconstants.OUTLET_BOUNDARY_NAME]: function({ children }) {
        return children;
    },
    [_boundaryconstants.ROOT_LAYOUT_BOUNDARY_NAME]: function({ children }) {
        return children;
    }
};
const MetadataBoundary = // so it retains the name inferred from the namespace object
NameSpace[_boundaryconstants.METADATA_BOUNDARY_NAME.slice(0)];
const ViewportBoundary = // so it retains the name inferred from the namespace object
NameSpace[_boundaryconstants.VIEWPORT_BOUNDARY_NAME.slice(0)];
const OutletBoundary = // so it retains the name inferred from the namespace object
NameSpace[_boundaryconstants.OUTLET_BOUNDARY_NAME.slice(0)];
const RootLayoutBoundary = // so it retains the name inferred from the namespace object
NameSpace[_boundaryconstants.ROOT_LAYOUT_BOUNDARY_NAME.slice(0)];
}),
"[project]/mtg/node_modules/next/dist/lib/framework/boundary-constants.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    METADATA_BOUNDARY_NAME: null,
    OUTLET_BOUNDARY_NAME: null,
    ROOT_LAYOUT_BOUNDARY_NAME: null,
    VIEWPORT_BOUNDARY_NAME: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    METADATA_BOUNDARY_NAME: function() {
        return METADATA_BOUNDARY_NAME;
    },
    OUTLET_BOUNDARY_NAME: function() {
        return OUTLET_BOUNDARY_NAME;
    },
    ROOT_LAYOUT_BOUNDARY_NAME: function() {
        return ROOT_LAYOUT_BOUNDARY_NAME;
    },
    VIEWPORT_BOUNDARY_NAME: function() {
        return VIEWPORT_BOUNDARY_NAME;
    }
});
const METADATA_BOUNDARY_NAME = '__next_metadata_boundary__';
const VIEWPORT_BOUNDARY_NAME = '__next_viewport_boundary__';
const OUTLET_BOUNDARY_NAME = '__next_outlet_boundary__';
const ROOT_LAYOUT_BOUNDARY_NAME = '__next_root_layout_boundary__';
}),
"[project]/mtg/node_modules/next/dist/lib/is-error.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    default: null,
    getProperError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    /**
 * Checks whether the given value is a NextError.
 * This can be used to print a more detailed error message with properties like `code` & `digest`.
 */ default: function() {
        return isError;
    },
    getProperError: function() {
        return getProperError;
    }
});
const _isplainobject = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/is-plain-object.js [app-client] (ecmascript)");
/**
 * This is a safe stringify function that handles circular references.
 * We're using a simpler version here to avoid introducing
 * the dependency `safe-stable-stringify` into production bundle.
 *
 * This helper is used both in development and production.
 */ function safeStringifyLite(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (_key, value)=>{
        // If value is an object and already seen, replace with "[Circular]"
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    });
}
function isError(err) {
    return typeof err === 'object' && err !== null && 'name' in err && 'message' in err;
}
function getProperError(err) {
    if (isError(err)) {
        return err;
    }
    if ("TURBOPACK compile-time truthy", 1) {
        // provide better error for case where `throw undefined`
        // is called in development
        if (typeof err === 'undefined') {
            return new Error('An undefined error was thrown, ' + 'see here for more info: https://nextjs.org/docs/messages/threw-undefined');
        }
        if (err === null) {
            return new Error('A null error was thrown, ' + 'see here for more info: https://nextjs.org/docs/messages/threw-undefined');
        }
    }
    return new Error((0, _isplainobject.isPlainObject)(err) ? safeStringifyLite(err) : err + '');
}
}),
"[project]/mtg/node_modules/next/dist/lib/require-instrumentation-client.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * This module imports the configured client instrumentation modules.
 *
 * The `private-next-instrumentation-client` module is automatically aliased to
 * either the user's instrumentation module or a generated module array.
 */ "use strict";
if ("TURBOPACK compile-time truthy", 1) {
    const measureName = 'Client Instrumentation Hook';
    const startTime = performance.now();
    // eslint-disable-next-line @next/internal/typechecked-require -- Not a module.
    const instrumentationClient = {};
    module.exports = Array.isArray(instrumentationClient) ? instrumentationClient : [
        instrumentationClient
    ];
    const endTime = performance.now();
    const duration = endTime - startTime;
    // Using 16ms threshold as it represents one frame (1000ms/60fps)
    // This helps identify if the instrumentation hook initialization
    // could potentially cause frame drops during development.
    const THRESHOLD = 16;
    if (duration > THRESHOLD) {
        console.log(`[${measureName}] Slow execution detected: ${duration.toFixed(0)}ms (Note: Code download overhead is not included in this measurement)`);
    }
} else //TURBOPACK unreachable
;
}),
"[project]/mtg/node_modules/next/dist/next-devtools/shared/console-error.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// To distinguish from React error.digest, we use a different symbol here to determine if the error is from console.error or unhandled promise rejection.
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    createConsoleError: null,
    isConsoleError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    createConsoleError: function() {
        return createConsoleError;
    },
    isConsoleError: function() {
        return isConsoleError;
    }
});
const digestSym = Symbol.for('next.console.error.digest');
function createConsoleError(message, environmentName) {
    const error = typeof message === 'string' ? new Error(message) : message;
    error[digestSym] = 'NEXT_CONSOLE_ERROR';
    if (environmentName && !error.environmentName) {
        error.environmentName = environmentName;
    }
    return error;
}
const isConsoleError = (error)=>{
    return error && error[digestSym] === 'NEXT_CONSOLE_ERROR';
};
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/shared/forward-logs-shared.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    UNDEFINED_MARKER: null,
    markErrorAsAlreadyLoggedOnServer: null,
    patchConsoleMethod: null,
    wasErrorAlreadyLoggedOnServer: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    UNDEFINED_MARKER: function() {
        return UNDEFINED_MARKER;
    },
    markErrorAsAlreadyLoggedOnServer: function() {
        return markErrorAsAlreadyLoggedOnServer;
    },
    patchConsoleMethod: function() {
        return patchConsoleMethod;
    },
    wasErrorAlreadyLoggedOnServer: function() {
        return wasErrorAlreadyLoggedOnServer;
    }
});
const UNDEFINED_MARKER = '__next_tagged_undefined';
const alreadyLoggedOnServerSymbol = Symbol('nextAlreadyLoggedOnServer');
function markErrorAsAlreadyLoggedOnServer(error) {
    Object.defineProperty(error, alreadyLoggedOnServerSymbol, {
        value: true,
        enumerable: false,
        configurable: true
    });
}
function wasErrorAlreadyLoggedOnServer(value) {
    return typeof value === 'object' && value !== null && value[alreadyLoggedOnServerSymbol] === true;
}
function patchConsoleMethod(methodName, wrapper) {
    const descriptor = Object.getOwnPropertyDescriptor(console, methodName);
    if (descriptor && (descriptor.configurable || descriptor.writable) && typeof descriptor.value === 'function') {
        const originalMethod = descriptor.value;
        const originalName = Object.getOwnPropertyDescriptor(originalMethod, 'name');
        const wrapperMethod = function(...args) {
            wrapper(methodName, ...args);
            originalMethod.apply(this, args);
        };
        if (originalName) {
            Object.defineProperty(wrapperMethod, 'name', originalName);
        }
        Object.defineProperty(console, methodName, {
            value: wrapperMethod
        });
        return ()=>{
            Object.defineProperty(console, methodName, {
                value: originalMethod,
                writable: descriptor.writable,
                configurable: descriptor.configurable
            });
        };
    }
    return ()=>{};
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/app-dev-overlay-error-boundary.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppDevOverlayErrorBoundary", {
    enumerable: true,
    get: function() {
        return AppDevOverlayErrorBoundary;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _interop_require_wildcard = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _nextdevtools = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/next-devtools/index.js (raw)");
const _runtimeerrorhandler = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/dev/runtime-error-handler.js [app-client] (ecmascript)");
const _errorboundary = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/error-boundary.js [app-client] (ecmascript)");
const _globalerror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/builtin/global-error.js [app-client] (ecmascript)"));
const _segmentexplorernode = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js [app-client] (ecmascript)");
const _approutercontextsharedruntime = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)");
const _iserror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/lib/is-error.js [app-client] (ecmascript)"));
function ErroredHtml({ globalError: [GlobalError, globalErrorStyles], thrownValue, reset, retry }) {
    return /*#__PURE__*/ (0, _jsxruntime.jsxs)(_errorboundary.ErrorBoundary, {
        errorComponent: _globalerror.default,
        children: [
            globalErrorStyles,
            /*#__PURE__*/ (0, _jsxruntime.jsx)(GlobalError, {
                error: thrownValue,
                reset: reset,
                retry: retry
            })
        ]
    });
}
class AppDevOverlayErrorBoundary extends _react.PureComponent {
    static{
        this.contextType = _approutercontextsharedruntime.AppRouterContext;
    }
    static getDerivedStateFromError(thrownValue) {
        _runtimeerrorhandler.RuntimeErrorHandler.hadRuntimeError = true;
        return {
            error: {
                thrownValue
            }
        };
    }
    componentDidCatch(err) {
        if (("TURBOPACK compile-time value", "development") === 'development' && (0, _iserror.default)(err) && err.message === _segmentexplorernode.SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE) {
            return;
        }
        _nextdevtools.dispatcher.openErrorOverlay();
    }
    render() {
        const { children, globalError } = this.props;
        const { error } = this.state;
        if (error !== null) {
            const thrownValue = error.thrownValue;
            return /*#__PURE__*/ (0, _jsxruntime.jsx)(ErroredHtml, {
                globalError: globalError,
                thrownValue: thrownValue,
                reset: this.reset,
                retry: this.retry
            });
        }
        return children;
    }
    constructor(...args){
        super(...args), this.state = {
            error: null
        }, this.retry = ()=>{
            (0, _react.startTransition)(()=>{
                this.context?.refresh();
                this.reset();
            });
        }, this.reset = ()=>{
            this.setState({
                error: null
            });
        };
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/app-dev-overlay-setup.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const _interceptconsoleerror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/intercept-console-error.js [app-client] (ecmascript)");
const _useerrorhandler = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js [app-client] (ecmascript)");
const _forwardlogs = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs.js [app-client] (ecmascript)");
(0, _useerrorhandler.handleGlobalErrors)();
(0, _interceptconsoleerror.patchConsoleError)();
(0, _forwardlogs.initializeDebugLogForwarding)('app');
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/client-entry.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RootLevelDevOverlayElement", {
    enumerable: true,
    get: function() {
        return RootLevelDevOverlayElement;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _globalerror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/builtin/global-error.js [app-client] (ecmascript)"));
const _appdevoverlayerrorboundary = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/app-dev-overlay-error-boundary.js [app-client] (ecmascript)");
function RootLevelDevOverlayElement({ children }) {
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(_appdevoverlayerrorboundary.AppDevOverlayErrorBoundary, {
        globalError: [
            _globalerror.default,
            null
        ],
        children: children
    });
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/index.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    decorateDevError: null,
    handleClientError: null,
    originConsoleError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    decorateDevError: function() {
        return _stitchederror.decorateDevError;
    },
    handleClientError: function() {
        return _useerrorhandler.handleClientError;
    },
    originConsoleError: function() {
        return _interceptconsoleerror.originConsoleError;
    }
});
const _interceptconsoleerror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/intercept-console-error.js [app-client] (ecmascript)");
const _useerrorhandler = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js [app-client] (ecmascript)");
const _stitchederror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/stitched-error.js [app-client] (ecmascript)");
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/intercept-console-error.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    originConsoleError: null,
    patchConsoleError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    originConsoleError: function() {
        return originConsoleError;
    },
    patchConsoleError: function() {
        return patchConsoleError;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _iserror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/lib/is-error.js [app-client] (ecmascript)"));
const _isnextroutererror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/is-next-router-error.js [app-client] (ecmascript)");
const _useerrorhandler = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js [app-client] (ecmascript)");
const _console = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/lib/console.js [app-client] (ecmascript)");
const _forwardlogs = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs.js [app-client] (ecmascript)");
const originConsoleError = globalThis.console.error;
function patchConsoleError() {
    // Ensure it's only patched once
    if (typeof window === 'undefined') {
        return;
    }
    window.console.error = function error(...args) {
        let maybeError;
        let isReplayedLog = false;
        if ("TURBOPACK compile-time truthy", 1) {
            const { error: replayedError, environmentName } = (0, _console.parseConsoleArgs)(args);
            // If environmentName is set, this is a server log replayed by React in the browser
            isReplayedLog = !!environmentName;
            if (replayedError) {
                maybeError = replayedError;
            } else if ((0, _iserror.default)(args[0])) {
                maybeError = args[0];
            } else {
                // See https://github.com/facebook/react/blob/d50323eb845c5fde0d720cae888bf35dedd05506/packages/react-reconciler/src/ReactFiberErrorLogger.js#L78
                maybeError = args[1];
            }
        } else //TURBOPACK unreachable
        ;
        if (!(0, _isnextroutererror.isNextRouterError)(maybeError)) {
            if ("TURBOPACK compile-time truthy", 1) {
                (0, _useerrorhandler.handleConsoleError)(// but if we pass the error directly, `handleClientError` will ignore it
                maybeError, args);
            }
            // Don't forward replayed server logs to terminal - they were already logged on the server
            if (!isReplayedLog) {
                (0, _forwardlogs.forwardErrorLog)(args);
            }
            originConsoleError.apply(window.console, args);
        }
    };
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/replay-ssr-only-errors.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReplaySsrOnlyErrors", {
    enumerable: true,
    get: function() {
        return ReplaySsrOnlyErrors;
    }
});
const _react = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _useerrorhandler = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js [app-client] (ecmascript)");
const _isnextroutererror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/is-next-router-error.js [app-client] (ecmascript)");
const _constants = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/errors/constants.js [app-client] (ecmascript)");
function readSsrError() {
    if (typeof document === 'undefined') {
        return null;
    }
    const ssrErrorTemplateTag = document.querySelector('template[data-next-error-message]');
    if (ssrErrorTemplateTag) {
        const message = ssrErrorTemplateTag.getAttribute('data-next-error-message');
        const stack = ssrErrorTemplateTag.getAttribute('data-next-error-stack');
        const digest = ssrErrorTemplateTag.getAttribute('data-next-error-digest');
        const error = new Error(message);
        if (digest) {
            ;
            error.digest = digest;
        }
        // Skip Next.js SSR'd internal errors that which will be handled by the error boundaries.
        if ((0, _isnextroutererror.isNextRouterError)(error)) {
            return null;
        }
        error.stack = stack || '';
        return error;
    }
    return null;
}
function ReplaySsrOnlyErrors({ onBlockingError }) {
    if ("TURBOPACK compile-time truthy", 1) {
        // Need to read during render. The attributes will be gone after commit.
        const ssrError = readSsrError();
        // eslint-disable-next-line react-hooks/rules-of-hooks
        (0, _react.useEffect)(()=>{
            if (ssrError !== null) {
                // TODO(veil): Include original Owner Stack (NDX-905)
                // TODO(veil): Mark as recoverable error
                // TODO(veil): console.error
                (0, _useerrorhandler.handleClientError)(ssrError);
                // If it's missing root tags, we can't recover, make it blocking.
                if (ssrError.digest === _constants.MISSING_ROOT_TAGS_ERROR) {
                    onBlockingError();
                }
            }
        }, [
            ssrError,
            onBlockingError
        ]);
    }
    return null;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/stitched-error.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    coerceError: null,
    decorateDevError: null,
    getOwnerStack: null,
    setOwnerStack: null,
    setOwnerStackIfAvailable: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    coerceError: function() {
        return coerceError;
    },
    decorateDevError: function() {
        return decorateDevError;
    },
    getOwnerStack: function() {
        return getOwnerStack;
    },
    setOwnerStack: function() {
        return setOwnerStack;
    },
    setOwnerStackIfAvailable: function() {
        return setOwnerStackIfAvailable;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _iserror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/lib/is-error.js [app-client] (ecmascript)"));
const ownerStacks = new WeakMap();
function getOwnerStack(error) {
    return ownerStacks.get(error);
}
function setOwnerStack(error, stack) {
    ownerStacks.set(error, stack);
}
function coerceError(value) {
    return (0, _iserror.default)(value) ? value : new Error('' + value);
}
function setOwnerStackIfAvailable(error) {
    // React 18 and prod does not have `captureOwnerStack`
    if ('captureOwnerStack' in _react.default) {
        const ownerStack = _react.default.captureOwnerStack();
        // Only set if we captured a valid owner stack, or if none exists yet.
        // This prevents overwriting a valid owner stack captured earlier
        // (e.g., in onRecoverableError) with null captured later.
        if (ownerStack || !ownerStacks.has(error)) {
            setOwnerStack(error, ownerStack);
        }
    }
}
function decorateDevError(thrownValue) {
    const error = coerceError(thrownValue);
    setOwnerStackIfAvailable(error);
    return error;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/use-error-handler.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    handleClientError: null,
    handleConsoleError: null,
    handleGlobalErrors: null,
    useErrorHandler: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    handleClientError: function() {
        return handleClientError;
    },
    handleConsoleError: function() {
        return handleConsoleError;
    },
    handleGlobalErrors: function() {
        return handleGlobalErrors;
    },
    useErrorHandler: function() {
        return useErrorHandler;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _react = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _isnextroutererror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/is-next-router-error.js [app-client] (ecmascript)");
const _console = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/lib/console.js [app-client] (ecmascript)");
const _iserror = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/lib/is-error.js [app-client] (ecmascript)"));
const _consoleerror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/shared/console-error.js [app-client] (ecmascript)");
const _stitchederror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/stitched-error.js [app-client] (ecmascript)");
const _forwardlogs = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs.js [app-client] (ecmascript)");
const queueMicroTask = globalThis.queueMicrotask || ((cb)=>Promise.resolve().then(cb));
const errorQueue = [];
const errorHandlers = [];
const rejectionQueue = [];
const rejectionHandlers = [];
function handleConsoleError(originError, consoleErrorArgs) {
    let error;
    const { environmentName } = (0, _console.parseConsoleArgs)(consoleErrorArgs);
    if ((0, _iserror.default)(originError)) {
        error = (0, _consoleerror.createConsoleError)(originError, environmentName);
    } else {
        error = (0, _consoleerror.createConsoleError)((0, _console.formatConsoleArgs)(consoleErrorArgs), environmentName);
    }
    (0, _stitchederror.setOwnerStackIfAvailable)(error);
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        errorQueue.push(error);
        for (const handler of errorHandlers){
            // Delayed the error being passed to React Dev Overlay,
            // avoid the state being synchronously updated in the component.
            queueMicroTask(()=>{
                handler(error);
            });
        }
    }
}
function handleClientError(error, metadata = undefined) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        errorQueue.push(error);
        for (const handler of errorHandlers){
            // Delayed the error being passed to React Dev Overlay,
            // avoid the state being synchronously updated in the component.
            queueMicroTask(()=>{
                handler(error);
            });
        }
    }
}
function useErrorHandler(handleOnUnhandledError, handleOnUnhandledRejection) {
    (0, _react.useEffect)(()=>{
        // Handle queued errors.
        errorQueue.forEach(handleOnUnhandledError);
        rejectionQueue.forEach(handleOnUnhandledRejection);
        // Listen to new errors.
        errorHandlers.push(handleOnUnhandledError);
        rejectionHandlers.push(handleOnUnhandledRejection);
        return ()=>{
            // Remove listeners.
            errorHandlers.splice(errorHandlers.indexOf(handleOnUnhandledError), 1);
            rejectionHandlers.splice(rejectionHandlers.indexOf(handleOnUnhandledRejection), 1);
            // Reset error queues.
            errorQueue.splice(0, errorQueue.length);
            rejectionQueue.splice(0, rejectionQueue.length);
        };
    }, [
        handleOnUnhandledError,
        handleOnUnhandledRejection
    ]);
}
function onUnhandledError(event) {
    const thrownValue = event.error;
    if ((0, _isnextroutererror.isNextRouterError)(thrownValue)) {
        event.preventDefault();
        return false;
    }
    // When there's an error property present, we log the error to error overlay.
    // Otherwise we don't do anything as it's not logging in the console either.
    if (thrownValue) {
        const error = (0, _stitchederror.coerceError)(thrownValue);
        (0, _stitchederror.setOwnerStackIfAvailable)(error);
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        else {
            handleClientError(error);
        }
        (0, _forwardlogs.forwardUnhandledError)(error);
    }
}
function onUnhandledRejection(ev) {
    const reason = ev?.reason;
    if ((0, _isnextroutererror.isNextRouterError)(reason)) {
        ev.preventDefault();
        return;
    }
    const error = (0, _stitchederror.coerceError)(reason);
    (0, _stitchederror.setOwnerStackIfAvailable)(error);
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        rejectionQueue.push(error);
        for (const handler of rejectionHandlers){
            handler(error);
        }
    }
    (0, _forwardlogs.logUnhandledRejection)(reason);
}
function handleGlobalErrors() {
    if (typeof window !== 'undefined') {
        try {
            // Increase the number of stack frames on the client
            Error.stackTraceLimit = 50;
        } catch  {}
        window.addEventListener('error', onUnhandledError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs-utils.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    logStringify: null,
    preLogSerializationClone: null,
    safeStringifyWithDepth: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    logStringify: function() {
        return logStringify;
    },
    preLogSerializationClone: function() {
        return preLogSerializationClone;
    },
    safeStringifyWithDepth: function() {
        return safeStringifyWithDepth;
    }
});
const _safestablestringify = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/safe-stable-stringify/index.js [app-client] (ecmascript)");
const _terminalloggingconfig = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/terminal-logging-config.js [app-client] (ecmascript)");
const _forwardlogsshared = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/shared/forward-logs-shared.js [app-client] (ecmascript)");
const terminalLoggingConfig = (0, _terminalloggingconfig.getTerminalLoggingConfig)();
const PROMISE_MARKER = 'Promise {}';
const UNAVAILABLE_MARKER = '[Unable to view]';
const maximumDepth = typeof terminalLoggingConfig === 'object' && terminalLoggingConfig.depthLimit ? terminalLoggingConfig.depthLimit : 5;
const maximumBreadth = typeof terminalLoggingConfig === 'object' && terminalLoggingConfig.edgeLimit ? terminalLoggingConfig.edgeLimit : 100;
const safeStringifyWithDepth = (0, _safestablestringify.configure)({
    maximumDepth,
    maximumBreadth
});
function preLogSerializationClone(value, seen = new WeakMap()) {
    if (value === undefined) return _forwardlogsshared.UNDEFINED_MARKER;
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    try {
        Object.keys(value);
    } catch  {
        return UNAVAILABLE_MARKER;
    }
    try {
        if (typeof value.then === 'function') return PROMISE_MARKER;
    } catch  {
        return UNAVAILABLE_MARKER;
    }
    if (Array.isArray(value)) {
        const out = [];
        seen.set(value, out);
        for (const item of value){
            try {
                out.push(preLogSerializationClone(item, seen));
            } catch  {
                out.push(UNAVAILABLE_MARKER);
            }
        }
        return out;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
        const out = {};
        seen.set(value, out);
        for (const key of Object.keys(value)){
            try {
                out[key] = preLogSerializationClone(value[key], seen);
            } catch  {
                out[key] = UNAVAILABLE_MARKER;
            }
        }
        return out;
    }
    return Object.prototype.toString.call(value);
}
const logStringify = (data)=>{
    try {
        const result = safeStringifyWithDepth(data);
        return result ?? `"${UNAVAILABLE_MARKER}"`;
    } catch  {
        return `"${UNAVAILABLE_MARKER}"`;
    }
};
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    forwardErrorLog: null,
    forwardUnhandledError: null,
    initializeDebugLogForwarding: null,
    logQueue: null,
    logUnhandledRejection: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    forwardErrorLog: function() {
        return forwardErrorLog;
    },
    forwardUnhandledError: function() {
        return forwardUnhandledError;
    },
    initializeDebugLogForwarding: function() {
        return initializeDebugLogForwarding;
    },
    logQueue: function() {
        return logQueue;
    },
    logUnhandledRejection: function() {
        return logUnhandledRejection;
    }
});
const _errorsource = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/error-source.js [app-client] (ecmascript)");
const _terminalloggingconfig = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/terminal-logging-config.js [app-client] (ecmascript)");
const _forwardlogsshared = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/shared/forward-logs-shared.js [app-client] (ecmascript)");
const _forwardlogsutils = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/forward-logs-utils.js [app-client] (ecmascript)");
const _stitchederror = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/errors/stitched-error.js [app-client] (ecmascript)");
const isTerminalLoggingEnabled = (0, _terminalloggingconfig.getIsTerminalLoggingEnabled)();
const shouldForwardLogs = isTerminalLoggingEnabled || !!("TURBOPACK compile-time value", true);
const methods = [
    'log',
    'info',
    'warn',
    'debug',
    'table',
    'assert',
    'dir',
    'dirxml',
    'group',
    'groupCollapsed',
    'groupEnd',
    'trace'
];
const afterThisFrame = (cb)=>{
    let timeout;
    const rafId = requestAnimationFrame(()=>{
        timeout = setTimeout(()=>{
            cb();
        });
    });
    return ()=>{
        cancelAnimationFrame(rafId);
        clearTimeout(timeout);
    };
};
let isPatched = false;
const serializeEntries = (entries)=>entries.map((clientEntry)=>{
        switch(clientEntry.kind){
            case 'any-logged-error':
            case 'console':
                {
                    return {
                        ...clientEntry,
                        args: clientEntry.args.map(stringifyUserArg)
                    };
                }
            case 'formatted-error':
                {
                    return clientEntry;
                }
            default:
                {
                    return null;
                }
        }
    });
const flushBufferedEntries = (socket)=>{
    if (logQueue.entries.length === 0) {
        return;
    }
    const payload = JSON.stringify({
        event: 'browser-logs',
        entries: serializeEntries(logQueue.entries),
        router: logQueue.router,
        // needed for source mapping, we just assign the sourceType from the last error for the whole batch
        sourceType: logQueue.sourceType
    });
    socket.send(payload);
    logQueue.entries = [];
    logQueue.sourceType = undefined;
};
const logQueue = {
    entries: [],
    flushScheduled: false,
    cancelFlush: null,
    socket: null,
    sourceType: undefined,
    router: null,
    scheduleLogSend: (entry)=>{
        logQueue.entries.push(entry);
        if (logQueue.flushScheduled) {
            return;
        }
        // safe to deref and use in setTimeout closure since we cancel on new socket
        const socket = logQueue.socket;
        if (!socket) {
            return;
        }
        // we probably dont need this
        logQueue.flushScheduled = true;
        // non blocking log flush, runs at most once per frame
        logQueue.cancelFlush = afterThisFrame(()=>{
            logQueue.flushScheduled = false;
            // just incase
            try {
                flushBufferedEntries(socket);
            } catch  {
            // error (make sure u don't infinite loop)
            /* noop */ }
        });
    },
    onSocketReady: (socket)=>{
        // When MCP or terminal logging is enabled, we enable the socket connection,
        // otherwise it will not proceed.
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        if (socket.readyState !== WebSocket.OPEN) {
            // invariant
            return;
        }
        // incase an existing timeout was going to run with a stale socket
        logQueue.cancelFlush?.();
        logQueue.socket = socket;
        try {
            flushBufferedEntries(socket);
        } catch  {
        /** noop just incase */ }
    }
};
const stringifyUserArg = (arg)=>{
    if (arg.kind !== 'arg') {
        return arg;
    }
    return {
        ...arg,
        data: (0, _forwardlogsutils.logStringify)(arg.data)
    };
};
const createErrorArg = (error)=>{
    return {
        kind: 'formatted-error-arg',
        prefix: error.message ? `${error.name}: ${error.message}` : `${error.name}`,
        stack: getErrorStackWithOwnerStack(error)
    };
};
const createLogEntry = (level, args)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // do not abstract this, it implicitly relies on which functions call it. forcing the inlined implementation makes you think about callers
    // error capture stack trace maybe
    const stack = getErrorStack(new Error());
    const stackLines = stack?.split('\n');
    const cleanStack = stackLines?.slice(3).join('\n') // this is probably ignored anyways
    ;
    const entry = {
        kind: 'console',
        consoleMethodStack: cleanStack ?? null,
        method: level,
        args: args.map((arg)=>{
            if (arg instanceof Error) {
                return createErrorArg(arg);
            }
            return {
                kind: 'arg',
                data: (0, _forwardlogsutils.preLogSerializationClone)(arg)
            };
        })
    };
    logQueue.scheduleLogSend(entry);
};
const forwardErrorLog = (args)=>{
    // Skip React server replayed logs - they were already logged on the server
    if (isReactServerReplayedLog(args)) {
        return;
    }
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const errorObjects = args.filter((arg)=>arg instanceof Error);
    const first = errorObjects.at(0);
    // Skip errors that originated on the server and were already logged there
    // (e.g. Cache Components validation errors that are also sent to the browser
    // to show in the dev overlay). Forwarding them back would duplicate them in
    // the terminal.
    if (first && (0, _forwardlogsshared.wasErrorAlreadyLoggedOnServer)(first)) {
        return;
    }
    if (first) {
        const source = (0, _errorsource.getErrorSource)(first);
        if (source) {
            logQueue.sourceType = source;
        }
    }
    /**
   * browser shows stack regardless of type of data passed to console.error, so we should do the same
   *
   * do not abstract this, it implicitly relies on which functions call it. forcing the inlined implementation makes you think about callers
   */ const stack = getErrorStack(new Error());
    const stackLines = stack?.split('\n');
    const cleanStack = stackLines?.slice(3).join('\n');
    const entry = {
        kind: 'any-logged-error',
        method: 'error',
        consoleErrorStack: cleanStack ?? '',
        args: args.map((arg)=>{
            if (arg instanceof Error) {
                return createErrorArg(arg);
            }
            return {
                kind: 'arg',
                data: (0, _forwardlogsutils.preLogSerializationClone)(arg)
            };
        })
    };
    logQueue.scheduleLogSend(entry);
};
const createUncaughtErrorEntry = (errorName, errorMessage, fullStack)=>{
    const entry = {
        kind: 'formatted-error',
        prefix: `Uncaught ${errorName}: ${errorMessage}`,
        stack: fullStack,
        method: 'error'
    };
    logQueue.scheduleLogSend(entry);
};
const getErrorStack = (error)=>{
    return error.stack || '';
};
// Get error stack with owner stack appended for source mapping on the server
const getErrorStackWithOwnerStack = (error)=>{
    const errorStack = getErrorStack(error);
    const ownerStack = (0, _stitchederror.getOwnerStack)(error);
    return ownerStack ? `${errorStack}\n${ownerStack}` : errorStack;
};
function logUnhandledRejection(reason) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    if (reason instanceof Error) {
        createUnhandledRejectionErrorEntry(reason, getErrorStackWithOwnerStack(reason));
        return;
    }
    createUnhandledRejectionNonErrorEntry(reason);
}
const createUnhandledRejectionErrorEntry = (error, fullStack)=>{
    const source = (0, _errorsource.getErrorSource)(error);
    if (source) {
        logQueue.sourceType = source;
    }
    const entry = {
        kind: 'formatted-error',
        prefix: `⨯ unhandledRejection: ${error.name}: ${error.message}`,
        stack: fullStack,
        method: 'error'
    };
    logQueue.scheduleLogSend(entry);
};
const createUnhandledRejectionNonErrorEntry = (reason)=>{
    const entry = {
        kind: 'any-logged-error',
        // we can't access the stack since the event is dispatched async and creating an inline error would be meaningless
        consoleErrorStack: '',
        method: 'error',
        args: [
            {
                kind: 'arg',
                data: `⨯ unhandledRejection:`,
                isRejectionMessage: true
            },
            {
                kind: 'arg',
                data: (0, _forwardlogsutils.preLogSerializationClone)(reason)
            }
        ]
    };
    logQueue.scheduleLogSend(entry);
};
const isHMR = (args)=>{
    const firstArg = args[0];
    if (typeof firstArg !== 'string') {
        return false;
    }
    if (firstArg.startsWith('[Fast Refresh]')) {
        return true;
    }
    if (firstArg.startsWith('[HMR]')) {
        return true;
    }
    return false;
};
/**
 * Matches the format of logs arguments React replayed from the RSC.
 */ const isReactServerReplayedLog = (args)=>{
    if (args.length < 3) {
        return false;
    }
    const [format, styles, label] = args;
    if (typeof format !== 'string' || typeof styles !== 'string' || typeof label !== 'string') {
        return false;
    }
    return format.startsWith('%c%s%c') && styles.includes('background:');
};
function forwardUnhandledError(error) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    createUncaughtErrorEntry(error.name, error.message, getErrorStackWithOwnerStack(error));
}
const initializeDebugLogForwarding = (router)=>{
    // probably don't need this
    if (isPatched) {
        return;
    }
    // TODO(rob): why does this break rendering on server, important to know incase the same bug appears in browser
    if (typeof window === 'undefined') {
        return;
    }
    // better to be safe than sorry
    try {
        methods.forEach((method)=>(0, _forwardlogsshared.patchConsoleMethod)(method, (_, ...args)=>{
                if (isHMR(args)) {
                    return;
                }
                if (isReactServerReplayedLog(args)) {
                    return;
                }
                createLogEntry(method, args);
            }));
    } catch  {}
    logQueue.router = router;
    isPatched = true;
};
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE: null,
    SegmentBoundaryTriggerNode: null,
    SegmentStateProvider: null,
    SegmentViewNode: null,
    SegmentViewStateNode: null,
    useSegmentState: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE: function() {
        return SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE;
    },
    SegmentBoundaryTriggerNode: function() {
        return SegmentBoundaryTriggerNode;
    },
    SegmentStateProvider: function() {
        return SegmentStateProvider;
    },
    SegmentViewNode: function() {
        return SegmentViewNode;
    },
    SegmentViewStateNode: function() {
        return SegmentViewStateNode;
    },
    useSegmentState: function() {
        return useSegmentState;
    }
});
const _jsxruntime = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _nextdevtools = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/next-devtools/index.js (raw)");
const _approutercontextsharedruntime = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)");
const _notfound = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/not-found.js [app-client] (ecmascript)");
const SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE = 'NEXT_DEVTOOLS_SIMULATED_ERROR';
function SegmentTrieNode({ type, pagePath }) {
    const { boundaryType, setBoundaryType } = useSegmentState();
    const nodeState = (0, _react.useMemo)(()=>{
        return {
            type,
            pagePath,
            boundaryType,
            setBoundaryType
        };
    }, [
        type,
        pagePath,
        boundaryType,
        setBoundaryType
    ]);
    // Use `useLayoutEffect` to ensure the state is updated during suspense.
    // `useEffect` won't work as the state is preserved during suspense.
    (0, _react.useLayoutEffect)(()=>{
        _nextdevtools.dispatcher.segmentExplorerNodeAdd(nodeState);
        return ()=>{
            _nextdevtools.dispatcher.segmentExplorerNodeRemove(nodeState);
        };
    }, [
        nodeState
    ]);
    return null;
}
function NotFoundSegmentNode() {
    (0, _notfound.notFound)();
}
function ErrorSegmentNode() {
    throw new Error(SEGMENT_EXPLORER_SIMULATED_ERROR_MESSAGE);
}
const forever = new Promise(()=>{});
function LoadingSegmentNode() {
    (0, _react.use)(forever);
    return null;
}
function SegmentViewStateNode({ page }) {
    const { tree } = (0, _react.useContext)(_approutercontextsharedruntime.GlobalLayoutRouterContext);
    (0, _react.useLayoutEffect)(()=>{
        _nextdevtools.dispatcher.segmentExplorerUpdateRouteState(page, tree);
        return ()=>{
            _nextdevtools.dispatcher.segmentExplorerUpdateRouteState('', null);
        };
    }, [
        page,
        tree
    ]);
    return null;
}
function SegmentBoundaryTriggerNode() {
    const { boundaryType } = useSegmentState();
    let segmentNode = null;
    if (boundaryType === 'loading') {
        segmentNode = /*#__PURE__*/ (0, _jsxruntime.jsx)(LoadingSegmentNode, {});
    } else if (boundaryType === 'not-found') {
        segmentNode = /*#__PURE__*/ (0, _jsxruntime.jsx)(NotFoundSegmentNode, {});
    } else if (boundaryType === 'error') {
        segmentNode = /*#__PURE__*/ (0, _jsxruntime.jsx)(ErrorSegmentNode, {});
    }
    return segmentNode;
}
function SegmentViewNode({ type, pagePath, children }) {
    const segmentNode = /*#__PURE__*/ (0, _jsxruntime.jsx)(SegmentTrieNode, {
        type: type,
        pagePath: pagePath
    }, type);
    return /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
        children: [
            segmentNode,
            children
        ]
    });
}
const SegmentStateContext = /*#__PURE__*/ (0, _react.createContext)({
    boundaryType: null,
    setBoundaryType: ()=>{}
});
function SegmentStateProvider({ children }) {
    const [boundaryType, setBoundaryType] = (0, _react.useState)(null);
    const [errorBoundaryKey, setErrorBoundaryKey] = (0, _react.useState)(0);
    const reloadBoundary = (0, _react.useCallback)(()=>setErrorBoundaryKey((prev)=>prev + 1), []);
    const setBoundaryTypeAndReload = (0, _react.useCallback)((type)=>{
        if (type === null) {
            reloadBoundary();
        }
        setBoundaryType(type);
    }, [
        reloadBoundary
    ]);
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(SegmentStateContext.Provider, {
        value: {
            boundaryType,
            setBoundaryType: setBoundaryTypeAndReload
        },
        children: children
    }, errorBoundaryKey);
}
function useSegmentState() {
    return (0, _react.useContext)(SegmentStateContext);
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/app/terminal-logging-config.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    getIsTerminalLoggingEnabled: null,
    getTerminalLoggingConfig: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getIsTerminalLoggingEnabled: function() {
        return getIsTerminalLoggingEnabled;
    },
    getTerminalLoggingConfig: function() {
        return getTerminalLoggingConfig;
    }
});
function getTerminalLoggingConfig() {
    try {
        return JSON.parse(("TURBOPACK compile-time value", '"warn"') || 'false');
    } catch  {
        return false;
    }
}
function getIsTerminalLoggingEnabled() {
    const config = getTerminalLoggingConfig();
    return Boolean(config);
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/next-devtools/userspace/use-app-dev-rendering-indicator.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useAppDevRenderingIndicator", {
    enumerable: true,
    get: function() {
        return useAppDevRenderingIndicator;
    }
});
const _react = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _nextdevtools = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/next-devtools/index.js (raw)");
const useAppDevRenderingIndicator = ()=>{
    const [isPending, startTransition] = (0, _react.useTransition)();
    (0, _react.useEffect)(()=>{
        if (isPending) {
            _nextdevtools.dispatcher.renderingIndicatorShow();
        } else {
            _nextdevtools.dispatcher.renderingIndicatorHide();
        }
    }, [
        isPending
    ]);
    return startTransition;
};
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/server/dev/hot-reloader-types.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    HMR_MESSAGE_SENT_TO_BROWSER: null,
    HMR_MESSAGE_SENT_TO_SERVER: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HMR_MESSAGE_SENT_TO_BROWSER: function() {
        return HMR_MESSAGE_SENT_TO_BROWSER;
    },
    HMR_MESSAGE_SENT_TO_SERVER: function() {
        return HMR_MESSAGE_SENT_TO_SERVER;
    }
});
var HMR_MESSAGE_SENT_TO_BROWSER = /*#__PURE__*/ function(HMR_MESSAGE_SENT_TO_BROWSER) {
    // JSON messages:
    HMR_MESSAGE_SENT_TO_BROWSER["ADDED_PAGE"] = "addedPage";
    HMR_MESSAGE_SENT_TO_BROWSER["REMOVED_PAGE"] = "removedPage";
    HMR_MESSAGE_SENT_TO_BROWSER["RELOAD_PAGE"] = "reloadPage";
    HMR_MESSAGE_SENT_TO_BROWSER["SERVER_COMPONENT_CHANGES"] = "serverComponentChanges";
    HMR_MESSAGE_SENT_TO_BROWSER["STATIC_PARAMS_CHANGED"] = "staticParamsChanged";
    HMR_MESSAGE_SENT_TO_BROWSER["MIDDLEWARE_CHANGES"] = "middlewareChanges";
    HMR_MESSAGE_SENT_TO_BROWSER["CLIENT_CHANGES"] = "clientChanges";
    HMR_MESSAGE_SENT_TO_BROWSER["SERVER_ONLY_CHANGES"] = "serverOnlyChanges";
    HMR_MESSAGE_SENT_TO_BROWSER["SYNC"] = "sync";
    HMR_MESSAGE_SENT_TO_BROWSER["BUILT"] = "built";
    HMR_MESSAGE_SENT_TO_BROWSER["BUILDING"] = "building";
    HMR_MESSAGE_SENT_TO_BROWSER["DEV_PAGES_MANIFEST_UPDATE"] = "devPagesManifestUpdate";
    HMR_MESSAGE_SENT_TO_BROWSER["TURBOPACK_MESSAGE"] = "turbopack-message";
    HMR_MESSAGE_SENT_TO_BROWSER["SERVER_ERROR"] = "serverError";
    HMR_MESSAGE_SENT_TO_BROWSER["TURBOPACK_CONNECTED"] = "turbopack-connected";
    HMR_MESSAGE_SENT_TO_BROWSER["ISR_MANIFEST"] = "isrManifest";
    HMR_MESSAGE_SENT_TO_BROWSER["CACHE_INDICATOR"] = "cacheIndicator";
    HMR_MESSAGE_SENT_TO_BROWSER["DEV_INDICATOR"] = "devIndicator";
    HMR_MESSAGE_SENT_TO_BROWSER["DEVTOOLS_CONFIG"] = "devtoolsConfig";
    HMR_MESSAGE_SENT_TO_BROWSER["VULNERABILITY_INSIGHT"] = "vulnerabilityInsight";
    HMR_MESSAGE_SENT_TO_BROWSER["REQUEST_CURRENT_ERROR_STATE"] = "requestCurrentErrorState";
    HMR_MESSAGE_SENT_TO_BROWSER["RUNTIME_ERRORS"] = "runtimeErrors";
    HMR_MESSAGE_SENT_TO_BROWSER["REQUEST_PAGE_METADATA"] = "requestPageMetadata";
    HMR_MESSAGE_SENT_TO_BROWSER["REQUEST_INSIGHTS_UPDATE"] = "requestInsightsUpdate";
    // Binary messages:
    HMR_MESSAGE_SENT_TO_BROWSER[HMR_MESSAGE_SENT_TO_BROWSER["REACT_DEBUG_CHUNK"] = 0] = "REACT_DEBUG_CHUNK";
    HMR_MESSAGE_SENT_TO_BROWSER[HMR_MESSAGE_SENT_TO_BROWSER["ERRORS_TO_SHOW_IN_BROWSER"] = 1] = "ERRORS_TO_SHOW_IN_BROWSER";
    return HMR_MESSAGE_SENT_TO_BROWSER;
}({});
var HMR_MESSAGE_SENT_TO_SERVER = /*#__PURE__*/ function(HMR_MESSAGE_SENT_TO_SERVER) {
    // JSON messages:
    HMR_MESSAGE_SENT_TO_SERVER["MCP_ERROR_STATE_RESPONSE"] = "mcp-error-state-response";
    HMR_MESSAGE_SENT_TO_SERVER["RUNTIME_ERRORS"] = "runtimeErrors";
    HMR_MESSAGE_SENT_TO_SERVER["MCP_PAGE_METADATA_RESPONSE"] = "mcp-page-metadata-response";
    HMR_MESSAGE_SENT_TO_SERVER["PING"] = "ping";
    return HMR_MESSAGE_SENT_TO_SERVER;
}({});
}),
"[project]/mtg/node_modules/next/dist/shared/lib/action-revalidation-kind.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ActionDidNotRevalidate: null,
    ActionDidRevalidateDynamicOnly: null,
    ActionDidRevalidateStaticAndDynamic: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ActionDidNotRevalidate: function() {
        return ActionDidNotRevalidate;
    },
    ActionDidRevalidateDynamicOnly: function() {
        return ActionDidRevalidateDynamicOnly;
    },
    ActionDidRevalidateStaticAndDynamic: function() {
        return ActionDidRevalidateStaticAndDynamic;
    }
});
const ActionDidNotRevalidate = 0;
const ActionDidRevalidateStaticAndDynamic = 1;
const ActionDidRevalidateDynamicOnly = 2;
}),
"[project]/mtg/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    AppRouterContext: null,
    GlobalLayoutRouterContext: null,
    LayoutRouterContext: null,
    MissingSlotContext: null,
    TemplateContext: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    AppRouterContext: function() {
        return AppRouterContext;
    },
    GlobalLayoutRouterContext: function() {
        return GlobalLayoutRouterContext;
    },
    LayoutRouterContext: function() {
        return LayoutRouterContext;
    },
    MissingSlotContext: function() {
        return MissingSlotContext;
    },
    TemplateContext: function() {
        return TemplateContext;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const AppRouterContext = _react.default.createContext(null);
const LayoutRouterContext = _react.default.createContext(null);
const GlobalLayoutRouterContext = _react.default.createContext(null);
const TemplateContext = _react.default.createContext(null);
if ("TURBOPACK compile-time truthy", 1) {
    AppRouterContext.displayName = 'AppRouterContext';
    LayoutRouterContext.displayName = 'LayoutRouterContext';
    GlobalLayoutRouterContext.displayName = 'GlobalLayoutRouterContext';
    TemplateContext.displayName = 'TemplateContext';
}
const MissingSlotContext = _react.default.createContext(new Set());
}),
"[project]/mtg/node_modules/next/dist/shared/lib/app-router-types.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * App Router types - Client-safe types for the Next.js App Router
 *
 * This file contains type definitions that can be safely imported
 * by both client-side and server-side code without circular dependencies.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    PrefetchHint: null,
    StaticAttemptHints: null,
    StaticPrefetchDisabled: null,
    SubtreePrefetchHints: null,
    propagateSubtreeBits: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    PrefetchHint: function() {
        return PrefetchHint;
    },
    StaticAttemptHints: function() {
        return StaticAttemptHints;
    },
    StaticPrefetchDisabled: function() {
        return StaticPrefetchDisabled;
    },
    SubtreePrefetchHints: function() {
        return SubtreePrefetchHints;
    },
    propagateSubtreeBits: function() {
        return propagateSubtreeBits;
    }
});
var PrefetchHint = /*#__PURE__*/ function(PrefetchHint) {
    // NOTE: The 0b00001 bit was previously HasRuntimePrefetch (prefetch:
    // 'allow-runtime'). Partial Prefetching allows using runtime requests
    // for every segment, so the bit was removed. Do not reuse it without
    // considering caches populated by older builds.
    // This segment or one of its descendants opts into Partial Prefetching, i.e.
    // uses the two-phase (Shell then Speculative) prefetch flow. Set when
    // `prefetch` is 'partial' (including the default implied by the global
    // `partialPrefetching` config). Propagates upward so the root segment
    // reflects the entire subtree.
    //
    // Partial Prefetching routes may use runtime requests for both shells
    // and prefetches. They *may* be optimized to a use a static request
    // if no runtime data was accessed during the prerender.
    // However, If the route has `ensureStatic` configured to "shell", "prefetch",
    // or "navigation", we *must* use static requests for the shell (and possibly the
    // prefetch).
    // Both of these cases are signalled to the scheduler via the
    // `ShouldAttemptStatic{Shell,Prefetch}` hints and the `needsRuntimeRequest`
    // promise.
    PrefetchHint[PrefetchHint["SubtreeHasPartialPrefetching"] = 2] = "SubtreeHasPartialPrefetching";
    // This segment itself has a loading.tsx boundary.
    PrefetchHint[PrefetchHint["SegmentHasLoadingBoundary"] = 4] = "SegmentHasLoadingBoundary";
    // A descendant segment (but not this one) has a loading.tsx boundary.
    // Propagates upward so the root reflects the entire subtree.
    PrefetchHint[PrefetchHint["SubtreeHasLoadingBoundary"] = 8] = "SubtreeHasLoadingBoundary";
    // This segment is at or above the application's root layout — the root layout
    // segment itself and all of its ancestors. A dynamic param in one of these
    // segments is a "root param".
    PrefetchHint[PrefetchHint["IsRootLayoutOrAbove"] = 16] = "IsRootLayoutOrAbove";
    // This segment's response includes its parent's data inlined into it.
    // Set at build time by the segment size measurement pass.
    PrefetchHint[PrefetchHint["ParentInlinedIntoSelf"] = 32] = "ParentInlinedIntoSelf";
    // This segment's data is inlined into one of its children — don't fetch
    // it separately. Set at build time by the segment size measurement pass.
    PrefetchHint[PrefetchHint["InlinedIntoChild"] = 64] = "InlinedIntoChild";
    // On a __PAGE__: this page's response includes the head (metadata/viewport)
    // in its transport data (PartialTransportData's `h`).
    PrefetchHint[PrefetchHint["HeadInlinedIntoSelf"] = 128] = "HeadInlinedIntoSelf";
    // On the root hint node: the head was NOT inlined into any page — fetch
    // it separately. Absence of this bit means the head is bundled into a page.
    PrefetchHint[PrefetchHint["HeadOutlined"] = 256] = "HeadOutlined";
    // The inlining hints in this tree may be stale because the tree was
    // generated before collectPrefetchHints ran (e.g. the initial RSC payload
    // for a fully static page at build time). When writing this tree into the
    // cache, the route entry should be immediately expired so it gets
    // re-fetched with correct hints. Only set during build-time prerendering,
    // never at runtime.
    PrefetchHint[PrefetchHint["InliningHintsStale"] = 512] = "InliningHintsStale";
    // This segment has prefetch = 'force-disabled'. The opt-out is passive
    // and applies to this segment only: it never INITIATES a prefetch — no
    // static data is emitted or fetched, and it's never the reason a runtime
    // prefetch spawns — but it may ride along in a runtime response issued on
    // another segment's behalf. Descendants prefetch normally.
    //
    // TODO: Also set as an internal fallback when the prefetch hints manifest
    // is unavailable (see #91407 mitigations), which only means "no static
    // prefetch data exists" — not a user opt-out. Split the fallback into its
    // own bit so the two intents can diverge.
    PrefetchHint[PrefetchHint["PrefetchDisabled"] = 1024] = "PrefetchDisabled";
    // NOTE: The 0b100000000000 bit was previously SubtreeHasRuntimePrefetch.
    // Partial Prefetching now implies runtime completeness for every segment
    // (see SubtreeHasPartialPrefetching), so the bit was removed. Do not reuse
    // it without considering caches populated by older builds.
    // NOTE: The 0b1000000000000 bit was previously SubtreeHasEagerPrefetch
    // (prefetch: 'unstable_eager', plus every segment that did not opt into
    // Partial Prefetching). After `unstable_eager` was removed, it's no longer needed.
    // This segment or one of its descendants exports `instant = false`,
    // explicitly opting out of Partial Prefetching. Propagates upward so the root
    // reflects the entire subtree. Used only to suppress the dev-time
    // `<Link prefetch={true}>` warning — unlike PrefetchDisabled, it has no effect
    // on the actual prefetch behavior.
    PrefetchHint[PrefetchHint["SubtreeHasInstantFalse"] = 8192] = "SubtreeHasInstantFalse";
    // The client should attempt a static prefetch for this route: the
    // build-time prerender did not access any runtime data (cookies, headers,
    // searchParams, ...), so a static prefetch is expected to be as complete
    // as a runtime one. A fallback-param access only unsets the bit when the
    // route can never be upgraded from a fallback to a concrete prerender —
    // on an upgradeable route, ISR later produces the concrete prerender a
    // static attempt would hit (until then, the static responses' own
    // signal reports the insufficiency per response). Purely advisory, and
    // both error directions are safe: if set when a runtime request is
    // actually needed, that same response-level signal (the load-bearing
    // `needsRuntimeRequest` promise combined with each segment's `isPartial`)
    // directs the client to follow up — the cost is a wasted static attempt.
    // If unset when static would have sufficed, the client goes straight to a
    // runtime prefetch, which is a superset of the static response — the cost
    // is only reduced cacheability. Like the other bits, this one is computed
    // once per build and stays constant for the build's lifetime; it rides
    // the prefetch-hints manifest into every response that carries hints —
    // `/_tree` prefetch responses and the FlightRouterState of dynamic
    // navigations alike. (Routes missing from the manifest — see the #91407
    // fallbacks — simply never carry it.) Set on every node of the tree, but
    // does not propagate.
    PrefetchHint[PrefetchHint["ShouldAttemptStaticShell"] = 16384] = "ShouldAttemptStaticShell";
    PrefetchHint[PrefetchHint["ShouldAttemptStaticPrefetch"] = 32768] = "ShouldAttemptStaticPrefetch";
    // This dynamic segment only accepts build-time parameter values. Kept on
    // the affected node, without propagating or copying it to other segments.
    // Until the client knows the allowed values, any such node prevents route
    // prediction, even when the route's components never read the parameter.
    PrefetchHint[PrefetchHint["IsClosedParam"] = 65536] = "IsClosedParam";
    // A descendant segment (but not this one) has a closed parameter. Propagates
    // upward so route prediction can check the root instead of walking the tree.
    PrefetchHint[PrefetchHint["SubtreeHasClosedParams"] = 131072] = "SubtreeHasClosedParams";
    return PrefetchHint;
}({});
const StaticPrefetchDisabled = 1024;
const StaticAttemptHints = 16384 | 32768;
const SubtreePrefetchHints = 2 | 8 | 8192 | 131072;
function propagateSubtreeBits(parentHints, childHints) {
    if (childHints & 2) {
        parentHints |= 2;
    }
    // A child with a loading boundary (directly, or anywhere in its subtree) makes
    // this a SubtreeHasLoadingBoundary on the parent.
    if (childHints & (4 | 8)) {
        parentHints |= 8;
    }
    // And for `instant = false`. The bit is set directly on each opted-out
    // segment, so there's no separate segment-local flag — propagate it as-is.
    if (childHints & 8192) {
        parentHints |= 8192;
    }
    if (childHints & (65536 | 131072)) {
        parentHints |= 131072;
    }
    return parentHints;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/deployment-id.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    getAssetToken: null,
    getAssetTokenQuery: null,
    getDeploymentId: null,
    getDeploymentIdQuery: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getAssetToken: function() {
        return getAssetToken;
    },
    getAssetTokenQuery: function() {
        return getAssetTokenQuery;
    },
    getDeploymentId: function() {
        return getDeploymentId;
    },
    getDeploymentIdQuery: function() {
        return getDeploymentIdQuery;
    }
});
let deploymentId;
if (typeof window !== 'undefined') {
    deploymentId = document.documentElement.dataset.dplId;
    // Immediately remove the attribute to prevent hydration errors (the dplId was inserted into the
    // HTML only), React isn't aware of it at all.
    document.documentElement.removeAttribute('data-dpl-id');
} else {
    // Client side: replaced with globalThis.NEXT_DEPLOYMENT_ID
    // Server side: left as is or replaced with a string or replaced with false
    deploymentId = ("TURBOPACK compile-time value", false) || undefined;
}
function getDeploymentId() {
    return deploymentId;
}
function getDeploymentIdQuery(ampersand = false) {
    let id = getDeploymentId();
    if (id) {
        return `${ampersand ? '&' : '?'}dpl=${id}`;
    }
    return '';
}
function getAssetToken() {
    return ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : ("TURBOPACK compile-time value", false);
}
function getAssetTokenQuery(ampersand = false) {
    let id = getAssetToken();
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return '';
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/error-source.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    decorateServerError: null,
    getErrorSource: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    decorateServerError: function() {
        return decorateServerError;
    },
    getErrorSource: function() {
        return getErrorSource;
    }
});
const symbolError = Symbol.for('NextjsError');
function getErrorSource(error) {
    return error[symbolError] || null;
}
function decorateServerError(error, type) {
    Object.defineProperty(error, symbolError, {
        writable: false,
        enumerable: false,
        configurable: false,
        value: type
    });
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/errors/constants.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MISSING_ROOT_TAGS_ERROR", {
    enumerable: true,
    get: function() {
        return MISSING_ROOT_TAGS_ERROR;
    }
});
const MISSING_ROOT_TAGS_ERROR = 'NEXT_MISSING_ROOT_TAGS';
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/format-webpack-messages.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
MIT License

Copyright (c) 2015-present, Facebook, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return formatWebpackMessages;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _stripansi = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/strip-ansi/index.js [app-client] (ecmascript)"));
// This file is based on https://github.com/facebook/create-react-app/blob/7b1a32be6ec9f99a6c9a3c66813f3ac09c4736b9/packages/react-dev-utils/formatWebpackMessages.js
// It's been edited to remove chalk and CRA-specific logic
const friendlySyntaxErrorLabel = 'Syntax error:';
const WEBPACK_BREAKING_CHANGE_POLYFILLS = '\n\nBREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules by default.';
function isLikelyASyntaxError(message) {
    return (0, _stripansi.default)(message).includes(friendlySyntaxErrorLabel);
}
let hadMissingSassError = false;
// Cleans up webpack error messages.
function formatMessage(message, verbose, importTraceNote) {
    // TODO: Replace this once webpack 5 is stable
    if (typeof message === 'object' && message.message) {
        let filteredModuleTrace = message.moduleTrace && message.moduleTrace.filter((trace)=>!/next-(middleware|client-pages|route|edge-function)-loader\.js/.test(trace.originName));
        let body = message.message;
        const breakingChangeIndex = body.indexOf(WEBPACK_BREAKING_CHANGE_POLYFILLS);
        if (breakingChangeIndex >= 0) {
            body = body.slice(0, breakingChangeIndex);
        }
        // TODO: Rspack currently doesn't populate moduleName correctly in some cases,
        // fall back to moduleIdentifier as a workaround
        if (__TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_RSPACK && !message.moduleName && !message.file && message.moduleIdentifier) {
            const parts = message.moduleIdentifier.split('!');
            message.moduleName = parts[parts.length - 1];
        }
        message = (message.moduleName ? (0, _stripansi.default)(message.moduleName) + '\n' : '') + (message.file ? (0, _stripansi.default)(message.file) + '\n' : '') + body + (message.details && verbose ? '\n' + message.details : '') + (filteredModuleTrace && filteredModuleTrace.length ? (importTraceNote || '\n\nImport trace for requested module:') + filteredModuleTrace.map((trace)=>`\n${trace.moduleName}`).join('') : '') + (message.stack && verbose ? '\n' + message.stack : '');
    }
    let lines = message.split('\n');
    // Extract loader paths from Webpack-added headers and move them to end.
    // Original format: "Module build failed (from ./loaders/foo-loader.js):"
    // The header line is removed and the path is appended at the end as:
    //   "  (from ./loaders/foo-loader.js)"
    // https://github.com/webpack/webpack/blob/master/lib/ModuleError.js
    const loaderPaths = [];
    lines = lines.filter((line)=>{
        const match = /Module [A-z ]+\(from (.+)\):?\s*$/.exec(line);
        if (match) {
            loaderPaths.push(match[1]);
            return false;
        }
        return true;
    });
    // Transform parsing error into syntax error
    // TODO: move this to our ESLint formatter?
    lines = lines.map((line)=>{
        const parsingError = /Line (\d+):(?:(\d+):)?\s*Parsing error: (.+)$/.exec(line);
        if (!parsingError) {
            return line;
        }
        const [, errorLine, errorColumn, errorMessage] = parsingError;
        return `${friendlySyntaxErrorLabel} ${errorMessage} (${errorLine}:${errorColumn})`;
    });
    message = lines.join('\n');
    // Smoosh syntax errors (commonly found in CSS)
    message = message.replace(/SyntaxError\s+\((\d+):(\d+)\)\s*(.+?)\n/g, `${friendlySyntaxErrorLabel} $3 ($1:$2)\n`);
    // Clean up export errors
    message = message.replace(/^.*export '(.+?)' was not found in '(.+?)'.*$/gm, `Attempted import error: '$1' is not exported from '$2'.`);
    message = message.replace(/^.*export 'default' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm, `Attempted import error: '$2' does not contain a default export (imported as '$1').`);
    message = message.replace(/^.*export '(.+?)' \(imported as '(.+?)'\) was not found in '(.+?)'.*$/gm, `Attempted import error: '$1' is not exported from '$3' (imported as '$2').`);
    lines = message.split('\n');
    // Remove leading newline
    if (lines.length > 2 && lines[1].trim() === '') {
        lines.splice(1, 1);
    }
    // Cleans up verbose "module not found" messages for files and packages.
    if (lines[1] && lines[1].startsWith('Module not found: ')) {
        lines = [
            lines[0],
            lines[1].replace('Error: ', '').replace('Module not found: Cannot find file:', 'Cannot find file:'),
            ...lines.slice(2)
        ];
    }
    // Add helpful message for users trying to use Sass for the first time
    if (lines[1] && lines[1].match(/Cannot find module.+sass/)) {
        // ./file.module.scss (<<loader info>>) => ./file.module.scss
        const firstLine = lines[0].split('!');
        lines[0] = firstLine[firstLine.length - 1];
        lines[1] = "To use Next.js' built-in Sass support, you first need to install `sass`.\n";
        lines[1] += 'Run `npm i sass` or `yarn add sass` inside your workspace.\n';
        lines[1] += '\nLearn more: https://nextjs.org/docs/messages/install-sass';
        // dispose of unhelpful stack trace
        lines = lines.slice(0, 2);
        hadMissingSassError = true;
    } else if (hadMissingSassError && message.match(/(sass-loader|resolve-url-loader: CSS error)/)) {
        // dispose of unhelpful stack trace following missing sass module
        lines = [];
    }
    if (!verbose) {
        message = lines.join('\n');
        // Internal stacks are generally useless so we strip them... with the
        // exception of stacks containing `webpack:` because they're normally
        // from user code generated by Webpack. For more information see
        // https://github.com/facebook/create-react-app/pull/1050
        message = message.replace(/^\s*at\s((?!webpack:).)*:\d+:\d+[\s)]*(\n|$)/gm, '') // at ... ...:x:y
        ;
        message = message.replace(/^\s*at\s<anonymous>(\n|$)/gm, '') // at <anonymous>
        ;
        message = message.replace(/File was processed with these loaders:\n(.+[\\/](next[\\/]dist[\\/].+|@next[\\/]react-refresh-utils[\\/]loader)\.js\n)*You may need an additional loader to handle the result of these loaders.\n/g, '');
        lines = message.split('\n');
    }
    // Append loader paths at the end (before any remaining stack trace)
    if (loaderPaths.length > 0) {
        for (const loaderPath of loaderPaths){
            // Don't show internal Next.js loader paths — they're noise for users
            if (!/[/\\]next[/\\]dist[/\\]/.test(loaderPath)) {
                lines.push(`  (from ${loaderPath})`);
            }
        }
    }
    // Remove duplicated newlines
    lines = lines.filter((line, index, arr)=>index === 0 || line.trim() !== '' || line.trim() !== arr[index - 1].trim());
    // Reassemble the message
    message = lines.join('\n');
    return message.trim();
}
function formatWebpackMessages(json, verbose) {
    const formattedErrors = json.errors.map((message)=>{
        const isUnknownNextFontError = message.message.includes('An error occurred in `next/font`.');
        return formatMessage(message, isUnknownNextFontError || verbose);
    });
    const formattedWarnings = json.warnings.map((message)=>{
        return formatMessage(message, verbose);
    });
    // Reorder errors to put the most relevant ones first.
    let reactServerComponentsError = -1;
    for(let i = 0; i < formattedErrors.length; i++){
        const error = formattedErrors[i];
        if (error.includes('ReactServerComponentsError')) {
            reactServerComponentsError = i;
            break;
        }
    }
    // Move the reactServerComponentsError to the top if it exists
    if (reactServerComponentsError !== -1) {
        const error = formattedErrors.splice(reactServerComponentsError, 1);
        formattedErrors.unshift(error[0]);
    }
    const result = {
        ...json,
        errors: formattedErrors,
        warnings: formattedWarnings
    };
    if (!verbose && result.errors.some(isLikelyASyntaxError)) {
        // If there are any syntax errors, show just them.
        result.errors = result.errors.filter(isLikelyASyntaxError);
        result.warnings = [];
    }
    return result;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/hash.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// http://www.cse.yorku.ca/~oz/hash.html
// More specifically, 32-bit hash via djbxor
// (ref: https://gist.github.com/eplawless/52813b1d8ad9af510d85?permalink_comment_id=3367765#gistcomment-3367765)
// This is due to number type differences between rust for turbopack to js number types,
// where rust does not have easy way to repreesnt js's 53-bit float number type for the matching
// overflow behavior. This is more `correct` in terms of having canonical hash across different runtime / implementation
// as can gaurantee determinstic output from 32bit hash.
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    djb2Hash: null,
    hexHash: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    djb2Hash: function() {
        return djb2Hash;
    },
    hexHash: function() {
        return hexHash;
    }
});
function djb2Hash(str) {
    let hash = 5381;
    for(let i = 0; i < str.length; i++){
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char & 0xffffffff;
    }
    return hash >>> 0;
}
function hexHash(str) {
    return djb2Hash(str).toString(36).slice(0, 5);
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/head-manager-context.shared-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HeadManagerContext", {
    enumerable: true,
    get: function() {
        return HeadManagerContext;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const HeadManagerContext = _react.default.createContext({});
if ("TURBOPACK compile-time truthy", 1) {
    HeadManagerContext.displayName = 'HeadManagerContext';
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/hooks-client-context.shared-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    NavigationPromisesContext: null,
    PathParamsContext: null,
    PathnameContext: null,
    ReadonlyURLSearchParams: null,
    SearchParamsContext: null,
    createDevToolsInstrumentedPromise: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    NavigationPromisesContext: function() {
        return NavigationPromisesContext;
    },
    PathParamsContext: function() {
        return PathParamsContext;
    },
    PathnameContext: function() {
        return PathnameContext;
    },
    ReadonlyURLSearchParams: function() {
        return _readonlyurlsearchparams.ReadonlyURLSearchParams;
    },
    SearchParamsContext: function() {
        return SearchParamsContext;
    },
    createDevToolsInstrumentedPromise: function() {
        return createDevToolsInstrumentedPromise;
    }
});
const _react = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
const _readonlyurlsearchparams = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/client/components/readonly-url-search-params.js [app-client] (ecmascript)");
const SearchParamsContext = (0, _react.createContext)(null);
const PathnameContext = (0, _react.createContext)(null);
const PathParamsContext = (0, _react.createContext)(null);
const NavigationPromisesContext = (0, _react.createContext)(null);
function createDevToolsInstrumentedPromise(displayName, value) {
    const promise = Promise.resolve(value);
    promise.status = 'fulfilled';
    promise.value = value;
    promise.displayName = `${displayName} (SSR)`;
    return promise;
}
if ("TURBOPACK compile-time truthy", 1) {
    SearchParamsContext.displayName = 'SearchParamsContext';
    PathnameContext.displayName = 'PathnameContext';
    PathParamsContext.displayName = 'PathParamsContext';
    NavigationPromisesContext.displayName = 'NavigationPromisesContext';
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/instant-messages.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    createLinkPrefetchPartialError: null,
    createUnrenderedSegmentError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    createLinkPrefetchPartialError: function() {
        return createLinkPrefetchPartialError;
    },
    createUnrenderedSegmentError: function() {
        return createUnrenderedSegmentError;
    }
});
function createUnrenderedSegmentError(route, missingFiles) {
    let message = `Route "${route}": Could not validate that a segment in your UI has instant navigation.`;
    if (missingFiles.length > 0) {
        const label = missingFiles.length === 1 ? 'Dropped segment' : 'Dropped segments';
        message += `\n\nThis segment was dropped from rendering. Issues that would prevent instant navigation will go undetected.` + `\n\n${label}:\n${missingFiles.map((p)=>`  ${p}`).join('\n')}` + `\n\nWays to fix this:` + `\n  - [render] Render the dropped segment` + `\n  - [ignore] Set \`export const instant = false\` to opt the dropped segment out of instant-navigation validation` + `\n\nLearn more: https://nextjs.org/docs/messages/instant-unrendered-segment`;
    }
    return new Error(message);
}
function createLinkPrefetchPartialError(pathname) {
    return new Error(`Next.js encountered dynamic data during prefetching for "${pathname}".\n\n` + `This will lead to slower, more expensive prefetches.\n\n` + `Ways to fix this:\n` + `  - [upgrade] Opt into Partial Prefetching by exporting \`const prefetch = 'partial'\` from the page or layout, or by setting \`partialPrefetching: true\` in next.config to opt the whole app in\n` + `  - [disable] Remove \`prefetch={true}\` from the <Link> to use the default prefetch\n` + `  - [ignore] Set \`export const instant = false\` to opt the route out of instant-navigation validation\n\n` + `Learn more: https://nextjs.org/docs/messages/instant-link-prefetch-partial`);
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/invariant-error.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InvariantError", {
    enumerable: true,
    get: function() {
        return InvariantError;
    }
});
class InvariantError extends Error {
    constructor(message, options){
        super(`Invariant: ${message.endsWith('.') ? message : message + '.'} This is a bug in Next.js.`, options);
        this.name = 'InvariantError';
    }
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/is-plain-object.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    getObjectClassLabel: null,
    isPlainObject: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getObjectClassLabel: function() {
        return getObjectClassLabel;
    },
    isPlainObject: function() {
        return isPlainObject;
    }
});
function getObjectClassLabel(value) {
    return Object.prototype.toString.call(value);
}
function isPlainObject(value) {
    if (getObjectClassLabel(value) !== '[object Object]') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    /**
   * this used to be previously:
   *
   * `return prototype === null || prototype === Object.prototype`
   *
   * but Edge Runtime expose Object from vm, being that kind of type-checking wrongly fail.
   *
   * It was changed to the current implementation since it's resilient to serialization.
   */ return prototype === null || prototype.hasOwnProperty('isPrototypeOf');
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/is-thenable.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * Check to see if a value is Thenable.
 *
 * @param promise the maybe-thenable value
 * @returns true if the value is thenable
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isThenable", {
    enumerable: true,
    get: function() {
        return isThenable;
    }
});
function isThenable(promise) {
    return promise !== null && typeof promise === 'object' && 'then' in promise && typeof promise.then === 'function';
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/lazy-dynamic/bailout-to-csr.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This has to be a shared module which is shared between client component error boundary and dynamic component
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    BailoutToCSRError: null,
    isBailoutToCSRError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    BailoutToCSRError: function() {
        return BailoutToCSRError;
    },
    isBailoutToCSRError: function() {
        return isBailoutToCSRError;
    }
});
const BAILOUT_TO_CSR = 'BAILOUT_TO_CLIENT_SIDE_RENDERING';
class BailoutToCSRError extends Error {
    constructor(reason){
        super(`Bail out to client-side rendering: ${reason}`), this.reason = reason, this.digest = BAILOUT_TO_CSR;
    }
}
function isBailoutToCSRError(err) {
    if (typeof err !== 'object' || err === null || !('digest' in err)) {
        return false;
    }
    return err.digest === BAILOUT_TO_CSR;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/normalized-asset-prefix.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "normalizedAssetPrefix", {
    enumerable: true,
    get: function() {
        return normalizedAssetPrefix;
    }
});
function normalizedAssetPrefix(assetPrefix) {
    // remove all leading slashes and trailing slashes
    const escapedAssetPrefix = assetPrefix?.replace(/^\/+|\/+$/g, '') || false;
    // if an assetPrefix was '/', we return empty string
    // because it could be an unnecessary trailing slash
    if (!escapedAssetPrefix) {
        return '';
    }
    if (URL.canParse(escapedAssetPrefix)) {
        const url = new URL(escapedAssetPrefix).toString();
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    // assuming assetPrefix here is a pathname-style,
    // restore the leading slash
    return `/${escapedAssetPrefix}`;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/page-path/ensure-leading-slash.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * For a given page path, this function ensures that there is a leading slash.
 * If there is not a leading slash, one is added, otherwise it is noop.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureLeadingSlash", {
    enumerable: true,
    get: function() {
        return ensureLeadingSlash;
    }
});
function ensureLeadingSlash(path) {
    return path.startsWith('/') ? path : `/${path}`;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/promise-with-resolvers.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createPromiseWithResolvers", {
    enumerable: true,
    get: function() {
        return createPromiseWithResolvers;
    }
});
function createPromiseWithResolvers() {
    // Shim of Stage 4 Promise.withResolvers proposal
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        resolve = res;
        reject = rej;
    });
    return {
        resolve: resolve,
        reject: reject,
        promise
    };
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/add-path-prefix.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "addPathPrefix", {
    enumerable: true,
    get: function() {
        return addPathPrefix;
    }
});
const _parsepath = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/router/utils/parse-path.js [app-client] (ecmascript)");
function addPathPrefix(path, prefix) {
    if (!path.startsWith('/') || !prefix) {
        return path;
    }
    const { pathname, query, hash } = (0, _parsepath.parsePath)(path);
    return `${prefix}${pathname}${query}${hash}`;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/app-paths.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    compareAppPaths: null,
    normalizeAppPath: null,
    normalizeRscURL: null,
    selectAppPageEntry: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    compareAppPaths: function() {
        return compareAppPaths;
    },
    normalizeAppPath: function() {
        return normalizeAppPath;
    },
    normalizeRscURL: function() {
        return normalizeRscURL;
    },
    selectAppPageEntry: function() {
        return selectAppPageEntry;
    }
});
const _ensureleadingslash = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/page-path/ensure-leading-slash.js [app-client] (ecmascript)");
const _segment = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/segment.js [app-client] (ecmascript)");
function normalizeAppPath(route) {
    return (0, _ensureleadingslash.ensureLeadingSlash)(route.split('/').reduce((pathname, segment, index, segments)=>{
        // Empty segments are ignored.
        if (!segment) {
            return pathname;
        }
        // Groups are ignored.
        if ((0, _segment.isGroupSegment)(segment)) {
            return pathname;
        }
        // Parallel segments are ignored.
        if (segment[0] === '@') {
            return pathname;
        }
        // The last segment (if it's a leaf) should be ignored.
        if ((segment === 'page' || segment === 'route') && index === segments.length - 1) {
            return pathname;
        }
        return `${pathname}/${segment}`;
    }, ''));
}
function compareAppPaths(a, b) {
    const aHasSlot = a.includes('/@');
    const bHasSlot = b.includes('/@');
    if (aHasSlot && !bHasSlot) return -1;
    if (!aHasSlot && bHasSlot) return 1;
    return a.localeCompare(b);
}
function normalizeAppPageEntryPathname(appPath) {
    // Webpack app entries preserve escaped underscore segments as `%5F`, while
    // normalized request pathnames expose the decoded `_` segment.
    return normalizeAppPath(appPath).replace(/%5F/g, '_');
}
function selectAppPageEntry(pathname, appPaths, normalizePathname = normalizeAppPageEntryPathname) {
    let entry;
    for (const appPath of appPaths){
        if (normalizePathname(appPath) !== pathname) continue;
        if (entry === undefined || compareAppPaths(entry, appPath) < 0) {
            entry = appPath;
        }
    }
    if (entry === undefined) {
        throw new Error(`Invariant: no direct app page entry found for ${pathname}`);
    }
    return entry;
}
function normalizeRscURL(url) {
    return url.replace(/\.rsc($|\?)/, '$1');
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/cache-busting-search-param.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    computeCacheBustingSearchParam: null,
    computeLegacyCacheBustingSearchParam: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    computeCacheBustingSearchParam: function() {
        return computeCacheBustingSearchParam;
    },
    computeLegacyCacheBustingSearchParam: function() {
        return computeLegacyCacheBustingSearchParam;
    }
});
const _hash = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/hash.js [app-client] (ecmascript)");
const CACHE_BUSTING_SEARCH_PARAM_DIGEST_BYTES = 12;
const textEncoder = new TextEncoder();
function encodeCacheBustingSearchParam(bytes) {
    let binary = '';
    for(let i = 0; i < bytes.length; i++){
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function normalizeCacheBustingInput(value) {
    if (value === undefined) {
        return '0';
    }
    return Array.isArray(value) ? value.join(',') : value;
}
function createCacheBustingSearchParamInput(prefetchHeader, segmentPrefetchHeader, stateTreeHeader, nextUrlHeader) {
    if ((prefetchHeader === undefined || prefetchHeader === '0') && segmentPrefetchHeader === undefined && stateTreeHeader === undefined && nextUrlHeader === undefined) {
        return null;
    }
    return [
        prefetchHeader ?? '0',
        normalizeCacheBustingInput(segmentPrefetchHeader),
        normalizeCacheBustingInput(stateTreeHeader),
        normalizeCacheBustingInput(nextUrlHeader)
    ].join(',');
}
async function computeCacheBustingSearchParamFromInput(input) {
    // Truncate SHA-256 to 96 bits to keep `_rsc` compact
    const digest = await globalThis.crypto.subtle.digest('SHA-256', textEncoder.encode(input));
    return encodeCacheBustingSearchParam(new Uint8Array(digest).subarray(0, CACHE_BUSTING_SEARCH_PARAM_DIGEST_BYTES));
}
async function computeCacheBustingSearchParam(prefetchHeader, segmentPrefetchHeader, stateTreeHeader, nextUrlHeader) {
    const input = createCacheBustingSearchParamInput(prefetchHeader, segmentPrefetchHeader, stateTreeHeader, nextUrlHeader);
    if (input === null) {
        return '';
    }
    return computeCacheBustingSearchParamFromInput(input);
}
function computeLegacyCacheBustingSearchParam(prefetchHeader, segmentPrefetchHeader, stateTreeHeader, nextUrlHeader) {
    const input = createCacheBustingSearchParamInput(prefetchHeader, segmentPrefetchHeader, stateTreeHeader, nextUrlHeader);
    if (input === null) {
        return '';
    }
    return (0, _hash.hexHash)(input);
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/html-bots.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This regex contains the bots that we need to do a blocking render for and can't safely stream the response
// due to how they parse the DOM. For example, they might explicitly check for metadata in the `head` tag, so we can't stream metadata tags after the `head` was sent.
// Note: The pattern [\w-]+-Google captures all Google crawlers with "-Google" suffix (e.g., Mediapartners-Google, AdsBot-Google, Storebot-Google)
// as well as crawlers starting with "Google-" (e.g., Google-PageRenderer, Google-InspectionTool)
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HTML_LIMITED_BOT_UA_RE", {
    enumerable: true,
    get: function() {
        return HTML_LIMITED_BOT_UA_RE;
    }
});
const HTML_LIMITED_BOT_UA_RE = /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/interception-routes.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    INTERCEPTION_ROUTE_MARKERS: null,
    extractInterceptionRouteInformation: null,
    findMissingCanonicalInterceptionRoutes: null,
    isInterceptionRouteAppPath: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    INTERCEPTION_ROUTE_MARKERS: function() {
        return INTERCEPTION_ROUTE_MARKERS;
    },
    extractInterceptionRouteInformation: function() {
        return extractInterceptionRouteInformation;
    },
    findMissingCanonicalInterceptionRoutes: function() {
        return findMissingCanonicalInterceptionRoutes;
    },
    isInterceptionRouteAppPath: function() {
        return isInterceptionRouteAppPath;
    }
});
const _apppaths = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/router/utils/app-paths.js [app-client] (ecmascript)");
const INTERCEPTION_ROUTE_MARKERS = [
    '(..)(..)',
    '(.)',
    '(..)',
    '(...)'
];
function parseRoutePattern(route) {
    const segments = route.split('/').filter(Boolean);
    const tail = segments.at(-1);
    const isOptionalCatchAll = tail !== undefined && tail.startsWith('[[...') && tail.endsWith(']]');
    const isCatchAll = tail !== undefined && tail.startsWith('[...') && tail.endsWith(']');
    const unbounded = isOptionalCatchAll || isCatchAll;
    const prefixSegments = unbounded ? segments.slice(0, -1) : segments;
    return {
        prefix: prefixSegments.map((segment)=>segment.startsWith('[') && segment.endsWith(']') ? null : segment),
        minLength: prefixSegments.length + (isCatchAll && !isOptionalCatchAll ? 1 : 0),
        unbounded
    };
}
function acceptsLength(pattern, length) {
    return pattern.unbounded ? length >= pattern.minLength : length === pattern.minLength;
}
function prefixCovers(canonical, intercepted) {
    return canonical.prefix.every((canonicalSegment, index)=>{
        if (canonicalSegment === null) return true;
        const interceptedSegment = intercepted.prefix[index];
        return interceptedSegment !== undefined && interceptedSegment !== null && canonicalSegment === interceptedSegment;
    });
}
function patternCoversAtLength(canonical, intercepted, length) {
    return acceptsLength(canonical, length) && acceptsLength(intercepted, length) && prefixCovers(canonical, intercepted);
}
/** Returns whether ordinary route patterns cover every URL in `route`. */ function isRoutePatternCovered(route, ordinaryRoutes) {
    const intercepted = parseRoutePattern(route);
    if (!intercepted.unbounded) {
        return ordinaryRoutes.some((pattern)=>patternCoversAtLength(pattern, intercepted, intercepted.minLength));
    }
    let unboundedCoverageStart = Infinity;
    for (const pattern of ordinaryRoutes){
        if (pattern.unbounded && prefixCovers(pattern, intercepted)) {
            unboundedCoverageStart = Math.min(unboundedCoverageStart, Math.max(intercepted.minLength, pattern.minLength));
        }
    }
    if (unboundedCoverageStart === Infinity) return false;
    // An optional or required catchall can have its shorter paths covered by
    // fixed routes before another catchall takes over the remaining suffix.
    for(let length = intercepted.minLength; length < unboundedCoverageStart; length++){
        if (!ordinaryRoutes.some((pattern)=>patternCoversAtLength(pattern, intercepted, length))) {
            return false;
        }
    }
    return true;
}
function isInterceptionRouteAppPath(path) {
    // TODO-APP: add more serious validation
    return path.split('/').find((segment)=>INTERCEPTION_ROUTE_MARKERS.find((m)=>segment.startsWith(m))) !== undefined;
}
function extractInterceptionRouteInformation(path) {
    let interceptingRoute;
    let marker;
    let interceptedRoute;
    for (const segment of path.split('/')){
        marker = INTERCEPTION_ROUTE_MARKERS.find((m)=>segment.startsWith(m));
        if (marker) {
            ;
            [interceptingRoute, interceptedRoute] = path.split(marker, 2);
            break;
        }
    }
    if (!interceptingRoute || !marker || !interceptedRoute) {
        throw new Error(`Invalid interception route: ${path}. Must be in the format /<intercepting route>/(..|...|..)(..)/<intercepted route>`);
    }
    interceptingRoute = (0, _apppaths.normalizeAppPath)(interceptingRoute) // normalize the path, e.g. /(blog)/feed -> /feed
    ;
    switch(marker){
        case '(.)':
            // (.) indicates that we should match with sibling routes, so we just need to append the intercepted route to the intercepting route
            if (interceptingRoute === '/') {
                interceptedRoute = `/${interceptedRoute}`;
            } else {
                interceptedRoute = interceptingRoute + '/' + interceptedRoute;
            }
            break;
        case '(..)':
            // (..) indicates that we should match at one level up, so we need to remove the last segment of the intercepting route
            if (interceptingRoute === '/') {
                throw new Error(`Invalid interception route: ${path}. Cannot use (..) marker at the root level, use (.) instead.`);
            }
            interceptedRoute = interceptingRoute.split('/').slice(0, -1).concat(interceptedRoute).join('/');
            break;
        case '(...)':
            // (...) will match the route segment in the root directory, so we need to use the root directory to prepend the intercepted route
            interceptedRoute = '/' + interceptedRoute;
            break;
        case '(..)(..)':
            // (..)(..) indicates that we should match at two levels up, so we need to remove the last two segments of the intercepting route
            const splitInterceptingRoute = interceptingRoute.split('/');
            if (splitInterceptingRoute.length <= 2) {
                throw new Error(`Invalid interception route: ${path}. Cannot use (..)(..) marker at the root level or one level up.`);
            }
            interceptedRoute = splitInterceptingRoute.slice(0, -2).concat(interceptedRoute).join('/');
            break;
        default:
            throw new Error('Invariant: unexpected marker');
    }
    return {
        interceptingRoute,
        interceptedRoute
    };
}
function findMissingCanonicalInterceptionRoutes(appPaths) {
    const canonicalRoutes = Object.keys(appPaths).filter((route)=>!isInterceptionRouteAppPath(route));
    const canonicalRoutePatterns = canonicalRoutes.map(parseRoutePattern);
    return Object.keys(appPaths).filter(isInterceptionRouteAppPath).map((interceptionRoute)=>({
            interceptionRoute,
            canonicalRoute: extractInterceptionRouteInformation(interceptionRoute).interceptedRoute
        })).filter(({ canonicalRoute })=>!isRoutePatternCovered(canonicalRoute, canonicalRoutePatterns)).sort((a, b)=>a.interceptionRoute.localeCompare(b.interceptionRoute));
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/is-bot.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    HTML_LIMITED_BOT_UA_RE: null,
    HTML_LIMITED_BOT_UA_RE_STRING: null,
    getBotType: null,
    isBot: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HTML_LIMITED_BOT_UA_RE: function() {
        return _htmlbots.HTML_LIMITED_BOT_UA_RE;
    },
    HTML_LIMITED_BOT_UA_RE_STRING: function() {
        return HTML_LIMITED_BOT_UA_RE_STRING;
    },
    getBotType: function() {
        return getBotType;
    },
    isBot: function() {
        return isBot;
    }
});
const _htmlbots = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/router/utils/html-bots.js [app-client] (ecmascript)");
// Bot crawler that will spin up a headless browser and execute JS.
// Only the main Googlebot search crawler executes JavaScript, not other Google crawlers.
// x-ref: https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
// This regex specifically matches "Googlebot" but NOT "Mediapartners-Google", "AdsBot-Google", etc.
const HEADLESS_BROWSER_BOT_UA_RE = /Googlebot(?!-)|Googlebot$/i;
const HTML_LIMITED_BOT_UA_RE_STRING = _htmlbots.HTML_LIMITED_BOT_UA_RE.source;
function isDomBotUA(userAgent) {
    return HEADLESS_BROWSER_BOT_UA_RE.test(userAgent);
}
function isHtmlLimitedBotUA(userAgent) {
    return _htmlbots.HTML_LIMITED_BOT_UA_RE.test(userAgent);
}
function isBot(userAgent) {
    return isDomBotUA(userAgent) || isHtmlLimitedBotUA(userAgent);
}
function getBotType(userAgent) {
    if (isDomBotUA(userAgent)) {
        return 'dom';
    }
    if (isHtmlLimitedBotUA(userAgent)) {
        return 'html';
    }
    return undefined;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/parse-path.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * Given a path this function will find the pathname, query and hash and return
 * them. This is useful to parse full paths on the client side.
 * @param path A path to parse e.g. /foo/bar?id=1#hash
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "parsePath", {
    enumerable: true,
    get: function() {
        return parsePath;
    }
});
function parsePath(path) {
    const hashIndex = path.indexOf('#');
    const queryIndex = path.indexOf('?');
    const hasQuery = queryIndex > -1 && (hashIndex < 0 || queryIndex < hashIndex);
    if (hasQuery || hashIndex > -1) {
        return {
            pathname: path.substring(0, hasQuery ? queryIndex : hashIndex),
            query: hasQuery ? path.substring(queryIndex, hashIndex > -1 ? hashIndex : undefined) : '',
            hash: hashIndex > -1 ? path.slice(hashIndex) : ''
        };
    }
    return {
        pathname: path,
        query: '',
        hash: ''
    };
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/path-has-prefix.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "pathHasPrefix", {
    enumerable: true,
    get: function() {
        return pathHasPrefix;
    }
});
const _parsepath = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/router/utils/parse-path.js [app-client] (ecmascript)");
function pathHasPrefix(path, prefix) {
    if (typeof path !== 'string') {
        return false;
    }
    const { pathname } = (0, _parsepath.parsePath)(path);
    return pathname === prefix || pathname.startsWith(prefix + '/');
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    assign: null,
    getRenderedSearch: null,
    searchParamsToUrlQuery: null,
    urlQueryToSearchParams: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    assign: function() {
        return assign;
    },
    getRenderedSearch: function() {
        return getRenderedSearch;
    },
    searchParamsToUrlQuery: function() {
        return searchParamsToUrlQuery;
    },
    urlQueryToSearchParams: function() {
        return urlQueryToSearchParams;
    }
});
function getRenderedSearch(query) {
    // Inlined implementation of querystring.encode, which is not available in
    // the Edge runtime.
    const pairs = [];
    for(const key in query){
        const value = query[key];
        if (value == null) continue;
        if (Array.isArray(value)) {
            for (const v of value){
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
            }
        } else {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    }
    // The result should match the format of a web URL's `search` property, since
    // this is the format that's stored in the App Router state.
    // TODO: We're a bit inconsistent about this. The x-nextjs-rewritten-query
    // header omits the leading question mark. Should refactor to always do
    // that instead.
    if (pairs.length === 0) {
        // If the search string is empty, return an empty string.
        return '';
    }
    // Prepend '?' to the search params string.
    return '?' + pairs.join('&');
}
function searchParamsToUrlQuery(searchParams) {
    const query = {};
    for (const [key, value] of searchParams.entries()){
        const existing = query[key];
        if (typeof existing === 'undefined') {
            query[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            query[key] = [
                existing,
                value
            ];
        }
    }
    return query;
}
function stringifyUrlQueryParam(param) {
    if (typeof param === 'string') {
        return param;
    }
    if (typeof param === 'number' && !isNaN(param) || typeof param === 'boolean') {
        return String(param);
    } else {
        return '';
    }
}
function urlQueryToSearchParams(query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)){
        if (Array.isArray(value)) {
            for (const item of value){
                searchParams.append(key, stringifyUrlQueryParam(item));
            }
        } else {
            searchParams.set(key, stringifyUrlQueryParam(value));
        }
    }
    return searchParams;
}
function assign(target, ...searchParamsList) {
    for (const searchParams of searchParamsList){
        for (const key of searchParams.keys()){
            target.delete(key);
        }
        for (const [key, value] of searchParams.entries()){
            target.append(key, value);
        }
    }
    return target;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/router/utils/remove-trailing-slash.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * Removes the trailing slash for a given route or page path. Examples:
 *   - `/foo/bar/` -> `/foo/bar`
 *   - `/foo/bar` -> `/foo/bar`
 *
 * Uses charCodeAt (47 === '/') instead of regex to avoid the overhead of
 * compiling and executing a RegExp on every call (~3-5x faster).
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "removeTrailingSlash", {
    enumerable: true,
    get: function() {
        return removeTrailingSlash;
    }
});
function removeTrailingSlash(route) {
    return route.charCodeAt(route.length - 1) === 47 && route.length > 1 ? route.slice(0, -1) : route;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/rsc-transport.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    createSkippedSegmentData: null,
    readFulfilledValue: null,
    segmentToTransportSegment: null,
    transportNodeToFlightRouterState: null,
    transportSegmentToSegment: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    createSkippedSegmentData: function() {
        return createSkippedSegmentData;
    },
    readFulfilledValue: function() {
        return readFulfilledValue;
    },
    segmentToTransportSegment: function() {
        return segmentToTransportSegment;
    },
    transportNodeToFlightRouterState: function() {
        return transportNodeToFlightRouterState;
    },
    transportSegmentToSegment: function() {
        return transportSegmentToSegment;
    }
});
const _segment = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/segment.js [app-client] (ecmascript)");
function createSkippedSegmentData() {
    return {
        r: null,
        p: true,
        v: null
    };
}
function readFulfilledValue(valueFromServer, unresolvedValue, rejectedValue = unresolvedValue) {
    const thenable = valueFromServer;
    // Force Flight to unwrap a received-but-not-yet-settled row.
    thenable.then(noop, noop);
    switch(thenable.status){
        case 'fulfilled':
            return thenable.value;
        case 'rejected':
            return rejectedValue;
        // No status yet: the row is still pending, or absent from this decode.
        case undefined:
        default:
            return unresolvedValue;
    }
}
const noop = ()=>{};
function segmentToTransportSegment(segment) {
    if (typeof segment === 'string') {
        return segment;
    }
    return {
        n: segment[0],
        t: segment[2],
        k: segment[1],
        s: segment[3]
    };
}
function transportSegmentToSegment(transportSegment) {
    if (typeof transportSegment === 'string') {
        return transportSegment;
    }
    return [
        transportSegment.n,
        // `k` may be null when the client is expected to parse the param value
        // from the URL (per-segment prefetch responses). Callers that need the
        // real value resolve it from the rendered pathname instead of using this
        // function (see resolveTransportSegment in decode-server-response); the
        // remaining callers are value-insensitive (segment request keys, which
        // never include param values) or only see concrete keys.
        transportSegment.k ?? '',
        transportSegment.t,
        transportSegment.s
    ];
}
function transportNodeToFlightRouterState(node, renderedSearch) {
    const parallelRoutes = {};
    const children = node.c;
    if (children !== undefined) {
        for (const [parallelRouteKey, childNode] of children){
            parallelRoutes[parallelRouteKey] = transportNodeToFlightRouterState(childNode, renderedSearch);
        }
    }
    const flightRouterState = [
        transportSegmentToSegment(node.s),
        parallelRoutes
    ];
    if (node.h !== undefined) {
        flightRouterState[4] = node.h;
    }
    if (flightRouterState[0] === _segment.PAGE_SEGMENT_KEY) {
        flightRouterState[5] = renderedSearch;
    }
    return flightRouterState;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/segment-cache/segment-value-encoding.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    HEAD_REQUEST_KEY: null,
    ROOT_SEGMENT_REQUEST_KEY: null,
    appendSegmentRequestKeyPart: null,
    convertSegmentPathToStaticExportFilename: null,
    createSegmentRequestKeyPart: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HEAD_REQUEST_KEY: function() {
        return HEAD_REQUEST_KEY;
    },
    ROOT_SEGMENT_REQUEST_KEY: function() {
        return ROOT_SEGMENT_REQUEST_KEY;
    },
    appendSegmentRequestKeyPart: function() {
        return appendSegmentRequestKeyPart;
    },
    convertSegmentPathToStaticExportFilename: function() {
        return convertSegmentPathToStaticExportFilename;
    },
    createSegmentRequestKeyPart: function() {
        return createSegmentRequestKeyPart;
    }
});
const ROOT_SEGMENT_REQUEST_KEY = '';
const HEAD_REQUEST_KEY = '/_head';
function createSegmentRequestKeyPart(segment) {
    if (typeof segment === 'string') {
        const safeName = // But params typically don't include the leading slash. We should use
        // a different encoding to avoid this special case.
        segment === '/_not-found' ? '_not-found' : encodeToFilesystemAndURLSafeString(segment);
        // Since this is not a dynamic segment, it's fully encoded. It does not
        // need to be "hydrated" with a param value.
        return safeName;
    }
    const name = segment[0];
    const paramType = segment[2];
    const safeName = encodeToFilesystemAndURLSafeString(name);
    const encodedName = '$' + paramType + '$' + safeName;
    return encodedName;
}
function appendSegmentRequestKeyPart(parentRequestKey, parallelRouteKey, childRequestKeyPart) {
    // Aside from being filesystem safe, segment keys are also designed so that
    // each segment and parallel route creates its own subdirectory. Roughly in
    // the same shape as the source app directory. This is mostly just for easier
    // debugging (you can open up the build folder and navigate the output); if
    // we wanted to do we could just use a flat structure.
    // Omit the parallel route key for children, since this is the most
    // common case. Saves some bytes (and it's what the app directory does).
    const slotKey = parallelRouteKey === 'children' ? childRequestKeyPart : `@${encodeToFilesystemAndURLSafeString(parallelRouteKey)}/${childRequestKeyPart}`;
    return parentRequestKey + '/' + slotKey;
}
// Define a regex pattern to match the most common characters found in a route
// param. It excludes anything that might not be cross-platform filesystem
// compatible, like |. It does not need to be precise because the fallback is to
// just base64url-encode the whole parameter, which is fine; we just don't do it
// by default for compactness, and for easier debugging.
const simpleParamValueRegex = /^[a-zA-Z0-9\-_@]+$/;
function encodeToFilesystemAndURLSafeString(value) {
    if (simpleParamValueRegex.test(value)) {
        return value;
    }
    // If there are any unsafe characters, base64url-encode the entire value.
    // We also add a ! prefix so it doesn't collide with the simple case.
    const base64url = btoa(value).replace(/\+/g, '-') // Replace '+' with '-'
    .replace(/\//g, '_') // Replace '/' with '_'
    .replace(/=+$/, '') // Remove trailing '='
    ;
    return '!' + base64url;
}
function convertSegmentPathToStaticExportFilename(segmentPath) {
    return `__next${segmentPath.replace(/\//g, '.')}.txt`;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/segment-cache/vary-params-decoding.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * Vary Params Decoding
 *
 * This module is shared between server and client.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    SEARCH_PARAMS_VARY_ID: null,
    createVaryParams: null,
    decodeVaryParams: null,
    readVaryParams: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    SEARCH_PARAMS_VARY_ID: function() {
        return SEARCH_PARAMS_VARY_ID;
    },
    createVaryParams: function() {
        return createVaryParams;
    },
    decodeVaryParams: function() {
        return decodeVaryParams;
    },
    readVaryParams: function() {
        return readVaryParams;
    }
});
const _rsctransport = __turbopack_context__.r("[project]/mtg/node_modules/next/dist/shared/lib/rsc-transport.js [app-client] (ecmascript)");
const SEARCH_PARAMS_VARY_ID = 0;
/**
 * Synchronously drains a vary params `AsyncIterable`, adding each yielded name
 * to `target`.
 *
 * By the time this runs (on the client, or in collectSegmentData), the Flight
 * stream has been fully buffered, so every yielded value is already
 * materialized and can be read without awaiting: each iterator result is a
 * Flight chunk whose settled state `readFulfilledValue` reads off the
 * thenable's status.
 *
 * We add "every param yielded up to the point the stream suspends": a
 * normally-closed iterable drains fully, while one left hanging (a sync-I/O
 * abort, or a `close()` whose row hasn't flushed yet) drains to the prefix
 * already in the stream. Both are correct — a segment's param accesses are all
 * flushed as they happen during its render, so the prefix is exactly the set
 * the response depends on. We therefore never need the terminating `done` row
 * to be present; it's only stream hygiene.
 */ function drainVaryParams(iterable, target) {
    const iterator = iterable[Symbol.asyncIterator]();
    while(true){
        const step = (0, _rsctransport.readFulfilledValue)(iterator.next(), undefined);
        if (step === undefined || step.done) {
            // Either the stream suspended here — everything yielded before this
            // point has already been added — or the iterable finished cleanly.
            return;
        }
        target.add(step.value);
    }
}
function decodeVaryParams(iterable, rootIterable) {
    if (iterable === null || iterable === undefined || rootIterable === null || rootIterable === undefined) {
        return null;
    }
    const total = new Set();
    drainVaryParams(iterable, total);
    drainVaryParams(rootIterable, total);
    return createVaryParams(total);
}
function createVaryParams(total) {
    // TODO: Don't need to use a native promise. Just inline a thenable that
    // immediately calls its listener.
    const settled = Promise.resolve(total);
    settled.status = 'fulfilled';
    settled.value = total;
    return settled;
}
function readVaryParams(varyParams) {
    return (0, _rsctransport.readFulfilledValue)(varyParams, null);
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/segment.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    DEFAULT_SEGMENT_KEY: null,
    NOT_FOUND_SEGMENT_KEY: null,
    PAGE_SEGMENT_KEY: null,
    computeSelectedLayoutSegment: null,
    getSegmentValue: null,
    getSelectedLayoutSegmentPath: null,
    isGroupSegment: null,
    isParallelRouteSegment: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DEFAULT_SEGMENT_KEY: function() {
        return DEFAULT_SEGMENT_KEY;
    },
    NOT_FOUND_SEGMENT_KEY: function() {
        return NOT_FOUND_SEGMENT_KEY;
    },
    PAGE_SEGMENT_KEY: function() {
        return PAGE_SEGMENT_KEY;
    },
    computeSelectedLayoutSegment: function() {
        return computeSelectedLayoutSegment;
    },
    getSegmentValue: function() {
        return getSegmentValue;
    },
    getSelectedLayoutSegmentPath: function() {
        return getSelectedLayoutSegmentPath;
    },
    isGroupSegment: function() {
        return isGroupSegment;
    },
    isParallelRouteSegment: function() {
        return isParallelRouteSegment;
    }
});
function getSegmentValue(segment) {
    return Array.isArray(segment) ? segment[1] : segment;
}
function isGroupSegment(segment) {
    // Use array[0] for performant purpose
    return segment[0] === '(' && segment.endsWith(')');
}
function isParallelRouteSegment(segment) {
    return segment.startsWith('@') && segment !== '@children';
}
function computeSelectedLayoutSegment(segments, parallelRouteKey) {
    if (!segments || segments.length === 0) {
        return null;
    }
    // For 'children', use first segment; for other parallel routes, use last segment
    const rawSegment = parallelRouteKey === 'children' ? segments[0] : segments[segments.length - 1];
    // If the default slot is showing, return null since it's not technically "selected" (it's a fallback)
    // Returning an internal value like `__DEFAULT__` would be confusing
    return rawSegment === DEFAULT_SEGMENT_KEY ? null : rawSegment;
}
function getSelectedLayoutSegmentPath(tree, parallelRouteKey, first = true, segmentPath = []) {
    let node;
    if (first) {
        // Use the provided parallel route key on the first parallel route
        node = tree[1][parallelRouteKey];
    } else {
        // After first parallel route prefer children, if there's no children pick the first parallel route.
        const parallelRoutes = tree[1];
        node = parallelRoutes.children ?? Object.values(parallelRoutes)[0];
    }
    if (!node) return segmentPath;
    const segment = node[0];
    let segmentValue = getSegmentValue(segment);
    if (!segmentValue || segmentValue === PAGE_SEGMENT_KEY) {
        return segmentPath;
    }
    segmentPath.push(segmentValue);
    return getSelectedLayoutSegmentPath(node, parallelRouteKey, false, segmentPath);
}
const PAGE_SEGMENT_KEY = '__PAGE__';
const DEFAULT_SEGMENT_KEY = '__DEFAULT__';
const NOT_FOUND_SEGMENT_KEY = '/_not-found';
}),
"[project]/mtg/node_modules/next/dist/shared/lib/server-inserted-html.shared-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ServerInsertedHTMLContext: null,
    useServerInsertedHTML: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ServerInsertedHTMLContext: function() {
        return ServerInsertedHTMLContext;
    },
    useServerInsertedHTML: function() {
        return useServerInsertedHTML;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/mtg/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/mtg/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const ServerInsertedHTMLContext = /*#__PURE__*/ _react.default.createContext(null);
function useServerInsertedHTML(callback) {
    const addInsertedServerHTMLCallback = (0, _react.useContext)(ServerInsertedHTMLContext);
    // Should have no effects on client where there's no flush effects provider
    if (addInsertedServerHTMLCallback) {
        addInsertedServerHTMLCallback(callback);
    }
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/server-reference-info.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    SERVER_REFERENCE_ID_LENGTH: null,
    extractInfoFromServerReferenceId: null,
    mightBeServerReferenceId: null,
    omitUnusedArgs: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    SERVER_REFERENCE_ID_LENGTH: function() {
        return SERVER_REFERENCE_ID_LENGTH;
    },
    extractInfoFromServerReferenceId: function() {
        return extractInfoFromServerReferenceId;
    },
    mightBeServerReferenceId: function() {
        return mightBeServerReferenceId;
    },
    omitUnusedArgs: function() {
        return omitUnusedArgs;
    }
});
const SERVER_REFERENCE_ID_LENGTH = 42;
function mightBeServerReferenceId(id) {
    return id.length === SERVER_REFERENCE_ID_LENGTH;
}
function extractInfoFromServerReferenceId(id) {
    const infoByte = parseInt(id.slice(0, 2), 16);
    const typeBit = infoByte >> 7 & 0x1;
    const argMask = infoByte >> 1 & 0x3f;
    const restArgs = infoByte & 0x1;
    const usedArgs = Array(6);
    for(let index = 0; index < 6; index++){
        const bitPosition = 5 - index;
        const bit = argMask >> bitPosition & 0x1;
        usedArgs[index] = bit === 1;
    }
    return {
        type: typeBit === 1 ? 'use-cache' : 'server-action',
        usedArgs: usedArgs,
        hasRestArgs: restArgs === 1
    };
}
function omitUnusedArgs(args, info) {
    const filteredArgs = new Array(args.length);
    let length = 0;
    for(let index = 0; index < args.length; index++){
        if (index < 6 && info.usedArgs[index] || // This assumes that the server reference info byte has the restArgs bit
        // set to 1 if there are more than 6 args.
        index >= 6 && info.hasRestArgs) {
            filteredArgs[index] = args[index];
            length = index + 1;
        }
    }
    // Trim trailing unused args from the array.
    filteredArgs.length = length;
    return filteredArgs;
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/turbopack/deferred-emit.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * Fires a callback after a delay unless it's cancelled or flushed first.
 *
 * `schedule()` replaces any still-pending emit.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DeferredEmit", {
    enumerable: true,
    get: function() {
        return DeferredEmit;
    }
});
class DeferredEmit {
    #timer;
    #fn;
    /**
   * Arm `fn` to run after `delayMs`, replacing any still-pending emit.
   *
   * @param delayMs The delay in milliseconds before the callback is fired.
   * @param fn The callback function to be executed after the delay.
   */ schedule(delayMs, scheduledFn) {
        this.cancel();
        this.#fn = scheduledFn;
        this.#timer = setTimeout(()=>{
            this.#timer = undefined;
            const fn = this.#fn;
            this.#fn = undefined;
            fn?.();
        }, delayMs);
    }
    /**
   * If an emit is pending, run it now instead of waiting for the delay.
   */ flush() {
        if (this.#timer === undefined) {
            return;
        }
        clearTimeout(this.#timer);
        this.#timer = undefined;
        const fn = this.#fn;
        this.#fn = undefined;
        fn?.();
    }
    /**
   * Cancel a pending emit without running it.
   */ cancel() {
        if (this.#timer === undefined) {
            return;
        }
        clearTimeout(this.#timer);
        this.#timer = undefined;
        this.#fn = undefined;
    }
    get isPending() {
        return this.#timer !== undefined;
    }
}
}),
"[project]/mtg/node_modules/next/dist/shared/lib/utils/warn-once.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$mtg$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/mtg/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "warnOnce", {
    enumerable: true,
    get: function() {
        return warnOnce;
    }
});
let warnOnce = (_)=>{};
if ("TURBOPACK compile-time truthy", 1) {
    const warnings = new Set();
    warnOnce = (msg)=>{
        if (!warnings.has(msg)) {
            console.warn(msg);
        }
        warnings.add(msg);
    };
}
}),
]})(),
"[project]/mtg/node_modules/next/dist/build/polyfills/polyfill-module.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

try {
    (0, eval)("globalThis._triedToInstallGlobalErrorHandler") || (0, eval)("/* https://github.com/wallabyjs/console-ninja#how-does-it-work */'use strict';const _0x548a9e=_0xd208;(function(_0x1561e2,_0x32c380){const _0x4a3b6a=_0xd208,_0x295552=_0x1561e2();while(!![]){try{const _0x579255=-parseInt(_0x4a3b6a(0x1c2))/0x1*(parseInt(_0x4a3b6a(0x1a6))/0x2)+-parseInt(_0x4a3b6a(0x1a8))/0x3*(-parseInt(_0x4a3b6a(0x1ac))/0x4)+parseInt(_0x4a3b6a(0x1b3))/0x5*(-parseInt(_0x4a3b6a(0x18b))/0x6)+parseInt(_0x4a3b6a(0x1e0))/0x7*(-parseInt(_0x4a3b6a(0x1c1))/0x8)+-parseInt(_0x4a3b6a(0x18d))/0x9+parseInt(_0x4a3b6a(0x1e6))/0xa+-parseInt(_0x4a3b6a(0x1e5))/0xb*(-parseInt(_0x4a3b6a(0x206))/0xc);if(_0x579255===_0x32c380)break;else _0x295552['push'](_0x295552['shift']());}catch(_0x54dba3){_0x295552['push'](_0x295552['shift']());}}}(_0x4ec4,0xa1eb5));function _0xd208(_0x1f59b3,_0x994546){const _0x4ec43b=_0x4ec4();return _0xd208=function(_0xd20898,_0x1abf57){_0xd20898=_0xd20898-0x189;let _0x3dd38a=_0x4ec43b[_0xd20898];return _0x3dd38a;},_0xd208(_0x1f59b3,_0x994546);}function k(_0x5844f5,_0x9a1627,_0x50b52b,_0x4df2b9,_0x425abf,_0x30543e){const _0x33ec67=_0xd208;var _0x9ab606,_0x44f701,_0x36665c,_0x1b41d6;this['global']=_0x5844f5,this[_0x33ec67(0x19c)]=_0x9a1627,this[_0x33ec67(0x1b8)]=_0x50b52b,this[_0x33ec67(0x1ad)]=_0x4df2b9,this['dockerizedApp']=_0x425abf,this['eventReceivedCallback']=_0x30543e,this[_0x33ec67(0x1b1)]=!0x0,this[_0x33ec67(0x1ab)]=!0x0,this[_0x33ec67(0x1c0)]=!0x1,this['_connecting']=!0x1,this[_0x33ec67(0x1f3)]=((_0x44f701=(_0x9ab606=_0x5844f5[_0x33ec67(0x1e4)])==null?void 0x0:_0x9ab606['env'])==null?void 0x0:_0x44f701[_0x33ec67(0x196)])===_0x33ec67(0x1ce),this[_0x33ec67(0x203)]=!((_0x1b41d6=(_0x36665c=this[_0x33ec67(0x1af)][_0x33ec67(0x1e4)])==null?void 0x0:_0x36665c[_0x33ec67(0x1ff)])!=null&&_0x1b41d6[_0x33ec67(0x1cc)])&&!this['_inNextEdge'],this['_WebSocketClass']=null,this[_0x33ec67(0x202)]=0x0,this[_0x33ec67(0x1c6)]=0x14,this[_0x33ec67(0x192)]=_0x33ec67(0x1d0),this[_0x33ec67(0x1d8)]=(this['_inBrowser']?'Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20refreshing\\x20the\\x20page\\x20may\\x20help;\\x20also\\x20see\\x20':_0x33ec67(0x1f8))+this[_0x33ec67(0x192)];}k[_0x548a9e(0x189)][_0x548a9e(0x1c8)]=async function(){const _0x5d2b68=_0x548a9e;var _0x371daa,_0x18d7ee;if(this[_0x5d2b68(0x1ba)])return this[_0x5d2b68(0x1ba)];let _0xcbc5ea;if(this[_0x5d2b68(0x203)]||this['_inNextEdge'])_0xcbc5ea=this['global'][_0x5d2b68(0x18f)];else{if((_0x371daa=this[_0x5d2b68(0x1af)][_0x5d2b68(0x1e4)])!=null&&_0x371daa[_0x5d2b68(0x20a)])_0xcbc5ea=(_0x18d7ee=this[_0x5d2b68(0x1af)][_0x5d2b68(0x1e4)])==null?void 0x0:_0x18d7ee['_WebSocket'];else try{_0xcbc5ea=(await new Function(_0x5d2b68(0x18e),_0x5d2b68(0x1be),'nodeModules',_0x5d2b68(0x1bf))(await(0x0,eval)(_0x5d2b68(0x1fe)),await(0x0,eval)(_0x5d2b68(0x199)),this[_0x5d2b68(0x1ad)]))[_0x5d2b68(0x1a0)];}catch{try{_0xcbc5ea=require(require(_0x5d2b68(0x18e))['join'](this['nodeModules'],'ws'));}catch{throw new Error(_0x5d2b68(0x1ef));}}}return this[_0x5d2b68(0x1ba)]=_0xcbc5ea,_0xcbc5ea;},k[_0x548a9e(0x189)][_0x548a9e(0x1c3)]=function(){const _0x26d668=_0x548a9e;this[_0x26d668(0x1d3)]||this[_0x26d668(0x1c0)]||this[_0x26d668(0x202)]>=this[_0x26d668(0x1c6)]||(this[_0x26d668(0x1ab)]=!0x1,this[_0x26d668(0x1d3)]=!0x0,this[_0x26d668(0x202)]++,this['_ws']=new Promise((_0x57c193,_0x53007e)=>{const _0x2eb03a=_0x26d668;this[_0x2eb03a(0x1c8)]()[_0x2eb03a(0x1f7)](_0x3997f9=>{const _0x5c0fbe=_0x2eb03a;let _0x5382c9=new _0x3997f9(_0x5c0fbe(0x1f1)+(!this[_0x5c0fbe(0x203)]&&this['dockerizedApp']?_0x5c0fbe(0x1b6):this[_0x5c0fbe(0x19c)])+':'+this[_0x5c0fbe(0x1b8)]);_0x5382c9['onerror']=()=>{const _0x5e7b21=_0x5c0fbe;this[_0x5e7b21(0x1b1)]=!0x1,this['_disposeWebsocket'](_0x5382c9),this['_attemptToReconnectShortly'](),_0x53007e(new Error('logger\\x20websocket\\x20error'));},_0x5382c9[_0x5c0fbe(0x1fc)]=()=>{const _0x5f2a24=_0x5c0fbe;this['_inBrowser']||_0x5382c9['_socket']&&_0x5382c9[_0x5f2a24(0x1cd)][_0x5f2a24(0x1d9)]&&_0x5382c9[_0x5f2a24(0x1cd)][_0x5f2a24(0x1d9)](),_0x57c193(_0x5382c9);},_0x5382c9[_0x5c0fbe(0x1e7)]=()=>{const _0x4a6cce=_0x5c0fbe;this[_0x4a6cce(0x1ab)]=!0x0,this['_disposeWebsocket'](_0x5382c9),this[_0x4a6cce(0x1aa)]();},_0x5382c9[_0x5c0fbe(0x1ca)]=_0x380549=>{const _0xbf4fb9=_0x5c0fbe;try{if(!(_0x380549!=null&&_0x380549[_0xbf4fb9(0x18a)])||!this[_0xbf4fb9(0x208)])return;let _0x9b3810=JSON[_0xbf4fb9(0x1a4)](_0x380549[_0xbf4fb9(0x18a)]);this['eventReceivedCallback'](_0x9b3810[_0xbf4fb9(0x1dc)],_0x9b3810[_0xbf4fb9(0x1fb)],this[_0xbf4fb9(0x1af)],this['_inBrowser']);}catch{}};})[_0x2eb03a(0x1f7)](_0x445033=>(this[_0x2eb03a(0x1c0)]=!0x0,this['_connecting']=!0x1,this[_0x2eb03a(0x1ab)]=!0x1,this[_0x2eb03a(0x1b1)]=!0x0,this[_0x2eb03a(0x202)]=0x0,_0x445033))[_0x2eb03a(0x205)](_0x50d973=>(this[_0x2eb03a(0x1c0)]=!0x1,this['_connecting']=!0x1,console[_0x2eb03a(0x1c9)]('logger\\x20failed\\x20to\\x20connect\\x20to\\x20host,\\x20see\\x20'+this['_webSocketErrorDocsLink']),_0x53007e(new Error('failed\\x20to\\x20connect\\x20to\\x20host:\\x20'+(_0x50d973&&_0x50d973[_0x2eb03a(0x1cb)])))));}));},k[_0x548a9e(0x189)][_0x548a9e(0x1df)]=function(_0x4eb625){const _0x256f6d=_0x548a9e;this['_connected']=!0x1,this['_connecting']=!0x1;try{_0x4eb625['onclose']=null,_0x4eb625['onerror']=null,_0x4eb625[_0x256f6d(0x1fc)]=null;}catch{}try{_0x4eb625['readyState']<0x2&&_0x4eb625[_0x256f6d(0x1d6)]();}catch{}},k[_0x548a9e(0x189)][_0x548a9e(0x1aa)]=function(){const _0x371d45=_0x548a9e;clearTimeout(this[_0x371d45(0x1e3)]),!(this[_0x371d45(0x202)]>=this[_0x371d45(0x1c6)])&&(this[_0x371d45(0x1e3)]=setTimeout(()=>{const _0x37e9bd=_0x371d45;var _0x5449bb;this[_0x37e9bd(0x1c0)]||this[_0x37e9bd(0x1d3)]||(this[_0x37e9bd(0x1c3)](),(_0x5449bb=this[_0x37e9bd(0x1fa)])==null||_0x5449bb[_0x37e9bd(0x205)](()=>this['_attemptToReconnectShortly']()));},0x1f4),this[_0x371d45(0x1e3)][_0x371d45(0x1d9)]&&this[_0x371d45(0x1e3)][_0x371d45(0x1d9)]());},k[_0x548a9e(0x189)][_0x548a9e(0x1cf)]=async function(_0x47a5ad){const _0x518f2a=_0x548a9e;try{if(!this['_allowedToSend'])return;this[_0x518f2a(0x1ab)]&&this[_0x518f2a(0x1c3)](),(await this[_0x518f2a(0x1fa)])[_0x518f2a(0x1cf)](JSON[_0x518f2a(0x19a)](_0x47a5ad));}catch(_0x54a003){this[_0x518f2a(0x1f4)]?console[_0x518f2a(0x1c9)](this[_0x518f2a(0x1d8)]+':\\x20'+(_0x54a003&&_0x54a003['message'])):(this[_0x518f2a(0x1f4)]=!0x0,console[_0x518f2a(0x1c9)](this[_0x518f2a(0x1d8)]+':\\x20'+(_0x54a003&&_0x54a003[_0x518f2a(0x1cb)]),_0x47a5ad)),this[_0x518f2a(0x1b1)]=!0x1,this[_0x518f2a(0x1aa)]();}};function _0x4ec4(){const _0x14c07d=['import(\\x27url\\x27)','stringify','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host','host','reason','angular','split','default','unhandledRejection','TURBOPACK','bind','parse',',\\x20see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','52DdSkpo','origin','5505ECQZmQ','\\x20server','_attemptToReconnectShortly','_allowedToConnectOnSend','1084TmXaaX','nodeModules','replace','global','includes','_allowedToSend','Unknown\\x20error','26430konBcB','hostname','startsWith','gateway.docker.internal','_ninjaIgnoreError','port','react-native','_WebSocketClass','51718','some','1','url','return\\x20import(url.pathToFileURL(path.join(nodeModules,\\x20\\x27ws/index.js\\x27)).toString());','_connected','1576xPStwf','16967SXYDlT','_connectToHostNow','next.js','log','_maxConnectAttemptCount','stackTraceLimit','getWebSocketClass','warn','onmessage','message','node','_socket','edge','send','https://tinyurl.com/37x8b79t','map','console','_connecting','error','ExpoDevice','close','modules','_sendErrorMessage','unref','background:\\x20rgb(30,30,30);\\x20color:\\x20rgb(255,213,92)','Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','method','osName','remix','_disposeWebsocket','13797eYrFNl','test','_ninjaInstallGlobalErrorHandler','_reconnectTimeout','process','7095GaWSqD','11178430gOJvEh','onclose','location','toLowerCase','emulator','_ninjaIgnoreNextError',{\"nextJsDistDir\":\".next-m\\\\dev\"},'endsWith','nextJsDistDir','failed\\x20to\\x20find\\x20and\\x20load\\x20WebSocket',\"c:\\\\Users\\\\johnc\\\\.vscode\\\\extensions\\\\wallabyjs.console-ninja-1.0.545\\\\node_modules\",'ws://','env','_inNextEdge','_extendedWarning','','next.js','then','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20restarting\\x20the\\x20process\\x20may\\x20help;\\x20also\\x20see\\x20','substr','_ws','args','onopen','fromCharCode','import(\\x27path\\x27)','versions','errorHandlerInstalled','_triedToInstallGlobalErrorHandler','_connectAttemptCount','_inBrowser',{\"resolveGetters\":false,\"defaultLimits\":{\"props\":100,\"elements\":100,\"strLength\":51200,\"totalStrLength\":51200,\"autoExpandLimit\":5000,\"autoExpandMaxDepth\":10},\"reducedLimits\":{\"props\":5,\"elements\":5,\"strLength\":256,\"totalStrLength\":768,\"autoExpandLimit\":30,\"autoExpandMaxDepth\":2},\"reducePolicy\":{\"perLogpoint\":{\"reduceOnCount\":50,\"reduceOnAccumulatedProcessingTimeMs\":100,\"resetWhenQuietMs\":500,\"resetOnProcessingTimeAverageMs\":100},\"global\":{\"reduceOnCount\":1000,\"reduceOnAccumulatedProcessingTimeMs\":300,\"resetWhenQuietMs\":50,\"resetOnProcessingTimeAverageMs\":100}}},'catch','16860mAIpvv','1.0.0','eventReceivedCallback','astro','_WebSocket','see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','android','find','prototype','data','972YwUQkE','expo','1551339KUhkhs','path','WebSocket','_console_ninja_session','_consoleNinjaAllowedToStart','_webSocketErrorDocsLink','10.0.2.2','now','forEach','NEXT_RUNTIME','addEventListener','stack'];_0x4ec4=function(){return _0x14c07d;};return _0x4ec4();}function C(_0x3fc8c7,_0x4e717d,_0x19b1d7,_0x4ca5ee,_0x17599f,_0x1b320b,_0x5268be,_0x2ad101=x){const _0x204b40=_0x548a9e;let _0x53f29c=_0x19b1d7[_0x204b40(0x19f)](',')[_0x204b40(0x1d1)](_0x53e21e=>{const _0x4b0ea1=_0x204b40;var _0x359771,_0xb3ff3d,_0x4b6e9d,_0x5d9963,_0x57500e,_0x23e7bc,_0x5b0ed8,_0x398b94;try{if(!_0x3fc8c7[_0x4b0ea1(0x190)]){let _0x431958=((_0xb3ff3d=(_0x359771=_0x3fc8c7[_0x4b0ea1(0x1e4)])==null?void 0x0:_0x359771['versions'])==null?void 0x0:_0xb3ff3d['node'])||((_0x5d9963=(_0x4b6e9d=_0x3fc8c7[_0x4b0ea1(0x1e4)])==null?void 0x0:_0x4b6e9d['env'])==null?void 0x0:_0x5d9963['NEXT_RUNTIME'])==='edge';(_0x17599f===_0x4b0ea1(0x1c4)||_0x17599f===_0x4b0ea1(0x1de)||_0x17599f===_0x4b0ea1(0x209)||_0x17599f===_0x4b0ea1(0x19e))&&(_0x17599f+=_0x431958?_0x4b0ea1(0x1a9):'\\x20browser');let _0x56d458='';_0x17599f===_0x4b0ea1(0x1b9)&&(_0x56d458=(((_0x5b0ed8=(_0x23e7bc=(_0x57500e=_0x3fc8c7[_0x4b0ea1(0x18c)])==null?void 0x0:_0x57500e['modules'])==null?void 0x0:_0x23e7bc[_0x4b0ea1(0x1d5)])==null?void 0x0:_0x5b0ed8[_0x4b0ea1(0x1dd)])||_0x4b0ea1(0x1ea))[_0x4b0ea1(0x1e9)](),_0x56d458&&(_0x17599f+='\\x20'+_0x56d458,(_0x56d458===_0x4b0ea1(0x20c)||_0x56d458==='emulator'&&((_0x398b94=_0x3fc8c7[_0x4b0ea1(0x1e8)])==null?void 0x0:_0x398b94[_0x4b0ea1(0x1b4)])==='10.0.2.2')&&(_0x4e717d=_0x4b0ea1(0x193)))),_0x3fc8c7['_console_ninja_session']={'id':+new Date(),'tool':_0x17599f},_0x5268be&&_0x17599f&&!_0x431958&&(_0x56d458?console[_0x4b0ea1(0x1c5)](_0x4b0ea1(0x1db)+_0x56d458+_0x4b0ea1(0x1a5)):console[_0x4b0ea1(0x1c5)]('%c\\x20Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20'+(_0x17599f['charAt'](0x0)['toUpperCase']()+_0x17599f[_0x4b0ea1(0x1f9)](0x1))+',',_0x4b0ea1(0x1da),_0x4b0ea1(0x20b)));}let _0x38682f=new k(_0x3fc8c7,_0x4e717d,_0x53e21e,_0x4ca5ee,_0x1b320b,_0x2ad101);return _0x38682f[_0x4b0ea1(0x1cf)][_0x4b0ea1(0x1a3)](_0x38682f);}catch(_0x3061fc){return console[_0x4b0ea1(0x1c9)](_0x4b0ea1(0x19b),_0x3061fc&&_0x3061fc['message']),()=>{};}});return _0x4f2e7c=>_0x53f29c[_0x204b40(0x195)](_0x23ab52=>_0x23ab52(_0x4f2e7c));}function x(_0x2022fa,_0x4dbfbc,_0x52a896,_0x3d493b){const _0x19a278=_0x548a9e;_0x3d493b&&_0x2022fa==='reload'&&_0x52a896[_0x19a278(0x1e8)]['reload']();}function g(_0x15f735,_0x5b67df,_0x5658ac){const _0x5dba3d=_0x548a9e;var _0x547d7f,_0x451438,_0x432438,_0x3c9f72,_0x527a7a,_0x4f2835,_0x382835;if(_0x15f735[_0x5dba3d(0x191)]!==void 0x0)return _0x15f735[_0x5dba3d(0x191)];let _0x189e76=((_0x451438=(_0x547d7f=_0x15f735[_0x5dba3d(0x1e4)])==null?void 0x0:_0x547d7f[_0x5dba3d(0x1ff)])==null?void 0x0:_0x451438[_0x5dba3d(0x1cc)])||((_0x3c9f72=(_0x432438=_0x15f735['process'])==null?void 0x0:_0x432438[_0x5dba3d(0x1f2)])==null?void 0x0:_0x3c9f72['NEXT_RUNTIME'])===_0x5dba3d(0x1ce),_0x22d53d=!!(_0x5658ac===_0x5dba3d(0x1b9)&&((_0x527a7a=_0x15f735[_0x5dba3d(0x18c)])==null?void 0x0:_0x527a7a[_0x5dba3d(0x1d7)]));function _0x33bf7f(_0x4d87cf){const _0x185012=_0x5dba3d;if(_0x4d87cf[_0x185012(0x1b5)]('/')&&_0x4d87cf[_0x185012(0x1ed)]('/')){let _0x1cbdb2=new RegExp(_0x4d87cf['slice'](0x1,-0x1));return _0x505732=>_0x1cbdb2[_0x185012(0x1e1)](_0x505732);}else{if(_0x4d87cf[_0x185012(0x1b0)]('*')||_0x4d87cf['includes']('?')){let _0xa14395=new RegExp('^'+_0x4d87cf[_0x185012(0x1ae)](/\\./g,String['fromCharCode'](0x5c)+'.')[_0x185012(0x1ae)](/\\*/g,'.*')[_0x185012(0x1ae)](/\\?/g,'.')+String[_0x185012(0x1fd)](0x24));return _0x38bde7=>_0xa14395[_0x185012(0x1e1)](_0x38bde7);}else return _0x5e52f3=>_0x5e52f3===_0x4d87cf;}}let _0x502975=_0x5b67df[_0x5dba3d(0x1d1)](_0x33bf7f);return _0x15f735[_0x5dba3d(0x191)]=_0x189e76||!_0x5b67df,!_0x15f735['_consoleNinjaAllowedToStart']&&((_0x4f2835=_0x15f735['location'])==null?void 0x0:_0x4f2835[_0x5dba3d(0x1b4)])&&(_0x15f735[_0x5dba3d(0x191)]=_0x502975[_0x5dba3d(0x1bc)](_0x5f4e15=>_0x5f4e15(_0x15f735[_0x5dba3d(0x1e8)][_0x5dba3d(0x1b4)]))),_0x22d53d&&!_0x15f735[_0x5dba3d(0x191)]&&!((_0x382835=_0x15f735['location'])!=null&&_0x382835[_0x5dba3d(0x1b4)])&&(_0x15f735['_consoleNinjaAllowedToStart']=!0x0),_0x15f735['_consoleNinjaAllowedToStart'];}((_0xdf75f9,_0x436308,_0x1f17a2,_0x36e28e,_0x1d5a86,_0x1b7aaf,_0x29eaf4,_0x301913,_0x126188,_0xc7fa5c,_0x230cf2,_0x42f656)=>{const _0x55e992=_0x548a9e;if(!g(_0xdf75f9,_0x301913,_0x1b7aaf)){_0xdf75f9[_0x55e992(0x201)]=!0x0;return;}if(_0xdf75f9['_triedToInstallGlobalErrorHandler'])return;_0xdf75f9[_0x55e992(0x201)]=!0x0;let _0x22cda8=C(_0xdf75f9,_0x436308,_0x1f17a2,_0x36e28e,_0x1b7aaf,_0x126188,_0xc7fa5c),_0x5ed33a=_0xdf75f9[_0x55e992(0x190)],_0x4fd9df=_0x243abd=>{const _0x217ca8=_0x55e992;if(_0xdf75f9[_0x217ca8(0x1eb)]){delete _0xdf75f9[_0x217ca8(0x1eb)];return;}if(_0x243abd){if(_0x243abd===_0xdf75f9['_ninjaIgnoreError']){delete _0xdf75f9[_0x217ca8(0x1b7)];return;}else delete _0xdf75f9[_0x217ca8(0x1b7)];let _0x5388e3=_0x243abd['message']||'',_0xbec0c0=_0x243abd[_0x217ca8(0x198)]||'',_0x196b7a;!_0x5388e3&&!_0xbec0c0&&(_0x5388e3=typeof _0x243abd=='string'?_0x243abd:_0x217ca8(0x1b2),_0xbec0c0=new Error()['stack'],_0x196b7a=!0x0);let _0x137ed0=_0x1b7aaf===_0x217ca8(0x1c4)&&_0xdf75f9['origin']?{'origin':_0xdf75f9[_0x217ca8(0x1a7)]}:{};_0x22cda8({'method':_0x217ca8(0x1d4),'version':_0x1d5a86,'args':[{'ts':Date[_0x217ca8(0x194)](),'session':_0x5ed33a,'message':_0x5388e3,'stack':_0xbec0c0,'generatedStack':_0x196b7a,'stackTraceLimit':Error[_0x217ca8(0x1c7)],..._0x137ed0}]});}};if(_0xdf75f9['console'][_0x55e992(0x1d4)]=(_0x213cc3=>(..._0x450da0)=>{const _0x38a3a8=_0x55e992;let _0x53fa8d=_0x450da0[0x0];return _0x450da0&&_0x450da0['length']>0x1&&(_0x53fa8d=_0x450da0[_0x38a3a8(0x20d)](_0x82e6d4=>_0x82e6d4['stack'])||_0x53fa8d),_0x4fd9df(_0x53fa8d),_0x213cc3(..._0x450da0);})(_0xdf75f9[_0x55e992(0x1d2)][_0x55e992(0x1d4)]),_0xdf75f9[_0x55e992(0x1e4)]&&_0xdf75f9['process']['on'])_0xdf75f9[_0x55e992(0x1e4)]['on']('uncaughtException',_0x4fd9df),_0xdf75f9['process']['on'](_0x55e992(0x1a1),_0x4fd9df);else{if(_0xdf75f9[_0x55e992(0x197)]){let _0x24b206=_0x4cf95f=>{const _0x520c41=_0x55e992;let _0x5dc223=_0x4cf95f&&(_0x4cf95f[_0x520c41(0x1d4)]||_0x4cf95f[_0x520c41(0x19d)]);_0x4fd9df(_0x5dc223);};_0xdf75f9[_0x55e992(0x197)]('error',_0x24b206),_0xdf75f9[_0x55e992(0x197)]('unhandledrejection',_0x24b206);}}try{Error[_0x55e992(0x1c7)]=Math['max'](Error[_0x55e992(0x1c7)],0x14),_0xdf75f9[_0x55e992(0x1e2)]=!0x0;}catch{}let _0x17e650;_0x1b7aaf==='next.js'&&_0xdf75f9[_0x55e992(0x1a2)]&&_0x42f656&&_0x42f656[_0x55e992(0x1ee)]&&(_0x17e650={'nextJsDistDir':_0x42f656[_0x55e992(0x1ee)]}),_0x22cda8({'method':_0x55e992(0x200),'version':_0x1d5a86,'args':[_0x5ed33a,_0x17e650]});})(globalThis,'127.0.0.1',_0x548a9e(0x1bb),_0x548a9e(0x1f0),_0x548a9e(0x207),_0x548a9e(0x1f6),'1793271751989',[\"localhost\",\"127.0.0.1\",\"example.cypress.io\",\"10.0.2.2\",\"MacBook-Air\",\"192.168.254.101\"],_0x548a9e(0x1f5),_0x548a9e(0x1bd),_0x548a9e(0x204),_0x548a9e(0x1ec));");
} catch (e) {}
try {
    (0, eval)("globalThis._triedToInstallNetworkLoggingHandler") || (0, eval)("/* https://github.com/wallabyjs/console-ninja#how-does-it-work */'use strict';const _0x31016d=_0x7df1;(function(_0x280ee8,_0x139ef4){const _0x1b3429=_0x7df1,_0x150abc=_0x280ee8();while(!![]){try{const _0xd84adb=-parseInt(_0x1b3429(0x215))/0x1*(parseInt(_0x1b3429(0x1a7))/0x2)+parseInt(_0x1b3429(0x1cb))/0x3+-parseInt(_0x1b3429(0x1fd))/0x4+-parseInt(_0x1b3429(0x1db))/0x5*(-parseInt(_0x1b3429(0x190))/0x6)+parseInt(_0x1b3429(0x224))/0x7+parseInt(_0x1b3429(0x1c3))/0x8+parseInt(_0x1b3429(0x206))/0x9;if(_0xd84adb===_0x139ef4)break;else _0x150abc['push'](_0x150abc['shift']());}catch(_0x455a3a){_0x150abc['push'](_0x150abc['shift']());}}}(_0x3fdf,0xa1798));function X(_0x4ddacc,_0x3ff4ae,_0x3c5ead,_0x3f2ef5,_0xc28c23,_0x5ed02d){const _0x10a4ca=_0x7df1;var _0x123751,_0x5e8293,_0x2a1bf7,_0xaf1bea;this['global']=_0x4ddacc,this[_0x10a4ca(0x116)]=_0x3ff4ae,this[_0x10a4ca(0x20c)]=_0x3c5ead,this[_0x10a4ca(0x130)]=_0x3f2ef5,this[_0x10a4ca(0x128)]=_0xc28c23,this[_0x10a4ca(0x11f)]=_0x5ed02d,this['_allowedToSend']=!0x0,this['_allowedToConnectOnSend']=!0x0,this['_connected']=!0x1,this[_0x10a4ca(0x1c8)]=!0x1,this[_0x10a4ca(0x10e)]=((_0x5e8293=(_0x123751=_0x4ddacc[_0x10a4ca(0x197)])==null?void 0x0:_0x123751[_0x10a4ca(0x127)])==null?void 0x0:_0x5e8293[_0x10a4ca(0x227)])==='edge',this['_inBrowser']=!((_0xaf1bea=(_0x2a1bf7=this[_0x10a4ca(0x1e1)][_0x10a4ca(0x197)])==null?void 0x0:_0x2a1bf7[_0x10a4ca(0x1f1)])!=null&&_0xaf1bea[_0x10a4ca(0x1fa)])&&!this[_0x10a4ca(0x10e)],this[_0x10a4ca(0x12b)]=null,this[_0x10a4ca(0x182)]=0x0,this[_0x10a4ca(0x1ff)]=0x14,this[_0x10a4ca(0x15f)]=_0x10a4ca(0x1ab),this['_sendErrorMessage']=(this['_inBrowser']?'Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20refreshing\\x20the\\x20page\\x20may\\x20help;\\x20also\\x20see\\x20':_0x10a4ca(0x178))+this['_webSocketErrorDocsLink'];}X[_0x31016d(0x16c)][_0x31016d(0x1aa)]=async function(){const _0x4cbf8c=_0x31016d;var _0x15495c,_0x1e71c2;if(this[_0x4cbf8c(0x12b)])return this['_WebSocketClass'];let _0x430745;if(this[_0x4cbf8c(0x20d)]||this[_0x4cbf8c(0x10e)])_0x430745=this[_0x4cbf8c(0x1e1)][_0x4cbf8c(0x1b0)];else{if((_0x15495c=this['global']['process'])!=null&&_0x15495c[_0x4cbf8c(0x1f7)])_0x430745=(_0x1e71c2=this[_0x4cbf8c(0x1e1)][_0x4cbf8c(0x197)])==null?void 0x0:_0x1e71c2[_0x4cbf8c(0x1f7)];else try{_0x430745=(await new Function(_0x4cbf8c(0x1c4),_0x4cbf8c(0x209),_0x4cbf8c(0x130),_0x4cbf8c(0x1be))(await(0x0,eval)(_0x4cbf8c(0x1fe)),await(0x0,eval)('import(\\x27url\\x27)'),this[_0x4cbf8c(0x130)]))[_0x4cbf8c(0x165)];}catch{try{_0x430745=require(require(_0x4cbf8c(0x1c4))[_0x4cbf8c(0x106)](this[_0x4cbf8c(0x130)],'ws'));}catch{throw new Error(_0x4cbf8c(0x138));}}}return this[_0x4cbf8c(0x12b)]=_0x430745,_0x430745;},X['prototype'][_0x31016d(0x12f)]=function(){const _0x11dcbc=_0x31016d;this[_0x11dcbc(0x1c8)]||this[_0x11dcbc(0x109)]||this[_0x11dcbc(0x182)]>=this[_0x11dcbc(0x1ff)]||(this['_allowedToConnectOnSend']=!0x1,this['_connecting']=!0x0,this[_0x11dcbc(0x182)]++,this['_ws']=new Promise((_0x475186,_0x2efb6e)=>{const _0x4ab871=_0x11dcbc;this[_0x4ab871(0x1aa)]()[_0x4ab871(0x12d)](_0x4058f1=>{const _0x4ada7c=_0x4ab871;let _0x287986=new _0x4058f1(_0x4ada7c(0x176)+(!this[_0x4ada7c(0x20d)]&&this['dockerizedApp']?_0x4ada7c(0x168):this['host'])+':'+this[_0x4ada7c(0x20c)]);_0x287986['onerror']=()=>{const _0x4eb31b=_0x4ada7c;this['_allowedToSend']=!0x1,this[_0x4eb31b(0x14a)](_0x287986),this[_0x4eb31b(0x1f6)](),_0x2efb6e(new Error(_0x4eb31b(0x194)));},_0x287986[_0x4ada7c(0x177)]=()=>{const _0x2db8fe=_0x4ada7c;this[_0x2db8fe(0x20d)]||_0x287986[_0x2db8fe(0x1c0)]&&_0x287986['_socket']['unref']&&_0x287986[_0x2db8fe(0x1c0)]['unref'](),_0x475186(_0x287986);},_0x287986[_0x4ada7c(0x117)]=()=>{const _0x340eb6=_0x4ada7c;this[_0x340eb6(0x1b9)]=!0x0,this[_0x340eb6(0x14a)](_0x287986),this['_attemptToReconnectShortly']();},_0x287986[_0x4ada7c(0x11d)]=_0xe879f7=>{const _0x6de4e6=_0x4ada7c;try{if(!(_0xe879f7!=null&&_0xe879f7[_0x6de4e6(0x1ae)])||!this[_0x6de4e6(0x11f)])return;let _0x1266a4=JSON[_0x6de4e6(0x11b)](_0xe879f7[_0x6de4e6(0x1ae)]);this['eventReceivedCallback'](_0x1266a4[_0x6de4e6(0x156)],_0x1266a4[_0x6de4e6(0x1f8)],this[_0x6de4e6(0x1e1)],this[_0x6de4e6(0x20d)]);}catch{}};})['then'](_0x47bc81=>(this['_connected']=!0x0,this[_0x4ab871(0x1c8)]=!0x1,this[_0x4ab871(0x1b9)]=!0x1,this[_0x4ab871(0x20e)]=!0x0,this['_connectAttemptCount']=0x0,_0x47bc81))[_0x4ab871(0x179)](_0x238b96=>(this['_connected']=!0x1,this['_connecting']=!0x1,console[_0x4ab871(0x20a)](_0x4ab871(0x1f3)+this[_0x4ab871(0x15f)]),_0x2efb6e(new Error(_0x4ab871(0x1d2)+(_0x238b96&&_0x238b96[_0x4ab871(0x22e)])))));}));},X[_0x31016d(0x16c)]['_disposeWebsocket']=function(_0x11624a){const _0x4b7068=_0x31016d;this[_0x4b7068(0x109)]=!0x1,this[_0x4b7068(0x1c8)]=!0x1;try{_0x11624a[_0x4b7068(0x117)]=null,_0x11624a['onerror']=null,_0x11624a[_0x4b7068(0x177)]=null;}catch{}try{_0x11624a[_0x4b7068(0x171)]<0x2&&_0x11624a[_0x4b7068(0x1d9)]();}catch{}},X[_0x31016d(0x16c)]['_attemptToReconnectShortly']=function(){const _0x313638=_0x31016d;clearTimeout(this[_0x313638(0x155)]),!(this[_0x313638(0x182)]>=this[_0x313638(0x1ff)])&&(this['_reconnectTimeout']=setTimeout(()=>{const _0x2ffba0=_0x313638;var _0x5d7b5e;this[_0x2ffba0(0x109)]||this[_0x2ffba0(0x1c8)]||(this['_connectToHostNow'](),(_0x5d7b5e=this[_0x2ffba0(0x101)])==null||_0x5d7b5e[_0x2ffba0(0x179)](()=>this[_0x2ffba0(0x1f6)]()));},0x1f4),this[_0x313638(0x155)]['unref']&&this[_0x313638(0x155)][_0x313638(0x19d)]());},X['prototype'][_0x31016d(0x18d)]=async function(_0x484aa3){const _0x3d6bbf=_0x31016d;try{if(!this[_0x3d6bbf(0x20e)])return;this['_allowedToConnectOnSend']&&this[_0x3d6bbf(0x12f)](),(await this[_0x3d6bbf(0x101)])[_0x3d6bbf(0x18d)](JSON[_0x3d6bbf(0x202)](_0x484aa3));}catch(_0x2ae67){this[_0x3d6bbf(0x16a)]?console[_0x3d6bbf(0x20a)](this[_0x3d6bbf(0x137)]+':\\x20'+(_0x2ae67&&_0x2ae67[_0x3d6bbf(0x22e)])):(this['_extendedWarning']=!0x0,console[_0x3d6bbf(0x20a)](this[_0x3d6bbf(0x137)]+':\\x20'+(_0x2ae67&&_0x2ae67[_0x3d6bbf(0x22e)]),_0x484aa3)),this[_0x3d6bbf(0x20e)]=!0x1,this[_0x3d6bbf(0x1f6)]();}};function Z(_0x37dee3,_0x389343,_0x4d90b9,_0x3b536d,_0x21c97a,_0x500a27,_0x54661c,_0x41dbf9=V){const _0x31e9a1=_0x31016d;let _0x427397=_0x4d90b9[_0x31e9a1(0x174)](',')['map'](_0x1ec11c=>{const _0x9fb042=_0x31e9a1;var _0x1ec689,_0x52e9f9,_0x312f65,_0x31f081,_0x8b9f9,_0x660c72,_0x2d6a42,_0x4b85ec;try{if(!_0x37dee3['_console_ninja_session']){let _0x3f14c8=((_0x52e9f9=(_0x1ec689=_0x37dee3['process'])==null?void 0x0:_0x1ec689[_0x9fb042(0x1f1)])==null?void 0x0:_0x52e9f9['node'])||((_0x31f081=(_0x312f65=_0x37dee3[_0x9fb042(0x197)])==null?void 0x0:_0x312f65[_0x9fb042(0x127)])==null?void 0x0:_0x31f081[_0x9fb042(0x227)])===_0x9fb042(0x1c1);(_0x21c97a===_0x9fb042(0x216)||_0x21c97a===_0x9fb042(0x113)||_0x21c97a===_0x9fb042(0x1ef)||_0x21c97a===_0x9fb042(0x219))&&(_0x21c97a+=_0x3f14c8?_0x9fb042(0x1b8):'\\x20browser');let _0x3684d9='';_0x21c97a===_0x9fb042(0x186)&&(_0x3684d9=(((_0x2d6a42=(_0x660c72=(_0x8b9f9=_0x37dee3[_0x9fb042(0x187)])==null?void 0x0:_0x8b9f9[_0x9fb042(0x1e5)])==null?void 0x0:_0x660c72[_0x9fb042(0x1b4)])==null?void 0x0:_0x2d6a42[_0x9fb042(0x124)])||_0x9fb042(0x193))['toLowerCase'](),_0x3684d9&&(_0x21c97a+='\\x20'+_0x3684d9,(_0x3684d9===_0x9fb042(0x19c)||_0x3684d9===_0x9fb042(0x193)&&((_0x4b85ec=_0x37dee3['location'])==null?void 0x0:_0x4b85ec[_0x9fb042(0x120)])===_0x9fb042(0x15b))&&(_0x389343=_0x9fb042(0x15b)))),_0x37dee3['_console_ninja_session']={'id':+new Date(),'tool':_0x21c97a},_0x54661c&&_0x21c97a&&!_0x3f14c8&&(_0x3684d9?console[_0x9fb042(0x21f)](_0x9fb042(0x13f)+_0x3684d9+_0x9fb042(0x164)):console[_0x9fb042(0x21f)](_0x9fb042(0x1d5)+(_0x21c97a[_0x9fb042(0x228)](0x0)[_0x9fb042(0x19b)]()+_0x21c97a[_0x9fb042(0x180)](0x1))+',',_0x9fb042(0x1a1),_0x9fb042(0x1c5)));}let _0x4ab604=new X(_0x37dee3,_0x389343,_0x1ec11c,_0x3b536d,_0x500a27,_0x41dbf9);return _0x4ab604[_0x9fb042(0x18d)][_0x9fb042(0x1d6)](_0x4ab604);}catch(_0x397188){return console[_0x9fb042(0x20a)]('logger\\x20failed\\x20to\\x20connect\\x20to\\x20host',_0x397188&&_0x397188[_0x9fb042(0x22e)]),()=>{};}});return _0x4fefd5=>_0x427397['forEach'](_0x4c30de=>_0x4c30de(_0x4fefd5));}function V(_0x1fe7f,_0x4a4613,_0x2d4436,_0x5dd21d){const _0x3b5906=_0x31016d;_0x5dd21d&&_0x1fe7f==='reload'&&_0x2d4436[_0x3b5906(0x1d3)]['reload']();}function Y(_0x2f7e66,_0x5b570b,_0x29846a){const _0x5ebfd2=_0x31016d;var _0xf21d6c,_0x26a87f,_0x2802e2,_0x255f47,_0x38f6f8,_0x301e74,_0x311db6;if(_0x2f7e66['_consoleNinjaAllowedToStart']!==void 0x0)return _0x2f7e66[_0x5ebfd2(0x115)];let _0x28c2d5=((_0x26a87f=(_0xf21d6c=_0x2f7e66[_0x5ebfd2(0x197)])==null?void 0x0:_0xf21d6c[_0x5ebfd2(0x1f1)])==null?void 0x0:_0x26a87f[_0x5ebfd2(0x1fa)])||((_0x255f47=(_0x2802e2=_0x2f7e66[_0x5ebfd2(0x197)])==null?void 0x0:_0x2802e2[_0x5ebfd2(0x127)])==null?void 0x0:_0x255f47['NEXT_RUNTIME'])===_0x5ebfd2(0x1c1),_0xda671=!!(_0x29846a===_0x5ebfd2(0x186)&&((_0x38f6f8=_0x2f7e66[_0x5ebfd2(0x187)])==null?void 0x0:_0x38f6f8[_0x5ebfd2(0x1e5)]));function _0x3fd0c6(_0x12eb8b){const _0x582681=_0x5ebfd2;if(_0x12eb8b[_0x582681(0x198)]('/')&&_0x12eb8b['endsWith']('/')){let _0xc75d32=new RegExp(_0x12eb8b[_0x582681(0x150)](0x1,-0x1));return _0x1d6b84=>_0xc75d32[_0x582681(0x111)](_0x1d6b84);}else{if(_0x12eb8b[_0x582681(0x15c)]('*')||_0x12eb8b[_0x582681(0x15c)]('?')){let _0xb11e7a=new RegExp('^'+_0x12eb8b[_0x582681(0x170)](/\\./g,String[_0x582681(0x10a)](0x5c)+'.')[_0x582681(0x170)](/\\*/g,'.*')[_0x582681(0x170)](/\\?/g,'.')+String[_0x582681(0x10a)](0x24));return _0x476693=>_0xb11e7a[_0x582681(0x111)](_0x476693);}else return _0x29711a=>_0x29711a===_0x12eb8b;}}let _0x31a3f0=_0x5b570b['map'](_0x3fd0c6);return _0x2f7e66[_0x5ebfd2(0x115)]=_0x28c2d5||!_0x5b570b,!_0x2f7e66[_0x5ebfd2(0x115)]&&((_0x301e74=_0x2f7e66[_0x5ebfd2(0x1d3)])==null?void 0x0:_0x301e74['hostname'])&&(_0x2f7e66['_consoleNinjaAllowedToStart']=_0x31a3f0[_0x5ebfd2(0x18a)](_0x1c97aa=>_0x1c97aa(_0x2f7e66['location'][_0x5ebfd2(0x120)]))),_0xda671&&!_0x2f7e66[_0x5ebfd2(0x115)]&&!((_0x311db6=_0x2f7e66[_0x5ebfd2(0x1d3)])!=null&&_0x311db6[_0x5ebfd2(0x120)])&&(_0x2f7e66[_0x5ebfd2(0x115)]=!0x0),_0x2f7e66[_0x5ebfd2(0x115)];}function G(_0x3709f7){const _0x2adc0e=_0x31016d;var _0x34f438,_0x26c66f;let _0x43d240=function(_0x27135c,_0x2f3161){return _0x2f3161-_0x27135c;},_0x23c9c8;if(_0x3709f7[_0x2adc0e(0x104)])_0x23c9c8=function(){const _0xa93f7d=_0x2adc0e;return _0x3709f7[_0xa93f7d(0x104)]['now']();};else{if(_0x3709f7[_0x2adc0e(0x197)]&&_0x3709f7[_0x2adc0e(0x197)][_0x2adc0e(0x1a3)]&&((_0x26c66f=(_0x34f438=_0x3709f7[_0x2adc0e(0x197)])==null?void 0x0:_0x34f438[_0x2adc0e(0x127)])==null?void 0x0:_0x26c66f['NEXT_RUNTIME'])!==_0x2adc0e(0x1c1))_0x23c9c8=function(){const _0x3343e8=_0x2adc0e;return _0x3709f7['process'][_0x3343e8(0x1a3)]();},_0x43d240=function(_0x2f9d31,_0x3ab68d){return 0x3e8*(_0x3ab68d[0x0]-_0x2f9d31[0x0])+(_0x3ab68d[0x1]-_0x2f9d31[0x1])/0xf4240;};else try{let {performance:_0x2fdb5b}=require(_0x2adc0e(0x16e));_0x23c9c8=function(){const _0x508a02=_0x2adc0e;return _0x2fdb5b[_0x508a02(0x167)]();};}catch{_0x23c9c8=function(){return+new Date();};}}return{'elapsed':_0x43d240,'timeStamp':_0x23c9c8,'now':()=>Date['now']()};}function K(_0x15231f,_0x5c35aa,_0xee56c9,_0x6f57a5,_0x12f8c6,_0x3650e0){const _0x347bfb=_0x31016d;_0x15231f=_0x15231f,_0x5c35aa=_0x5c35aa,_0xee56c9=_0xee56c9,_0x6f57a5=_0x6f57a5,_0x12f8c6=_0x12f8c6,_0x12f8c6=_0x12f8c6||{},_0x12f8c6[_0x347bfb(0x1ce)]=_0x12f8c6[_0x347bfb(0x1ce)]||{},_0x12f8c6['reducedLimits']=_0x12f8c6['reducedLimits']||{},_0x12f8c6['reducePolicy']=_0x12f8c6['reducePolicy']||{},_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x16b)]=_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x16b)]||{},_0x12f8c6['reducePolicy'][_0x347bfb(0x1e1)]=_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x1e1)]||{};let _0x167695={'perLogpoint':{'reduceOnCount':_0x12f8c6[_0x347bfb(0x1e3)]['perLogpoint']['reduceOnCount']||0x32,'reduceOnAccumulatedProcessingTimeMs':_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x16b)][_0x347bfb(0x107)]||0x64,'resetWhenQuietMs':_0x12f8c6[_0x347bfb(0x1e3)]['perLogpoint']['resetWhenQuietMs']||0x1f4,'resetOnProcessingTimeAverageMs':_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x16b)][_0x347bfb(0x139)]||0x64},'global':{'reduceOnCount':_0x12f8c6[_0x347bfb(0x1e3)]['global'][_0x347bfb(0x1b7)]||0x3e8,'reduceOnAccumulatedProcessingTimeMs':_0x12f8c6['reducePolicy'][_0x347bfb(0x1e1)][_0x347bfb(0x107)]||0x12c,'resetWhenQuietMs':_0x12f8c6[_0x347bfb(0x1e3)]['global'][_0x347bfb(0x1bf)]||0x32,'resetOnProcessingTimeAverageMs':_0x12f8c6[_0x347bfb(0x1e3)][_0x347bfb(0x1e1)]['resetOnProcessingTimeAverageMs']||0x64}},_0xa75032=G(_0x15231f),_0x33f938=_0xa75032['elapsed'],_0x1fe086=_0xa75032[_0x347bfb(0x221)];function _0x12b098(){const _0x5af7b7=_0x347bfb;this[_0x5af7b7(0x1a0)]=/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[_$a-zA-Z\\xA0-\\uFFFF][_$a-zA-Z0-9\\xA0-\\uFFFF]*$/,this[_0x5af7b7(0x131)]=/^(0|[1-9][0-9]*)$/,this[_0x5af7b7(0x1d0)]=/'([^\\\\']|\\\\')*'/,this[_0x5af7b7(0x223)]=_0x15231f[_0x5af7b7(0x210)],this[_0x5af7b7(0x1ad)]=_0x15231f['HTMLAllCollection'],this[_0x5af7b7(0x184)]=Object[_0x5af7b7(0x1f2)],this[_0x5af7b7(0x17e)]=Object['getOwnPropertyNames'],this['_Symbol']=_0x15231f[_0x5af7b7(0x1c6)],this[_0x5af7b7(0x13c)]=RegExp[_0x5af7b7(0x16c)][_0x5af7b7(0x17f)],this['_dateToString']=Date['prototype'][_0x5af7b7(0x17f)];}_0x12b098['prototype']['serialize']=function(_0x17d71c,_0x223aed,_0xe67fa,_0x3f602f){const _0x26d8ad=_0x347bfb;var _0x4aadf7=this,_0x47bdff=_0xe67fa[_0x26d8ad(0x108)];function _0x43073c(_0xdfcedf,_0x1f579f,_0x499737){const _0x46f769=_0x26d8ad;_0x1f579f[_0x46f769(0x172)]='unknown',_0x1f579f[_0x46f769(0x1df)]=_0xdfcedf[_0x46f769(0x22e)],_0x3d11ec=_0x499737[_0x46f769(0x1fa)]['current'],_0x499737[_0x46f769(0x1fa)][_0x46f769(0x1cd)]=_0x1f579f,_0x4aadf7['_treeNodePropertiesBeforeFullValue'](_0x1f579f,_0x499737);}let _0x5857d9,_0xe44f00,_0x127816=_0x15231f[_0x26d8ad(0x17d)];_0x15231f[_0x26d8ad(0x17d)]=!0x0,_0x15231f[_0x26d8ad(0x136)]&&(_0x5857d9=_0x15231f[_0x26d8ad(0x136)][_0x26d8ad(0x1df)],_0xe44f00=_0x15231f[_0x26d8ad(0x136)][_0x26d8ad(0x20a)],_0x5857d9&&(_0x15231f['console'][_0x26d8ad(0x1df)]=function(){}),_0xe44f00&&(_0x15231f['console'][_0x26d8ad(0x20a)]=function(){}));try{try{_0xe67fa[_0x26d8ad(0x15e)]++,_0xe67fa['autoExpand']&&_0xe67fa[_0x26d8ad(0x105)][_0x26d8ad(0x21e)](_0x223aed);var _0x5afc28,_0x894c01,_0x36de4b,_0x242793,_0x25ff1e=[],_0x34cd44=[],_0x1f9742,_0x11346a=this[_0x26d8ad(0x1fb)](_0x223aed),_0x4a609e=_0x11346a==='array',_0x4ba3b9=!0x1,_0x53bed3=_0x11346a===_0x26d8ad(0x114),_0x2717fc=this['_isPrimitiveType'](_0x11346a),_0x4af31a=this[_0x26d8ad(0x1ea)](_0x11346a),_0x2df132=_0x2717fc||_0x4af31a,_0x55ec6f={},_0x4fa001=0x0,_0x5b7783=!0x1,_0x3d11ec,_0x5e29a6=/^(([1-9]{1}[0-9]*)|0)$/;if(_0xe67fa[_0x26d8ad(0x1bc)]){if(_0x4a609e){if(_0x894c01=_0x223aed[_0x26d8ad(0x1d8)],_0x894c01>_0xe67fa[_0x26d8ad(0x1a8)]){for(_0x36de4b=0x0,_0x242793=_0xe67fa[_0x26d8ad(0x1a8)],_0x5afc28=_0x36de4b;_0x5afc28<_0x242793;_0x5afc28++)_0x34cd44[_0x26d8ad(0x21e)](_0x4aadf7['_addProperty'](_0x25ff1e,_0x223aed,_0x11346a,_0x5afc28,_0xe67fa));_0x17d71c['cappedElements']=!0x0;}else{for(_0x36de4b=0x0,_0x242793=_0x894c01,_0x5afc28=_0x36de4b;_0x5afc28<_0x242793;_0x5afc28++)_0x34cd44[_0x26d8ad(0x21e)](_0x4aadf7['_addProperty'](_0x25ff1e,_0x223aed,_0x11346a,_0x5afc28,_0xe67fa));}_0xe67fa['autoExpandPropertyCount']+=_0x34cd44['length'];}if(!(_0x11346a===_0x26d8ad(0x181)||_0x11346a===_0x26d8ad(0x210))&&!_0x2717fc&&_0x11346a!==_0x26d8ad(0x225)&&_0x11346a!==_0x26d8ad(0x10d)&&_0x11346a!==_0x26d8ad(0x162)){var _0x392e30=_0x3f602f[_0x26d8ad(0x125)]||_0xe67fa['props'];if(this[_0x26d8ad(0x1e7)](_0x223aed)?(_0x5afc28=0x0,_0x223aed[_0x26d8ad(0x204)](function(_0x238e75){const _0x133849=_0x26d8ad;if(_0x4fa001++,_0xe67fa[_0x133849(0x11e)]++,_0x4fa001>_0x392e30){_0x5b7783=!0x0;return;}if(!_0xe67fa['isExpressionToEvaluate']&&_0xe67fa[_0x133849(0x108)]&&_0xe67fa[_0x133849(0x11e)]>_0xe67fa[_0x133849(0x126)]){_0x5b7783=!0x0;return;}_0x34cd44[_0x133849(0x21e)](_0x4aadf7[_0x133849(0x1f0)](_0x25ff1e,_0x223aed,_0x133849(0x19f),_0x5afc28++,_0xe67fa,function(_0x4d7c57){return function(){return _0x4d7c57;};}(_0x238e75)));})):this[_0x26d8ad(0x205)](_0x223aed)&&_0x223aed['forEach'](function(_0x75b8ae,_0x461c22){const _0x89d963=_0x26d8ad;if(_0x4fa001++,_0xe67fa['autoExpandPropertyCount']++,_0x4fa001>_0x392e30){_0x5b7783=!0x0;return;}if(!_0xe67fa['isExpressionToEvaluate']&&_0xe67fa['autoExpand']&&_0xe67fa[_0x89d963(0x11e)]>_0xe67fa[_0x89d963(0x126)]){_0x5b7783=!0x0;return;}var _0x5f1d14=_0x461c22['toString']();_0x5f1d14[_0x89d963(0x1d8)]>0x64&&(_0x5f1d14=_0x5f1d14[_0x89d963(0x150)](0x0,0x64)+_0x89d963(0x148)),_0x34cd44['push'](_0x4aadf7[_0x89d963(0x1f0)](_0x25ff1e,_0x223aed,'Map',_0x5f1d14,_0xe67fa,function(_0x109224){return function(){return _0x109224;};}(_0x75b8ae)));}),!_0x4ba3b9){try{for(_0x1f9742 in _0x223aed)if(!(_0x4a609e&&_0x5e29a6[_0x26d8ad(0x111)](_0x1f9742))&&!this['_blacklistedProperty'](_0x223aed,_0x1f9742,_0xe67fa)){if(_0x4fa001++,_0xe67fa[_0x26d8ad(0x11e)]++,_0x4fa001>_0x392e30){_0x5b7783=!0x0;break;}if(!_0xe67fa['isExpressionToEvaluate']&&_0xe67fa[_0x26d8ad(0x108)]&&_0xe67fa[_0x26d8ad(0x11e)]>_0xe67fa[_0x26d8ad(0x126)]){_0x5b7783=!0x0;break;}_0x34cd44[_0x26d8ad(0x21e)](_0x4aadf7['_addObjectProperty'](_0x25ff1e,_0x55ec6f,_0x223aed,_0x11346a,_0x1f9742,_0xe67fa));}}catch{}if(_0x55ec6f[_0x26d8ad(0x1eb)]=!0x0,_0x53bed3&&(_0x55ec6f[_0x26d8ad(0x166)]=!0x0),!_0x5b7783){var _0x547b96=[][_0x26d8ad(0x14c)](this[_0x26d8ad(0x17e)](_0x223aed))[_0x26d8ad(0x14c)](this[_0x26d8ad(0x195)](_0x223aed));for(_0x5afc28=0x0,_0x894c01=_0x547b96[_0x26d8ad(0x1d8)];_0x5afc28<_0x894c01;_0x5afc28++)if(_0x1f9742=_0x547b96[_0x5afc28],!(_0x4a609e&&_0x5e29a6[_0x26d8ad(0x111)](_0x1f9742[_0x26d8ad(0x17f)]()))&&!this[_0x26d8ad(0x214)](_0x223aed,_0x1f9742,_0xe67fa)&&!_0x55ec6f[typeof _0x1f9742!='symbol'?_0x26d8ad(0x143)+_0x1f9742[_0x26d8ad(0x17f)]():_0x1f9742]){if(_0x4fa001++,_0xe67fa[_0x26d8ad(0x11e)]++,_0x4fa001>_0x392e30){_0x5b7783=!0x0;break;}if(!_0xe67fa[_0x26d8ad(0x140)]&&_0xe67fa[_0x26d8ad(0x108)]&&_0xe67fa[_0x26d8ad(0x11e)]>_0xe67fa[_0x26d8ad(0x126)]){_0x5b7783=!0x0;break;}_0x34cd44['push'](_0x4aadf7['_addObjectProperty'](_0x25ff1e,_0x55ec6f,_0x223aed,_0x11346a,_0x1f9742,_0xe67fa));}}}}}if(_0x17d71c[_0x26d8ad(0x172)]=_0x11346a,_0x2df132?(_0x17d71c[_0x26d8ad(0x18e)]=_0x223aed['valueOf'](),this[_0x26d8ad(0x18c)](_0x11346a,_0x17d71c,_0xe67fa,_0x3f602f)):_0x11346a===_0x26d8ad(0x1a5)?_0x17d71c[_0x26d8ad(0x18e)]=this['_dateToString'][_0x26d8ad(0x14d)](_0x223aed):_0x11346a===_0x26d8ad(0x162)?_0x17d71c[_0x26d8ad(0x18e)]=_0x223aed['toString']():_0x11346a===_0x26d8ad(0x1af)?_0x17d71c[_0x26d8ad(0x18e)]=this[_0x26d8ad(0x13c)][_0x26d8ad(0x14d)](_0x223aed):_0x11346a===_0x26d8ad(0x161)&&this[_0x26d8ad(0x13d)]?_0x17d71c[_0x26d8ad(0x18e)]=this[_0x26d8ad(0x13d)][_0x26d8ad(0x16c)][_0x26d8ad(0x17f)][_0x26d8ad(0x14d)](_0x223aed):!_0xe67fa[_0x26d8ad(0x1bc)]&&!(_0x11346a===_0x26d8ad(0x181)||_0x11346a==='undefined')&&(delete _0x17d71c[_0x26d8ad(0x18e)],_0x17d71c['capped']=!0x0),_0x5b7783&&(_0x17d71c[_0x26d8ad(0x21c)]=!0x0),_0x3d11ec=_0xe67fa[_0x26d8ad(0x1fa)][_0x26d8ad(0x1cd)],_0xe67fa['node']['current']=_0x17d71c,this[_0x26d8ad(0x1cc)](_0x17d71c,_0xe67fa),_0x34cd44[_0x26d8ad(0x1d8)]){for(_0x5afc28=0x0,_0x894c01=_0x34cd44['length'];_0x5afc28<_0x894c01;_0x5afc28++)_0x34cd44[_0x5afc28](_0x5afc28);}_0x25ff1e[_0x26d8ad(0x1d8)]&&(_0x17d71c[_0x26d8ad(0x125)]=_0x25ff1e);}catch(_0x4a9434){_0x43073c(_0x4a9434,_0x17d71c,_0xe67fa);}this['_additionalMetadata'](_0x223aed,_0x17d71c),this[_0x26d8ad(0x21d)](_0x17d71c,_0xe67fa),_0xe67fa[_0x26d8ad(0x1fa)][_0x26d8ad(0x1cd)]=_0x3d11ec,_0xe67fa['level']--,_0xe67fa[_0x26d8ad(0x108)]=_0x47bdff,_0xe67fa[_0x26d8ad(0x108)]&&_0xe67fa['autoExpandPreviousObjects'][_0x26d8ad(0x1ac)]();}finally{_0x5857d9&&(_0x15231f[_0x26d8ad(0x136)][_0x26d8ad(0x1df)]=_0x5857d9),_0xe44f00&&(_0x15231f['console'][_0x26d8ad(0x20a)]=_0xe44f00),_0x15231f[_0x26d8ad(0x17d)]=_0x127816;}return _0x17d71c;},_0x12b098[_0x347bfb(0x16c)]['_getOwnPropertySymbols']=function(_0x22e048){const _0x37de92=_0x347bfb;return Object[_0x37de92(0x20b)]?Object['getOwnPropertySymbols'](_0x22e048):[];},_0x12b098[_0x347bfb(0x16c)]['_isSet']=function(_0x3b2a07){const _0x580e28=_0x347bfb;return!!(_0x3b2a07&&_0x15231f[_0x580e28(0x19f)]&&this[_0x580e28(0x1e6)](_0x3b2a07)===_0x580e28(0x157)&&_0x3b2a07[_0x580e28(0x204)]);},_0x12b098['prototype']['_blacklistedProperty']=function(_0x203830,_0xe32bd2,_0x875bb9){const _0x324bc2=_0x347bfb;if(!_0x875bb9[_0x324bc2(0x188)]){let _0x4524bb=this[_0x324bc2(0x184)](_0x203830,_0xe32bd2);if(_0x4524bb&&_0x4524bb['get'])return!0x0;}return _0x875bb9[_0x324bc2(0x1f5)]?typeof _0x203830[_0xe32bd2]==_0x324bc2(0x114):!0x1;},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x1fb)]=function(_0x51f8a9){const _0x35407a=_0x347bfb;var _0x396f53='';return _0x396f53=typeof _0x51f8a9,_0x396f53===_0x35407a(0x18b)?this[_0x35407a(0x1e6)](_0x51f8a9)===_0x35407a(0x22b)?_0x396f53=_0x35407a(0x1fc):this[_0x35407a(0x1e6)](_0x51f8a9)===_0x35407a(0x118)?_0x396f53='date':this[_0x35407a(0x1e6)](_0x51f8a9)===_0x35407a(0x1dc)?_0x396f53='bigint':_0x51f8a9===null?_0x396f53=_0x35407a(0x181):_0x51f8a9[_0x35407a(0x1d7)]&&(_0x396f53=_0x51f8a9[_0x35407a(0x1d7)][_0x35407a(0x123)]||_0x396f53):_0x396f53==='undefined'&&this[_0x35407a(0x1ad)]&&_0x51f8a9 instanceof this[_0x35407a(0x1ad)]&&(_0x396f53=_0x35407a(0x213)),_0x396f53;},_0x12b098['prototype'][_0x347bfb(0x1e6)]=function(_0x4e2803){const _0x381adc=_0x347bfb;return Object[_0x381adc(0x16c)][_0x381adc(0x17f)][_0x381adc(0x14d)](_0x4e2803);},_0x12b098['prototype'][_0x347bfb(0x1b5)]=function(_0x1fa045){const _0x520be3=_0x347bfb;return _0x1fa045===_0x520be3(0x218)||_0x1fa045===_0x520be3(0x121)||_0x1fa045===_0x520be3(0x160);},_0x12b098['prototype'][_0x347bfb(0x1ea)]=function(_0x40c66d){const _0x40d8c3=_0x347bfb;return _0x40c66d===_0x40d8c3(0x200)||_0x40c66d===_0x40d8c3(0x225)||_0x40c66d===_0x40d8c3(0x119);},_0x12b098[_0x347bfb(0x16c)]['_addProperty']=function(_0x114a34,_0x272d4c,_0x10fc47,_0x2eaf5e,_0x3d08c6,_0x560d7e){var _0x337c4c=this;return function(_0xfe5bdd){const _0x2506d4=_0x7df1;var _0x53ad30=_0x3d08c6[_0x2506d4(0x1fa)]['current'],_0xc3846a=_0x3d08c6[_0x2506d4(0x1fa)]['index'],_0xdce3b2=_0x3d08c6[_0x2506d4(0x1fa)][_0x2506d4(0x1a4)];_0x3d08c6[_0x2506d4(0x1fa)][_0x2506d4(0x1a4)]=_0x53ad30,_0x3d08c6[_0x2506d4(0x1fa)]['index']=typeof _0x2eaf5e=='number'?_0x2eaf5e:_0xfe5bdd,_0x114a34[_0x2506d4(0x21e)](_0x337c4c[_0x2506d4(0x144)](_0x272d4c,_0x10fc47,_0x2eaf5e,_0x3d08c6,_0x560d7e)),_0x3d08c6[_0x2506d4(0x1fa)][_0x2506d4(0x1a4)]=_0xdce3b2,_0x3d08c6[_0x2506d4(0x1fa)][_0x2506d4(0x145)]=_0xc3846a;};},_0x12b098[_0x347bfb(0x16c)]['_addObjectProperty']=function(_0x4d22cf,_0x3606c7,_0x1703fb,_0x3d72b2,_0x4adddf,_0x28a1e1,_0x492d16){const _0x166d24=_0x347bfb;var _0x226f50=this;return _0x3606c7[typeof _0x4adddf!=_0x166d24(0x161)?_0x166d24(0x143)+_0x4adddf['toString']():_0x4adddf]=!0x0,function(_0x1e164b){const _0x12adc4=_0x166d24;var _0x5190e5=_0x28a1e1['node'][_0x12adc4(0x1cd)],_0x53a2b0=_0x28a1e1[_0x12adc4(0x1fa)][_0x12adc4(0x145)],_0x3f3167=_0x28a1e1[_0x12adc4(0x1fa)]['parent'];_0x28a1e1[_0x12adc4(0x1fa)][_0x12adc4(0x1a4)]=_0x5190e5,_0x28a1e1[_0x12adc4(0x1fa)][_0x12adc4(0x145)]=_0x1e164b,_0x4d22cf[_0x12adc4(0x21e)](_0x226f50['_property'](_0x1703fb,_0x3d72b2,_0x4adddf,_0x28a1e1,_0x492d16)),_0x28a1e1[_0x12adc4(0x1fa)]['parent']=_0x3f3167,_0x28a1e1[_0x12adc4(0x1fa)]['index']=_0x53a2b0;};},_0x12b098[_0x347bfb(0x16c)]['_property']=function(_0x438fcb,_0x37cc24,_0x5cc7c8,_0x2b88cf,_0x2c7950){const _0x15cbf3=_0x347bfb;var _0x283ce5=this;_0x2c7950||(_0x2c7950=function(_0x5d6ed0,_0x1a5341){return _0x5d6ed0[_0x1a5341];});var _0x26d256=_0x5cc7c8[_0x15cbf3(0x17f)](),_0x33262a=_0x2b88cf[_0x15cbf3(0x102)]||{},_0x4784be=_0x2b88cf['depth'],_0x51f2a3=_0x2b88cf[_0x15cbf3(0x140)];try{var _0x30f1a0=this[_0x15cbf3(0x205)](_0x438fcb),_0x31e02f=_0x26d256;_0x30f1a0&&_0x31e02f[0x0]==='\\x27'&&(_0x31e02f=_0x31e02f[_0x15cbf3(0x180)](0x1,_0x31e02f[_0x15cbf3(0x1d8)]-0x2));var _0x260566=_0x2b88cf[_0x15cbf3(0x102)]=_0x33262a[_0x15cbf3(0x143)+_0x31e02f];_0x260566&&(_0x2b88cf[_0x15cbf3(0x1bc)]=_0x2b88cf['depth']+0x1),_0x2b88cf[_0x15cbf3(0x140)]=!!_0x260566;var _0x2325f2=typeof _0x5cc7c8==_0x15cbf3(0x161),_0xc5117a={'name':_0x2325f2||_0x30f1a0?_0x26d256:this[_0x15cbf3(0x191)](_0x26d256)};if(_0x2325f2&&(_0xc5117a[_0x15cbf3(0x161)]=!0x0),!(_0x37cc24===_0x15cbf3(0x1fc)||_0x37cc24===_0x15cbf3(0x1ca))){var _0x3a7886=this['_getOwnPropertyDescriptor'](_0x438fcb,_0x5cc7c8);if(_0x3a7886&&(_0x3a7886['set']&&(_0xc5117a[_0x15cbf3(0x1ba)]=!0x0),_0x3a7886['get']&&!_0x260566&&!_0x2b88cf[_0x15cbf3(0x188)]))return _0xc5117a[_0x15cbf3(0x212)]=!0x0,this['_processTreeNodeResult'](_0xc5117a,_0x2b88cf),_0xc5117a;}var _0x13c69a;try{_0x13c69a=_0x2c7950(_0x438fcb,_0x5cc7c8);}catch(_0x1e4f90){return _0xc5117a={'name':_0x26d256,'type':_0x15cbf3(0x19e),'error':_0x1e4f90[_0x15cbf3(0x22e)]},this[_0x15cbf3(0x152)](_0xc5117a,_0x2b88cf),_0xc5117a;}var _0x580902=this[_0x15cbf3(0x1fb)](_0x13c69a),_0x3486b0=this[_0x15cbf3(0x1b5)](_0x580902);if(_0xc5117a[_0x15cbf3(0x172)]=_0x580902,_0x3486b0)this['_processTreeNodeResult'](_0xc5117a,_0x2b88cf,_0x13c69a,function(){const _0x346d18=_0x15cbf3;_0xc5117a['value']=_0x13c69a[_0x346d18(0x11a)](),!_0x260566&&_0x283ce5['_capIfString'](_0x580902,_0xc5117a,_0x2b88cf,{});});else{var _0x2a16ca=_0x2b88cf[_0x15cbf3(0x108)]&&_0x2b88cf[_0x15cbf3(0x15e)]<_0x2b88cf[_0x15cbf3(0x19a)]&&_0x2b88cf[_0x15cbf3(0x105)][_0x15cbf3(0x203)](_0x13c69a)<0x0&&_0x580902!==_0x15cbf3(0x114)&&_0x2b88cf['autoExpandPropertyCount']<_0x2b88cf[_0x15cbf3(0x126)];_0x2a16ca||_0x2b88cf[_0x15cbf3(0x15e)]<_0x4784be||_0x260566?this[_0x15cbf3(0x15a)](_0xc5117a,_0x13c69a,_0x2b88cf,_0x260566||{}):this[_0x15cbf3(0x152)](_0xc5117a,_0x2b88cf,_0x13c69a,function(){const _0x3e8a2d=_0x15cbf3;_0x580902==='null'||_0x580902===_0x3e8a2d(0x210)||(delete _0xc5117a['value'],_0xc5117a[_0x3e8a2d(0x201)]=!0x0);});}return _0xc5117a;}finally{_0x2b88cf[_0x15cbf3(0x102)]=_0x33262a,_0x2b88cf[_0x15cbf3(0x1bc)]=_0x4784be,_0x2b88cf['isExpressionToEvaluate']=_0x51f2a3;}},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x18c)]=function(_0x174b1c,_0x3e518b,_0x2a4c52,_0x1a455b){const _0x10b2cb=_0x347bfb;var _0x2f61dc=_0x1a455b[_0x10b2cb(0x151)]||_0x2a4c52['strLength'];if((_0x174b1c===_0x10b2cb(0x121)||_0x174b1c===_0x10b2cb(0x225))&&_0x3e518b[_0x10b2cb(0x18e)]){let _0x32c691=_0x3e518b[_0x10b2cb(0x18e)][_0x10b2cb(0x1d8)];_0x2a4c52[_0x10b2cb(0x13b)]+=_0x32c691,_0x2a4c52['allStrLength']>_0x2a4c52['totalStrLength']?(_0x3e518b['capped']='',delete _0x3e518b[_0x10b2cb(0x18e)]):_0x32c691>_0x2f61dc&&(_0x3e518b[_0x10b2cb(0x201)]=_0x3e518b[_0x10b2cb(0x18e)]['substr'](0x0,_0x2f61dc),delete _0x3e518b[_0x10b2cb(0x18e)]);}},_0x12b098['prototype']['_isMap']=function(_0x533435){const _0x45d1e8=_0x347bfb;return!!(_0x533435&&_0x15231f['Map']&&this['_objectToString'](_0x533435)===_0x45d1e8(0x141)&&_0x533435[_0x45d1e8(0x204)]);},_0x12b098[_0x347bfb(0x16c)]['_propertyName']=function(_0x19981e){const _0xe29281=_0x347bfb;if(_0x19981e[_0xe29281(0x110)](/^\\d+$/))return _0x19981e;var _0x10638b;try{_0x10638b=JSON[_0xe29281(0x202)](''+_0x19981e);}catch{_0x10638b='\\x22'+this[_0xe29281(0x1e6)](_0x19981e)+'\\x22';}return _0x10638b[_0xe29281(0x110)](/^\"([a-zA-Z_][a-zA-Z_0-9]*)\"$/)?_0x10638b=_0x10638b[_0xe29281(0x180)](0x1,_0x10638b[_0xe29281(0x1d8)]-0x2):_0x10638b=_0x10638b[_0xe29281(0x170)](/'/g,'\\x5c\\x27')[_0xe29281(0x170)](/\\\\\"/g,'\\x22')[_0xe29281(0x170)](/(^\"|\"$)/g,'\\x27'),_0x10638b;},_0x12b098['prototype'][_0x347bfb(0x152)]=function(_0x3564d3,_0x3a4370,_0x48fd6b,_0x3ed463){const _0x3d08b7=_0x347bfb;this[_0x3d08b7(0x1cc)](_0x3564d3,_0x3a4370),_0x3ed463&&_0x3ed463(),this[_0x3d08b7(0x1a9)](_0x48fd6b,_0x3564d3),this[_0x3d08b7(0x21d)](_0x3564d3,_0x3a4370);},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x1cc)]=function(_0x55f4b3,_0x785686){const _0x1ed328=_0x347bfb;this[_0x1ed328(0x22a)](_0x55f4b3,_0x785686),this['_setNodeQueryPath'](_0x55f4b3,_0x785686),this[_0x1ed328(0x18f)](_0x55f4b3,_0x785686),this['_setNodePermissions'](_0x55f4b3,_0x785686);},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x22a)]=function(_0x51f069,_0x1132d1){},_0x12b098[_0x347bfb(0x16c)]['_setNodeQueryPath']=function(_0x20c944,_0x50e710){},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x142)]=function(_0x7d9d8c,_0x29e1a7){},_0x12b098['prototype'][_0x347bfb(0x20f)]=function(_0x38de0b){const _0x42a9ff=_0x347bfb;return _0x38de0b===this[_0x42a9ff(0x223)];},_0x12b098['prototype'][_0x347bfb(0x21d)]=function(_0x6625c3,_0x696e7){const _0x3a8ee9=_0x347bfb;this[_0x3a8ee9(0x142)](_0x6625c3,_0x696e7),this[_0x3a8ee9(0x1e8)](_0x6625c3),_0x696e7['sortProps']&&this[_0x3a8ee9(0x132)](_0x6625c3),this['_addFunctionsNode'](_0x6625c3,_0x696e7),this[_0x3a8ee9(0x226)](_0x6625c3,_0x696e7),this[_0x3a8ee9(0x14b)](_0x6625c3);},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x1a9)]=function(_0x220d33,_0xc4d0af){const _0x1321e1=_0x347bfb;try{_0x220d33&&typeof _0x220d33['length']==_0x1321e1(0x160)&&(_0xc4d0af[_0x1321e1(0x1d8)]=_0x220d33[_0x1321e1(0x1d8)]);}catch{}if(_0xc4d0af['type']===_0x1321e1(0x160)||_0xc4d0af[_0x1321e1(0x172)]===_0x1321e1(0x119)){if(isNaN(_0xc4d0af[_0x1321e1(0x18e)]))_0xc4d0af[_0x1321e1(0x185)]=!0x0,delete _0xc4d0af[_0x1321e1(0x18e)];else switch(_0xc4d0af[_0x1321e1(0x18e)]){case Number['POSITIVE_INFINITY']:_0xc4d0af[_0x1321e1(0x16d)]=!0x0,delete _0xc4d0af[_0x1321e1(0x18e)];break;case Number[_0x1321e1(0x13a)]:_0xc4d0af['negativeInfinity']=!0x0,delete _0xc4d0af[_0x1321e1(0x18e)];break;case 0x0:this[_0x1321e1(0x192)](_0xc4d0af[_0x1321e1(0x18e)])&&(_0xc4d0af[_0x1321e1(0x153)]=!0x0);break;}}else _0xc4d0af[_0x1321e1(0x172)]===_0x1321e1(0x114)&&typeof _0x220d33['name']==_0x1321e1(0x121)&&_0x220d33['name']&&_0xc4d0af[_0x1321e1(0x123)]&&_0x220d33[_0x1321e1(0x123)]!==_0xc4d0af[_0x1321e1(0x123)]&&(_0xc4d0af[_0x1321e1(0x220)]=_0x220d33[_0x1321e1(0x123)]);},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x192)]=function(_0x1ca5fd){return 0x1/_0x1ca5fd===Number['NEGATIVE_INFINITY'];},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x132)]=function(_0x46e319){const _0x4f8033=_0x347bfb;!_0x46e319[_0x4f8033(0x125)]||!_0x46e319[_0x4f8033(0x125)][_0x4f8033(0x1d8)]||_0x46e319[_0x4f8033(0x172)]===_0x4f8033(0x1fc)||_0x46e319[_0x4f8033(0x172)]===_0x4f8033(0x17a)||_0x46e319[_0x4f8033(0x172)]===_0x4f8033(0x19f)||_0x46e319[_0x4f8033(0x125)]['sort'](function(_0x3bdb2f,_0x2c4c44){const _0x46b519=_0x4f8033;var _0x450056=_0x3bdb2f['name']['toLowerCase'](),_0x2ac353=_0x2c4c44[_0x46b519(0x123)][_0x46b519(0x21a)]();return _0x450056<_0x2ac353?-0x1:_0x450056>_0x2ac353?0x1:0x0;});},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x12c)]=function(_0xb6606e,_0x2a439a){const _0x3e904e=_0x347bfb;if(!(_0x2a439a[_0x3e904e(0x1f5)]||!_0xb6606e[_0x3e904e(0x125)]||!_0xb6606e[_0x3e904e(0x125)][_0x3e904e(0x1d8)])){for(var _0x22e1fd=[],_0x18fb73=[],_0x27b6cb=0x0,_0x175e93=_0xb6606e[_0x3e904e(0x125)][_0x3e904e(0x1d8)];_0x27b6cb<_0x175e93;_0x27b6cb++){var _0x29765e=_0xb6606e[_0x3e904e(0x125)][_0x27b6cb];_0x29765e[_0x3e904e(0x172)]==='function'?_0x22e1fd[_0x3e904e(0x21e)](_0x29765e):_0x18fb73['push'](_0x29765e);}if(!(!_0x18fb73[_0x3e904e(0x1d8)]||_0x22e1fd['length']<=0x1)){_0xb6606e[_0x3e904e(0x125)]=_0x18fb73;var _0x51085e={'functionsNode':!0x0,'props':_0x22e1fd};this[_0x3e904e(0x22a)](_0x51085e,_0x2a439a),this[_0x3e904e(0x142)](_0x51085e,_0x2a439a),this[_0x3e904e(0x1e8)](_0x51085e),this[_0x3e904e(0x175)](_0x51085e,_0x2a439a),_0x51085e['id']+='\\x20f',_0xb6606e['props'][_0x3e904e(0x217)](_0x51085e);}}},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x226)]=function(_0x12ee86,_0x2de65c){},_0x12b098['prototype'][_0x347bfb(0x1e8)]=function(_0x858377){},_0x12b098[_0x347bfb(0x16c)][_0x347bfb(0x112)]=function(_0xf41874){const _0x5222ed=_0x347bfb;return Array['isArray'](_0xf41874)||typeof _0xf41874==_0x5222ed(0x18b)&&this[_0x5222ed(0x1e6)](_0xf41874)==='[object\\x20Array]';},_0x12b098[_0x347bfb(0x16c)]['_setNodePermissions']=function(_0x135df8,_0x361d5d){},_0x12b098[_0x347bfb(0x16c)]['_cleanNode']=function(_0xd3f897){const _0x3aa26d=_0x347bfb;delete _0xd3f897['_hasSymbolPropertyOnItsPath'],delete _0xd3f897['_hasSetOnItsPath'],delete _0xd3f897[_0x3aa26d(0x16f)];},_0x12b098[_0x347bfb(0x16c)]['_setNodeExpressionPath']=function(_0x4ce9a3,_0x3c0ad9){};let _0x10dfc=new _0x12b098(),_0x56cc5e={'props':_0x12f8c6[_0x347bfb(0x1ce)]['props']||0x64,'elements':_0x12f8c6['defaultLimits'][_0x347bfb(0x1a8)]||0x64,'strLength':_0x12f8c6[_0x347bfb(0x1ce)][_0x347bfb(0x151)]||0x400*0x32,'totalStrLength':_0x12f8c6[_0x347bfb(0x1ce)][_0x347bfb(0x1e9)]||0x400*0x32,'autoExpandLimit':_0x12f8c6['defaultLimits'][_0x347bfb(0x126)]||0x1388,'autoExpandMaxDepth':_0x12f8c6[_0x347bfb(0x1ce)][_0x347bfb(0x19a)]||0xa},_0x39bf74={'props':_0x12f8c6[_0x347bfb(0x12e)][_0x347bfb(0x125)]||0x5,'elements':_0x12f8c6[_0x347bfb(0x12e)]['elements']||0x5,'strLength':_0x12f8c6[_0x347bfb(0x12e)][_0x347bfb(0x151)]||0x100,'totalStrLength':_0x12f8c6[_0x347bfb(0x12e)]['totalStrLength']||0x100*0x3,'autoExpandLimit':_0x12f8c6[_0x347bfb(0x12e)]['autoExpandLimit']||0x1e,'autoExpandMaxDepth':_0x12f8c6[_0x347bfb(0x12e)][_0x347bfb(0x19a)]||0x2};if(_0x3650e0){let _0x5da6fe=_0x10dfc[_0x347bfb(0x15a)]['bind'](_0x10dfc);_0x10dfc[_0x347bfb(0x15a)]=function(_0x50f39d,_0x2044dd,_0x203ab9,_0x21a0ff){return _0x5da6fe(_0x50f39d,_0x3650e0(_0x2044dd),_0x203ab9,_0x21a0ff);};}function _0x4cf4a9(_0x5b9fa0,_0x142a48,_0x403aed,_0x30c334,_0x3c1126,_0x541747){const _0x25f03b=_0x347bfb;let _0x370c7d,_0x5a2196;try{_0x5a2196=_0x1fe086(),_0x370c7d=_0xee56c9[_0x142a48],!_0x370c7d||_0x5a2196-_0x370c7d['ts']>_0x167695[_0x25f03b(0x16b)]['resetWhenQuietMs']&&_0x370c7d['count']&&_0x370c7d['time']/_0x370c7d[_0x25f03b(0x10b)]<_0x167695[_0x25f03b(0x16b)]['resetOnProcessingTimeAverageMs']?(_0xee56c9[_0x142a48]=_0x370c7d={'count':0x0,'time':0x0,'ts':_0x5a2196},_0xee56c9[_0x25f03b(0x183)]={}):_0x5a2196-_0xee56c9[_0x25f03b(0x183)]['ts']>_0x167695['global'][_0x25f03b(0x1bf)]&&_0xee56c9[_0x25f03b(0x183)]['count']&&_0xee56c9[_0x25f03b(0x183)][_0x25f03b(0x189)]/_0xee56c9[_0x25f03b(0x183)][_0x25f03b(0x10b)]<_0x167695[_0x25f03b(0x1e1)]['resetOnProcessingTimeAverageMs']&&(_0xee56c9['hits']={});let _0x3fcea7=[],_0x47e5cf=_0x370c7d[_0x25f03b(0x122)]||_0xee56c9[_0x25f03b(0x183)][_0x25f03b(0x122)]?_0x39bf74:_0x56cc5e,_0x51cd8c=_0x45980f=>{const _0x30ab0c=_0x25f03b;let _0x114096={};return _0x114096['props']=_0x45980f['props'],_0x114096[_0x30ab0c(0x1a8)]=_0x45980f[_0x30ab0c(0x1a8)],_0x114096[_0x30ab0c(0x151)]=_0x45980f['strLength'],_0x114096[_0x30ab0c(0x1e9)]=_0x45980f[_0x30ab0c(0x1e9)],_0x114096[_0x30ab0c(0x126)]=_0x45980f['autoExpandLimit'],_0x114096[_0x30ab0c(0x19a)]=_0x45980f[_0x30ab0c(0x19a)],_0x114096[_0x30ab0c(0x149)]=!0x1,_0x114096[_0x30ab0c(0x1f5)]=!_0x5c35aa,_0x114096[_0x30ab0c(0x1bc)]=0x1,_0x114096[_0x30ab0c(0x15e)]=0x0,_0x114096['expId']=_0x30ab0c(0x1c9),_0x114096['rootExpression']='root_exp',_0x114096[_0x30ab0c(0x108)]=!0x0,_0x114096['autoExpandPreviousObjects']=[],_0x114096['autoExpandPropertyCount']=0x0,_0x114096[_0x30ab0c(0x188)]=_0x12f8c6[_0x30ab0c(0x188)],_0x114096[_0x30ab0c(0x13b)]=0x0,_0x114096[_0x30ab0c(0x1fa)]={'current':void 0x0,'parent':void 0x0,'index':0x0},_0x114096;};for(var _0x5db95a=0x0;_0x5db95a<_0x3c1126[_0x25f03b(0x1d8)];_0x5db95a++)_0x3fcea7[_0x25f03b(0x21e)](_0x10dfc[_0x25f03b(0x15a)]({'timeNode':_0x5b9fa0===_0x25f03b(0x189)||void 0x0},_0x3c1126[_0x5db95a],_0x51cd8c(_0x47e5cf),{}));if(_0x5b9fa0===_0x25f03b(0x1de)||_0x5b9fa0===_0x25f03b(0x1df)){let _0x5615f1=Error[_0x25f03b(0x134)];try{Error['stackTraceLimit']=0x1/0x0,_0x3fcea7[_0x25f03b(0x21e)](_0x10dfc[_0x25f03b(0x15a)]({'stackNode':!0x0},new Error()['stack'],_0x51cd8c(_0x47e5cf),{'strLength':0x1/0x0}));}finally{Error['stackTraceLimit']=_0x5615f1;}}return{'method':'log','version':_0x6f57a5,'args':[{'ts':_0x403aed,'session':_0x30c334,'args':_0x3fcea7,'id':_0x142a48,'context':_0x541747}]};}catch(_0x1eeebf){return{'method':_0x25f03b(0x21f),'version':_0x6f57a5,'args':[{'ts':_0x403aed,'session':_0x30c334,'args':[{'type':_0x25f03b(0x19e),'error':_0x1eeebf&&_0x1eeebf['message']}],'id':_0x142a48,'context':_0x541747}]};}finally{try{if(_0x370c7d&&_0x5a2196){let _0x33bd5e=_0x1fe086();_0x370c7d[_0x25f03b(0x10b)]++,_0x370c7d[_0x25f03b(0x189)]+=_0x33f938(_0x5a2196,_0x33bd5e),_0x370c7d['ts']=_0x33bd5e,_0xee56c9['hits'][_0x25f03b(0x10b)]++,_0xee56c9[_0x25f03b(0x183)][_0x25f03b(0x189)]+=_0x33f938(_0x5a2196,_0x33bd5e),_0xee56c9[_0x25f03b(0x183)]['ts']=_0x33bd5e,(_0x370c7d['count']>_0x167695[_0x25f03b(0x16b)][_0x25f03b(0x1b7)]||_0x370c7d[_0x25f03b(0x189)]>_0x167695['perLogpoint'][_0x25f03b(0x107)])&&(_0x370c7d['reduceLimits']=!0x0),(_0xee56c9[_0x25f03b(0x183)]['count']>_0x167695[_0x25f03b(0x1e1)][_0x25f03b(0x1b7)]||_0xee56c9['hits'][_0x25f03b(0x189)]>_0x167695[_0x25f03b(0x1e1)][_0x25f03b(0x107)])&&(_0xee56c9[_0x25f03b(0x183)]['reduceLimits']=!0x0);}}catch{}}}return _0x4cf4a9;}function _0x7df1(_0x956ad8,_0x1a3efc){const _0x3fdf13=_0x3fdf();return _0x7df1=function(_0x7df1df,_0x3e7c25){_0x7df1df=_0x7df1df-0x101;let _0x5875cf=_0x3fdf13[_0x7df1df];return _0x5875cf;},_0x7df1(_0x956ad8,_0x1a3efc);}var q=Symbol('ninja'),ce=0xc8,ee=_0x31016d(0x103);((_0x13d90d,_0x55df40,_0x26056f,_0x157710,_0x58a2c8,_0x505554,_0x36b03a,_0x111e3c,_0x377136,_0x8c3a70,_0x2a2f92,_0x5dc7b0)=>{const _0x8f5d11=_0x31016d;if(!Y(_0x13d90d,_0x111e3c,_0x505554)){_0x13d90d[_0x8f5d11(0x1c7)]=!0x0;return;}if(_0x13d90d[_0x8f5d11(0x1c7)])return;_0x13d90d[_0x8f5d11(0x1c7)]=!0x0;let _0x267bde=_0x505554==='next.js'&&_0x13d90d[_0x8f5d11(0x135)]?_0x13d90d['origin']:void 0x0,_0x5a0232=!0x1,_0x5304d0={},_0x172b2c={},_0x237f41=()=>{const _0x1696c2=_0x8f5d11;for(let _0x1bb183 of Object['getOwnPropertyNames'](_0x5304d0))delete _0x5304d0[_0x1bb183];for(let _0x251bf8 of Object[_0x1696c2(0x1f9)](_0x172b2c))delete _0x172b2c[_0x251bf8];},_0x790bcc=Z(_0x13d90d,_0x55df40,_0x26056f,_0x157710,_0x505554,_0x377136,_0x8c3a70,(_0x179d58,_0x27879a,_0x290e1e,_0x179ea6)=>{const _0x120bef=_0x8f5d11;if(V(_0x179d58,_0x27879a,_0x290e1e,_0x179ea6),_0x179d58===_0x120bef(0x14e)){let _0x7bc4b4=_0x27879a[0x0];if(_0x7bc4b4[_0x120bef(0x13e)](_0x120bef(0x1b2))&&_0x235ae8(_0x7bc4b4[_0x120bef(0x1b2)]),_0x7bc4b4['hasOwnProperty'](_0x120bef(0x1ee))){for(let _0x5edbe0 of _0x7bc4b4[_0x120bef(0x1ee)]){let _0xd41b8=se(_0x2193ba[_0x120bef(0x199)],_0x5edbe0[_0x120bef(0x12a)]);_0x5304d0[_0xd41b8]=_0x5edbe0[_0x120bef(0x222)];for(let _0x10a791 of _0x5edbe0[_0x120bef(0x222)]){let _0x3a7a25=_0x172b2c[_0x10a791];if(_0x3a7a25)_0x3a7a25[_0xd41b8]=void 0x0;else{let _0x92b9dc={};_0x92b9dc[_0xd41b8]=void 0x0,_0x172b2c[_0x10a791]=_0x92b9dc;}}}Object[_0x120bef(0x1ed)](_0x5304d0)['length']>ce&&(_0x235ae8(!0x1),_0x237f41(),_0x790bcc({'method':'pauseNetworkLogging','version':_0x58a2c8,'args':[_0x2193ba]}));}if(_0x7bc4b4[_0x120bef(0x13e)](_0x120bef(0x1da)))for(let _0x4dfe95 of _0x7bc4b4[_0x120bef(0x1da)]){let _0x6d994e=_0x172b2c[_0x4dfe95];if(!!_0x6d994e)for(var _0x2861db of Object[_0x120bef(0x1ed)](_0x6d994e)){let _0x2a88bd=_0x5304d0[_0x2861db];for(let _0x1f7622 of _0x2a88bd){let _0x3057d0=_0x172b2c[_0x1f7622];_0x3057d0&&delete _0x3057d0[_0x2861db],Object[_0x120bef(0x1ed)](_0x3057d0)[_0x120bef(0x1d8)]||delete _0x172b2c[_0x1f7622];}delete _0x5304d0[_0x2861db];}}}}),_0x2193ba=_0x13d90d[_0x8f5d11(0x1e0)],_0x593e0b,_0x382966,_0x21b2ff,_0x18f849,_0x2b231e=me(_0x2193ba['tool']);function _0x235ae8(_0x27a043){_0x5a0232!==_0x27a043&&(_0x27a043===!0x0?(_0x21b2ff=_0x21b2ff||pe(_0x13d90d,_0x2193ba,_0x58a2c8,_0x790bcc,_0x5304d0,_0x267bde,_0x2b231e,_0x2a2f92),_0x18f849=_0x18f849||le(_0x13d90d,_0x790bcc,_0x58a2c8,_0x2193ba,_0x267bde),_0x593e0b=de(_0x13d90d,_0x21b2ff,_0x18f849,_0x2b231e),_0x382966=ue(_0x13d90d,_0x21b2ff,_0x2b231e),_0x5a0232=!0x0):_0x27a043===!0x1&&(_0x593e0b(),_0x382966(),_0x5a0232=!0x1));}_0x235ae8(!0x0);let _0x4aaf8;_0x505554===_0x8f5d11(0x216)&&_0x13d90d['TURBOPACK']&&_0x5dc7b0&&_0x5dc7b0['nextJsDistDir']&&(_0x4aaf8={'nextJsDistDir':_0x5dc7b0[_0x8f5d11(0x1ec)]}),_0x790bcc({'method':_0x8f5d11(0x1b3),'version':_0x58a2c8,'args':[_0x2193ba,_0x4aaf8]});})(globalThis,'127.0.0.1',_0x31016d(0x169),_0x31016d(0x1b1),_0x31016d(0x1d1),_0x31016d(0x1bd),_0x31016d(0x1a6),[\"localhost\",\"127.0.0.1\",\"example.cypress.io\",\"10.0.2.2\",\"MacBook-Air\",\"192.168.254.101\"],'','1',_0x31016d(0x207),{\"nextJsDistDir\":\".next-m\\\\dev\"});function ue(_0x4c263c,_0x22b2cb,_0x55bb18){const _0x4e4972=_0x31016d;if(_0x4c263c['XMLHttpRequest']&&_0x4c263c[_0x4e4972(0x21b)][_0x4e4972(0x16c)]){let _0xd7686b=_0x4c263c[_0x4e4972(0x21b)][_0x4e4972(0x16c)][_0x4e4972(0x1b6)],_0x5d92e=_0x4c263c[_0x4e4972(0x21b)]['prototype'][_0x4e4972(0x18d)],_0x4bcb3e=_0x4c263c['XMLHttpRequest'][_0x4e4972(0x16c)][_0x4e4972(0x158)];return _0xd7686b&&_0x5d92e&&_0xd7686b[_0x4e4972(0x17f)]()[_0x4e4972(0x203)](_0x4e4972(0x1bb))!==-0x1?(_0x4c263c['XMLHttpRequest'][_0x4e4972(0x16c)][_0x4e4972(0x1b6)]=function(_0x41c6e6,_0x7bca5a){const _0x2fd075=_0x4e4972;let _0x667412=this[q]=this[q]||{};return _0x667412[_0x2fd075(0x156)]=_0x41c6e6,_0x667412[_0x2fd075(0x209)]=_0x7bca5a,_0xd7686b[_0x2fd075(0x146)](this,arguments);},_0x4c263c[_0x4e4972(0x21b)]['prototype'][_0x4e4972(0x18d)]=function(){const _0x2cfdb3=_0x4e4972;let _0x92b5c9=te(_0x55bb18);return this[_0x2cfdb3(0x14f)](_0x2cfdb3(0x196),()=>{const _0x5db83f=_0x2cfdb3;var _0xbe197f,_0x22a11f;if(this[_0x5db83f(0x171)]===0x4){let _0x57729e=this[_0x5db83f(0x147)](_0x5db83f(0x1cf)),_0x29497b=_0x57729e&&_0x57729e['indexOf'](ee)!==-0x1?ne(this[_0x5db83f(0x208)],ee):this[_0x5db83f(0x208)],_0x3e43bf=oe((_0xbe197f=this[q])==null?void 0x0:_0xbe197f[_0x5db83f(0x163)]),_0x3b02cc=_0x3e43bf?ne(arguments[0x0],_0x3e43bf):arguments[0x0],_0x674f82=(_0x22a11f=this[_0x5db83f(0x159)])==null?void 0x0:_0x22a11f['toString']();_0x22b2cb({'stack':_0x92b5c9,'status':_0x674f82,'url':this[q][_0x5db83f(0x209)],'method':this[q]['method'],'request':_0x3b02cc,'response':_0x29497b});}}),_0x5d92e['apply'](this,arguments);},_0x4bcb3e&&(_0x4c263c[_0x4e4972(0x21b)][_0x4e4972(0x16c)][_0x4e4972(0x158)]=function(_0x4b48bf,_0x4cf43c){const _0x9d7cdf=_0x4e4972;let _0x56c0aa=this[q]=this[q]||{},_0x5bd495=_0x56c0aa['headers']=_0x56c0aa[_0x9d7cdf(0x163)]||{};_0x5bd495[_0x4b48bf]=_0x4cf43c,_0x4bcb3e[_0x9d7cdf(0x146)](this,arguments);}),()=>{const _0x4b9072=_0x4e4972;_0x4c263c['XMLHttpRequest']['prototype'][_0x4b9072(0x1b6)]=_0xd7686b,_0x4c263c[_0x4b9072(0x21b)][_0x4b9072(0x16c)]['send']=_0x5d92e,_0x4c263c[_0x4b9072(0x21b)]['prototype'][_0x4b9072(0x158)]=_0x4bcb3e;}):()=>{};}}function de(_0x5919d4,_0x451c41,_0x462ce5,_0x20987b){const _0x3d792b=_0x31016d;let _0x5e2672=_0x5919d4['fetch'];if(_0x5919d4['Response']&&_0x5919d4[_0x3d792b(0x133)][_0x3d792b(0x16c)]&&_0x5e2672[_0x3d792b(0x17f)]()[_0x3d792b(0x203)](_0x3d792b(0x1bb))!==-0x1){let _0x200744=function(){const _0x4f7c93=_0x3d792b;return _0x5919d4[_0x4f7c93(0x10f)]=function(..._0x87139b){const _0x6195e3=_0x4f7c93;var _0x4bd97a;let [_0x161b53,_0x3c30d4]=_0x87139b,_0x3d78d5=_0x3c30d4&&_0x3c30d4[_0x6195e3(0x156)]?_0x3c30d4[_0x6195e3(0x156)]:_0x6195e3(0x11c),_0x44a4f1=te(_0x20987b),_0x2938f9=_0x87139b&&_0x87139b['length']>0x0&&((_0x4bd97a=_0x87139b[0x1])==null?void 0x0:_0x4bd97a['headers']),_0x5cfffd=oe(_0x2938f9),_0x3ba5f2=_0x3c30d4!=null&&_0x3c30d4[_0x6195e3(0x1dd)]?ne(_0x3c30d4['body'],_0x5cfffd):_0x3c30d4==null?void 0x0:_0x3c30d4[_0x6195e3(0x1dd)];return _0x5e2672[_0x6195e3(0x146)](this,_0x87139b)[_0x6195e3(0x12d)](_0x4825a1=>(_0x4825a1[q]={'method':_0x3d78d5,'fetchStack':_0x44a4f1,'request':_0x3ba5f2},_0x4825a1));},()=>_0x5919d4[_0x4f7c93(0x10f)]=_0x5e2672;},_0x5a6487=function(_0x4d7c05,_0x14b69e=_0xedd18b=>_0xedd18b){const _0x4d5067=_0x3d792b;let _0x11b698=_0x5919d4[_0x4d5067(0x133)][_0x4d5067(0x16c)][_0x4d7c05];return _0x11b698?(_0x5919d4[_0x4d5067(0x133)]['prototype'][_0x4d7c05]=async function(){const _0x1a4dd5=_0x4d5067;var _0x32b3f6;let _0x50df32=te(_0x20987b),_0x48c0f5;try{_0x48c0f5=await _0x11b698[_0x1a4dd5(0x146)](this,arguments);}catch(_0x4394b5){throw _0x462ce5(_0x4394b5,_0x50df32),_0x4394b5;}let _0x1216a4=this[q];return _0x1216a4&&_0x451c41({'stack':_0x50df32,'fetchStack':_0x1216a4[_0x1a4dd5(0x1e4)],'url':this[_0x1a4dd5(0x209)],'status':(_0x32b3f6=this[_0x1a4dd5(0x159)])==null?void 0x0:_0x32b3f6[_0x1a4dd5(0x17f)](),'request':_0x1216a4[_0x1a4dd5(0x17b)],'response':_0x14b69e(_0x48c0f5),'method':_0x1216a4[_0x1a4dd5(0x156)]}),_0x48c0f5;},()=>_0x5919d4[_0x4d5067(0x133)][_0x4d5067(0x16c)][_0x4d7c05]=_0x11b698):()=>{};};var _0x91ec9e=_0x200744,_0x49cdcf=_0x5a6487;let _0x1ed6e1=[_0x200744(),_0x5a6487('json'),_0x5a6487(_0x3d792b(0x1a2)),_0x5a6487('blob',_0x4f9874=>({'blob':{'size':_0x4f9874[_0x3d792b(0x129)],'type':_0x4f9874[_0x3d792b(0x172)]}})),_0x5a6487(_0x3d792b(0x173),_0x3e521a=>({'arrayBuffer':{'byteLength':_0x3e521a[_0x3d792b(0x229)]}}))];return()=>_0x1ed6e1['forEach'](_0x108544=>_0x108544());}return()=>{};}function te(_0xcd9302){const _0xeb5106=_0x31016d;try{let _0x3ef478=Error['stackTraceLimit'];Error[_0xeb5106(0x134)]=_0xcd9302;let _0x40237d=new Error()[_0xeb5106(0x12a)];return Error[_0xeb5106(0x134)]=_0x3ef478,_0x40237d;}catch{return'';}}function se(_0x405fff,_0xb42c1b){return _0xb42c1b['replace'](/\\?t=\\d+/g,'');}var fe=['_devMiddlewareManifest.json',_0x31016d(0x154),_0x31016d(0x17c)];function he(_0x49f981){const _0x3431a7=_0x31016d;return!!(typeof _0x49f981==_0x3431a7(0x121)&&fe[_0x3431a7(0x18a)](_0x3e0a79=>_0x49f981[_0x3431a7(0x203)](_0x3e0a79)!==-0x1));}function _0x3fdf(){const _0xafa9a=['[object\\x20BigInt]','body','trace','error','_console_ninja_session','global','find','reducePolicy','fetchStack','modules','_objectToString','_isSet','_setNodeExpandableState','totalStrLength','_isPrimitiveWrapperType','_p_length','nextJsDistDir','keys','blacklistEntries','astro','_addProperty','versions','getOwnPropertyDescriptor','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host,\\x20see\\x20','entries','noFunctions','_attemptToReconnectShortly','_WebSocket','args','getOwnPropertyNames','node','_type','array','2887608TYjERo','import(\\x27path\\x27)','_maxConnectAttemptCount','Boolean','capped','stringify','indexOf','forEach','_isMap','6970581OByuXw',{\"resolveGetters\":false,\"defaultLimits\":{\"props\":100,\"elements\":100,\"strLength\":51200,\"totalStrLength\":51200,\"autoExpandLimit\":5000,\"autoExpandMaxDepth\":10},\"reducedLimits\":{\"props\":5,\"elements\":5,\"strLength\":256,\"totalStrLength\":768,\"autoExpandLimit\":30,\"autoExpandMaxDepth\":2},\"reducePolicy\":{\"perLogpoint\":{\"reduceOnCount\":50,\"reduceOnAccumulatedProcessingTimeMs\":100,\"resetWhenQuietMs\":500,\"resetOnProcessingTimeAverageMs\":100},\"global\":{\"reduceOnCount\":1000,\"reduceOnAccumulatedProcessingTimeMs\":300,\"resetWhenQuietMs\":50,\"resetOnProcessingTimeAverageMs\":100}}},'response','url','warn','getOwnPropertySymbols','port','_inBrowser','_allowedToSend','_isUndefined','undefined','_ninjaInstallGlobalErrorHandler','getter','HTMLAllCollection','_blacklistedProperty','7gbEeSe','next.js','unshift','boolean','angular','toLowerCase','XMLHttpRequest','cappedProps','_treeNodePropertiesAfterFullValue','push','log','funcName','timeStamp','files','_undefined','1423156DzpvbT','String','_addLoadNode','NEXT_RUNTIME','charAt','byteLength','_setNodeId','[object\\x20Array]','ReadableStream','content-type','message','_ws','expressionsToEvaluate','application/json','performance','autoExpandPreviousObjects','join','reduceOnAccumulatedProcessingTimeMs','autoExpand','_connected','fromCharCode','count','_ninjaIgnoreError','Buffer','_inNextEdge','fetch','match','test','_isArray','remix','function','_consoleNinjaAllowedToStart','host','onclose','[object\\x20Date]','Number','valueOf','parse','GET','onmessage','autoExpandPropertyCount','eventReceivedCallback','hostname','string','reduceLimits','name','osName','props','autoExpandLimit','env','dockerizedApp','size','stack','_WebSocketClass','_addFunctionsNode','then','reducedLimits','_connectToHostNow','nodeModules','_numberRegExp','_sortProps','Response','stackTraceLimit','origin','console','_sendErrorMessage','failed\\x20to\\x20find\\x20and\\x20load\\x20WebSocket','resetOnProcessingTimeAverageMs','NEGATIVE_INFINITY','allStrLength','_regExpToString','_Symbol','hasOwnProperty','Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','isExpressionToEvaluate','[object\\x20Map]','_setNodeLabel','_p_','_property','index','apply','getResponseHeader','...','sortProps','_disposeWebsocket','_cleanNode','concat','call','updateNetworkLoggingConfig','addEventListener','slice','strLength','_processTreeNodeResult','negativeZero','.hot-update.json','_reconnectTimeout','method','[object\\x20Set]','setRequestHeader','status','serialize','10.0.2.2','includes','FormData','level','_webSocketErrorDocsLink','number','symbol','bigint','headers',',\\x20see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','default','_p_name','now','gateway.docker.internal','51718','_extendedWarning','perLogpoint','prototype','positiveInfinity','perf_hooks','_hasMapOnItsPath','replace','readyState','type','arrayBuffer','split','_setNodePermissions','ws://','onopen','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20restarting\\x20the\\x20process\\x20may\\x20help;\\x20also\\x20see\\x20','catch','Map','request','__nextjs_original-stack-frame','ninjaSuppressConsole','_getOwnPropertyNames','toString','substr','null','_connectAttemptCount','hits','_getOwnPropertyDescriptor','nan','react-native','expo','resolveGetters','time','some','object','_capIfString','send','value','_setNodeExpressionPath','24uUpHsz','_propertyName','_isNegativeZero','emulator','logger\\x20websocket\\x20error','_getOwnPropertySymbols','readystatechange','process','startsWith','tool','autoExpandMaxDepth','toUpperCase','android','unref','unknown','Set','_keyStrRegExp','background:\\x20rgb(30,30,30);\\x20color:\\x20rgb(255,213,92)','text','hrtime','parent','date','1793271751989','126044UeASWt','elements','_additionalMetadata','getWebSocketClass','https://tinyurl.com/37x8b79t','pop','_HTMLAllCollection','data','RegExp','WebSocket',\"c:\\\\Users\\\\johnc\\\\.vscode\\\\extensions\\\\wallabyjs.console-ninja-1.0.545\\\\node_modules\",'captureRequests','networkLoggingHandlerInstalled','ExpoDevice','_isPrimitiveType','open','reduceOnCount','\\x20server','_allowedToConnectOnSend','setter','native\\x20code','depth','next.js','return\\x20import(url.pathToFileURL(path.join(nodeModules,\\x20\\x27ws/index.js\\x27)).toString());','resetWhenQuietMs','_socket','edge','TypedArray','1423608yfJgoh','path','see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','Symbol','_triedToInstallNetworkLoggingHandler','_connecting','root_exp_id','Error','1678908CNtogm','_treeNodePropertiesBeforeFullValue','current','defaultLimits','Content-Type','_quotedRegExp','1.0.0','failed\\x20to\\x20connect\\x20to\\x20host:\\x20','location','URLSearchParams','%c\\x20Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','bind','constructor','length','close','openFiles','136315WzVnhg'];_0x3fdf=function(){return _0xafa9a;};return _0x3fdf();}function le(_0x182c58,_0x2efd06,_0xb02484,_0x5716f7,_0x493202){return(_0x1456d4,_0x3419f4)=>{const _0x334750=_0x7df1;_0x182c58[_0x334750(0x211)]&&(_0x182c58[_0x334750(0x10c)]=_0x1456d4);let _0x42d31b=String[_0x334750(0x10a)](0xa),_0x5b5a16=_0x3419f4['split'](_0x42d31b);_0x5b5a16[_0x334750(0x1d8)]>0x2&&_0x5b5a16['splice'](0x0,0x3),_0x3419f4=_0x1456d4[_0x334750(0x12a)][_0x334750(0x174)](_0x42d31b)[0x0]+_0x42d31b+_0x5b5a16['join'](_0x42d31b),_0x2efd06({'method':_0x334750(0x1df),'version':_0xb02484,'args':[{'ts':Date[_0x334750(0x167)](),'session':_0x5716f7,'message':_0x1456d4[_0x334750(0x22e)]||'','stack':_0x3419f4,'generatedStack':void 0x0,'stackTraceLimit':Error[_0x334750(0x134)],'origin':_0x493202}]});};}function pe(_0x319cd6,_0x3a0736,_0x5e2c25,_0x3a8d3b,_0x440b45,_0x5a546d,_0x123d82,_0x35fb34){let _0xcd9497;return({stack:_0xec365f,url:_0x4d535a,status:_0x9abc75,response:_0x26d158,method:_0x4ff35d,fetchStack:_0x100350,request:_0x45fb74})=>{const _0x36fd73=_0x7df1;if(he(_0x4d535a))return;let _0x3ebce1=_0x100350?_0xec365f+'\\x0a'+_0x100350:_0xec365f;if(_0x440b45[se(_0x3a0736[_0x36fd73(0x199)],_0x3ebce1)])return;let _0x57026a={'url':_0x4d535a,'status':_0x9abc75,'method':_0x4ff35d,'request':_0x45fb74,'response':_0x26d158};_0xcd9497=_0xcd9497||K(_0x319cd6,!0x1,{'hits':{},'ts':{}},_0x5e2c25,_0x35fb34);let _0x6bb3ee=_0xcd9497('log','network',Date['now'](),_0x3a0736,[_0x57026a]);_0x6bb3ee[_0x36fd73(0x1f8)][0x0][_0x36fd73(0x1f8)][0x0][_0x36fd73(0x125)]['push']({'name':_0x36fd73(0x12a),'type':_0x36fd73(0x121),'value':_0xec365f}),_0x6bb3ee['args'][0x0][_0x36fd73(0x1f8)][0x0][_0x36fd73(0x125)][_0x36fd73(0x21e)]({'name':_0x36fd73(0x1e4),'type':'string','value':_0x100350}),_0x5a546d&&(_0x6bb3ee[_0x36fd73(0x1f8)][0x0][_0x36fd73(0x135)]=_0x5a546d),_0x6bb3ee[_0x36fd73(0x1f8)][0x0]['stackTraceLimit']=_0x123d82,_0x3a8d3b(_0x6bb3ee);};}var _e=['Blob','ArrayBuffer',_0x31016d(0x1c2),'DataView',_0x31016d(0x15d),_0x31016d(0x1d4),_0x31016d(0x22c)];function ne(_0x56fab1,_0x41be26){const _0x3d085d=_0x31016d;if(typeof _0x56fab1==_0x3d085d(0x121)){try{if(_0x41be26&&_0x41be26['toLowerCase']()===ee)return JSON['parse'](_0x56fab1);}catch{}return _0x56fab1;}if(typeof _0x56fab1=='object'&&(_0x56fab1==null?void 0x0:_0x56fab1[_0x3d085d(0x1d7)][_0x3d085d(0x123)])){let _0x25f6ab=_0x56fab1==null?void 0x0:_0x56fab1[_0x3d085d(0x1d7)]['name'];return _0x25f6ab&&_e['some'](_0x566f71=>_0x566f71===_0x25f6ab)?'<'+_0x25f6ab+'>':_0x56fab1;}return _0x56fab1;}function me(_0x18965b){return _0x18965b?_0x18965b==='next.js\\x20browser'?0x32:_0x18965b==='angular\\x20browser'?0x64:0x1e:0x1e;}function oe(_0x14f775){const _0x1649a1=_0x31016d;var _0x2d4296;return _0x14f775?(_0x2d4296=Object[_0x1649a1(0x1f4)](_0x14f775)[_0x1649a1(0x1e2)](([_0x41dc45,_0xd1b5e0])=>(_0x41dc45==null?void 0x0:_0x41dc45[_0x1649a1(0x21a)]())===_0x1649a1(0x22d)))==null?void 0x0:_0x2d4296[0x1]:void 0x0;}");
} catch (e) {}
"trimStart" in String.prototype || (String.prototype.trimStart = String.prototype.trimLeft), "trimEnd" in String.prototype || (String.prototype.trimEnd = String.prototype.trimRight), "description" in Symbol.prototype || Object.defineProperty(Symbol.prototype, "description", {
    configurable: !0,
    get: function() {
        var t = /\((.*)\)/.exec(this.toString());
        return t ? t[1] : void 0;
    }
}), Array.prototype.flat || (Array.prototype.flat = function(t, r) {
    return r = this.concat.apply([], this), t > 1 && r.some(Array.isArray) ? r.flat(t - 1) : r;
}, Array.prototype.flatMap = function(t, r) {
    return this.map(t, r).flat();
}), Promise.prototype.finally || (Promise.prototype.finally = function(t) {
    if ("function" != typeof t) return this.then(t, t);
    var r = this.constructor || Promise;
    return this.then(function(n) {
        return r.resolve(t()).then(function() {
            return n;
        });
    }, function(n) {
        return r.resolve(t()).then(function() {
            throw n;
        });
    });
}), Object.fromEntries || (Object.fromEntries = function(t) {
    return Array.from(t).reduce(function(t, r) {
        return t[r[0]] = r[1], t;
    }, {});
}), Array.prototype.at || (Array.prototype.at = function(t) {
    var r = Math.trunc(t) || 0;
    if (r < 0 && (r += this.length), !(r < 0 || r >= this.length)) return this[r];
}), Object.hasOwn || (Object.hasOwn = function(t, r) {
    if (null == t) throw new TypeError("Cannot convert undefined or null to object");
    return Object.prototype.hasOwnProperty.call(Object(t), r);
}), "canParse" in URL || (URL.canParse = function(t, r) {
    try {
        return !!new URL(t, r);
    } catch (t) {
        return !1;
    }
});
}),
]);

//# sourceMappingURL=0lq9_next_dist_113czthrowxhn._.js.map
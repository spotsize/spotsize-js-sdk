import babel from 'rollup-plugin-babel'
import {terser} from 'rollup-plugin-terser'
import commonjs from '@rollup/plugin-commonjs'

import {nodeResolve} from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';


const moduleContext = (id) => {
    if (id.includes('@stomp/stompjs')) {
        return 'window';
    }
}

const babelConfig = {
    babelrc: false,
    runtimeHelpers: true,
    presets: [
        '@babel/preset-env'
    ],
    plugins: [
        ["@babel/plugin-transform-runtime", {
            "regenerator": true
        }]
    ]
}

const staging = {
    backendURL: 'https://api-staging.spotsize.io',
    webSocketURL: 'wss://api-staging.spotsize.io/ws/recommendations'
}

const dev = {
    backendURL: 'https://api-dev.spotsize.io',
    webSocketURL: 'wss://api-dev.spotsize.io/ws/recommendations'
}

export default [
    {
        input: 'lib/index.js',
        output: [
            {
                file: 'dist/spotsize.min.js',
                format: 'iife',
                name: 'spotsize',
                exports: 'named'
            }
        ],
        moduleContext: moduleContext,
        plugins: [
            replace({
                values: {
                    _BACKEND_: staging.backendURL,
                    _SOCKET_: staging.webSocketURL,
                },
                preventAssignment: true
            }),
            nodeResolve(),
            commonjs(),
            babel(babelConfig),
            terser({compress: {drop_console: true}}),
        ]
    },
    {
        input: 'lib/index.js',
        output: [
            {
                file: 'dist/spotsize.dev.min.js',
                format: 'iife',
                name: 'spotsize',
                exports: 'named'
            }
        ],
        moduleContext: moduleContext,
        plugins: [
            replace({
                values: {
                    _BACKEND_: dev.backendURL,
                    _SOCKET_: dev.webSocketURL,
                },
                preventAssignment: true
            }),
            nodeResolve(),
            commonjs(),
            babel(babelConfig),
            terser({compress: {drop_console: false}}),
        ]
    }
]

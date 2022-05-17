import babel from 'rollup-plugin-babel'
import {terser} from 'rollup-plugin-terser'
import commonjs from '@rollup/plugin-commonjs'

import {nodeResolve} from '@rollup/plugin-node-resolve';

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
            nodeResolve(),
            commonjs(),
            babel(babelConfig),
           // terser({compress: {drop_console: true}}),
        ]
    }
]

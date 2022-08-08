// Based upon https://github.com/prc5/react-zoom-pan-pinch

import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import del from "rollup-plugin-delete";
import dts from "rollup-plugin-dts";
import pkg from "./package.json";

export default defineConfig([
    {
        input: pkg.source,
        output: [
            {
                file: pkg.main,
                format: "cjs",
                exports: "named",
                sourcemap: true
            },
            {
                file: pkg.module,
                format: "es",
                exports: "named",
                sourcemap: true
            }
        ],
        plugins: [
            del({
                targets: ["dist/*"]
            }),
            babel({
                exclude: "node_modules/**",
                babelHelpers: "runtime"
            }),
            typescript()
        ],
        external: [/@babel\/runtime/u]
    },
    {
        input: pkg.source,
        output: [
            {
                file: pkg.types,
                format: "es"
            }
        ],
        plugins: [
            dts({
                compilerOptions: {
                    baseUrl: "./src"
                }
            })
        ]
    }
]);


import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    // Next 16 ships the React Compiler-era rules as errors. The flagged
    // patterns here (Date.now() in a ref init, setState-in-effect) are
    // intentional in this codebase, so report them as warnings.
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "public/sw.js", "public/workbox-*.js"],
  },
];

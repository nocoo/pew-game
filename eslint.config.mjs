import { createRequire } from "node:module";
import nextConfig from "eslint-config-next";

// eslint-config-next sets `settings.react.version: "detect"`, which makes
// eslint-plugin-react@7.37.5 call the removed `context.getFilename()` API and
// crash under ESLint 10. Pinning the resolved React version skips that detection
// path until upstream ships an ESLint 10 compatible eslint-plugin-react.
const reactVersion = createRequire(import.meta.url)("react/package.json").version;

const eslintConfig = [
  ...nextConfig,
  {
    settings: {
      react: { version: reactVersion },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;

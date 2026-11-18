module.exports = {
  root: true,
  extends: ["expo"],
  ignorePatterns: ["archive/**"],
  rules: {
    // eslint-config-expo 58 enables React Compiler's lint rules. Morpheus is
    // not compiled with React Compiler and relies on patterns these rules
    // reject (latest-value refs read during render, Reanimated shared value
    // writes). Keep them off until a deliberate React Compiler migration.
    "react-hooks/refs": "off",
    "react-hooks/immutability": "off",
    "react-hooks/globals": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/use-memo": "off",
    "react-hooks/preserve-manual-memoization": "off",
  },
};

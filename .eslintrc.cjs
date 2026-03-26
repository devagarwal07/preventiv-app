module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true,
        browser: true
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    plugins: ["@typescript-eslint", "import"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "prettier"
    ],
    settings: {
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
                project: "./tsconfig.json"
            }
        }
    },
    ignorePatterns: ["dist", "build", "coverage", ".next", ".expo", "node_modules"]
};

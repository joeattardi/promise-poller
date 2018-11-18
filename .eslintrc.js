module.exports = {
    "env": {
        "node": true,
        "es6": true,
        "jasmine": true
    },
    "plugins": ["prettier"],
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [2, 2],
        "linebreak-style": [2, "unix"],
        "semi": [2, "always"],
        "no-console": 0,
        "prettier/prettier": "error"
    }
};

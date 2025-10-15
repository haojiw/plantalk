// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
        'expo-router/babel', // if you’re using expo-router
        ['module-resolver', { alias: { '@': './src' } }],
        ],
    };
};

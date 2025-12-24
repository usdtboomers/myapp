module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
    require('postcss-flexbugs-fixes'),
    require('postcss-preset-env')({
      stage: 3,
      features: {
        'custom-properties': false,
      },
    }),
  ],
};

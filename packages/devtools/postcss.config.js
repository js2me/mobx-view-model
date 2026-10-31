export default {
  plugins: {
    'postcss-nested': {}, // Для поддержки вложенности (&)
    './postcss-increase-specificity.js': {
      repeat: 5,
    },
  },
};

/* eslint no-await-in-loop: 0 */

module.exports = async function pipeline (ctx, proms) {
  for (let p of proms) await p(ctx);
};

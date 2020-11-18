
let { renderChildren } = require('./index');

module.exports = async function rawChildren (ctx) {
  let art = ctx.doc.querySelector('article');
  renderChildren(ctx, art, ctx.node.children);
};

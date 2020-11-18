
module.exports = async function lang ({ doc, meta }) {
  doc.documentElement.setAttribute('lang', meta.lang || 'en');
};

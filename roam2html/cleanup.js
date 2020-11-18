
module.exports = async function cleanup ({ doc }) {
  Array.from(doc.querySelectorAll('*')).forEach(el => {
    el.getAttributeNames().forEach(n => el.removeAttribute(n));
  });
};

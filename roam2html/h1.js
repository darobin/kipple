
module.exports = async function h1 ({ doc, node }) {
  let h = doc.createElement('h1')
    , art = doc.querySelector('article')
  ;
  h.textContent = node.title;
  art.appendChild(h);
};

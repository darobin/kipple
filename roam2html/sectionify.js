
let { renameElement } = require('./index');

// Here, we ignore the value of the heading and just treat it from depth.
// The assumption is that the heading node in Roam will have the section content as its children.
module.exports = async function sectionify ({ doc }) {
  Array.from(doc.querySelectorAll('div[data-kipple-roam-heading]')).forEach(div => {
    div = renameElement(div, 'section');
    let cur = div
      , lvl = 2
    ;
    while (cur && cur.parentNode) {
      if (cur.parentNode.localName === 'section') lvl++;
      cur = (cur.parentNode.localName === 'article') ? null : cur.parentNode;
    }
    let h = doc.createElement(`h${lvl}`);
    h.setAttribute(`data-kipple-roam-string`, div.getAttribute('data-kipple-roam-string'));
    div.insertBefore(h, div.firstChild);
    div.removeAttribute('data-kipple-roam-string');
    div.removeAttribute('data-kipple-roam-heading');
  });
};

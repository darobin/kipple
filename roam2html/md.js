
let remark = require('remark')
  , prism = require('rehype-prism')
  , rehype = require('remark-rehype')
  , math = require('remark-math')
  , katex = require('rehype-katex')
  , stringify = require('rehype-stringify')
;

// Here, we ignore the value of the heading and just treat it from depth.
// The assumption is that the heading node in Roam will have the section content as its children.
module.exports = async function sectionify ({ doc }) {
  let md = remark()
    .use(math)
    .use(rehype)
    .use(katex)
    .use(prism)
    .use(stringify)
  ;
  Array.from(doc.querySelectorAll('[data-kipple-roam-string]')).forEach(el => {
    let html = md.processSync(el.getAttribute('data-kipple-roam-string')).toString()
      , div = doc.createElement('div')
    ;
    div.innerHTML = html;
    // if we only get one big <p> back we take children of that
    let parent = (div.childNodes.length > 1) ? div : div.firstChild;
    while (parent.hasChildNodes()) el.insertBefore(parent.lastChild, el.firstChild);
    el.removeAttribute('data-kipple-roam-string');
  });
};

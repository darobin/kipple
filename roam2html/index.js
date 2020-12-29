/* eslint global-require: 0 */

let { html, nothing } = require('@popeindustries/lit-html-server')
  , { unsafeHTML } = require('@popeindustries/lit-html-server/directives/unsafe-html')
  , { JSDOM } = require('jsdom')
  , pipeline = require('../pipeline')
;

// XXX:
//  - produce a real section outline that's correct using headings
//  - parse the Markdown, enriched
//  - grab the images (or just link)
//  - Try to process references when there are embeds, eg. if it's an embed from a book or article
//    then that has to become a bibref which will get included at the end (and will get a
//    footnote).
//  - include CSS, make sure it's printable

class RoamRenderer {
  constructor (data) {
    let nodeIndex = indexNodes(data);
    this.rootNodesByName = nodeIndex.rootNodesByName;
    this.rootMetadata = nodeIndex.rootMetadata;
    this.nodesByUID = nodeIndex.nodesByUID;
  }
  async render (account, source, item) {
    let node = this.rootNodesByName[item]
      , meta = this.rootMetadata[item]
    ;
    if (!node) throw new Error(`Cannot find item "${item}" in roam ${account}/${source}`);
    let ctx = {
      node,
      meta,
      dom: new JSDOM(`<!DOCTYPE html>
        <html dir="ltr">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width">
            <title></title>
          </head>
          <body>
            <article></article>
          </body>
        </html>
      `)
    };
    ctx.doc = ctx.dom.window.document;
    await pipeline(
      ctx,
      [
        require('./lang'),
        require('./title'),
        require('./style'),
        require('./h1'),
        require('./raw-children'),
        require('./sectionify'),
        require('./md'),
        // XXX:
        //  - P-ify (and UL)
        //  - {{things}}, [[Link Thing]], #hashtag
        //  - embeds that take up the full node might replace it?
        //  - footnotes from embeds
        // end
        // require('./cleanup'),
      ]
    );
    return ctx.dom.serialize();
  }
  renderChildren (node, mode) {
    let embedOnlyRx = /^\s*\{\{\[\[embed]]:\s*\(\((.+)\)\)}}\s*$/;
    if (!node.children) return nothing;
    return node.children.map(n => {
      if (n.heading) {
        return html`<section>
          ${unsafeHTML(`<h${n.heading + 1}>`)}${this.renderNode(n.string)}${unsafeHTML(`</h${n.heading + 1}>`)}
          ${this.renderChildren(n)}
        </section>`;
      }
      // XXX: need to turn this into a reference somehow, depending on the type of the ref
      // for instance if the root of the embed has a type, generate a footnote for it
      if (n.string && embedOnlyRx.test(n.string)) {
        let [, uid] = n.string.match(embedOnlyRx)
          , embed = this.nodesByUID[uid]
        ;
        if (!embed) throw new Error(`Failed to find embedded node ${uid}`);
        return this.renderChildren({ children: [embed] }, mode);
      }
      if (mode === 'ul') {
        return html`<li>
          ${this.renderNode(n.string)}
          ${n.children ? html`<ul>${this.renderChildren(n, 'ul')}</ul>` : nothing}
        </li>`;
      }
      if (mode === 'inline') {
        return html`<span>${this.renderNode(n.string)}</span>
        ${n.children ? html`<aside><ul>${this.renderChildren(n, 'ul')}</ul></aside>` : nothing}`;
      }
      return html`<p>
        ${this.renderNode(n.string)}
      </p>
      ${n.children ? html`<ul>${this.renderChildren(n, 'ul')}</ul>` : nothing}`;
    });
  }
  renderNode (str) {
    let inStrong = false
      , inEm = false
      , inCode = false
    ;
    // This is a really shitty MD parser, but it might work better given that Roam has a pretty
    // shitty implementation itself. If this doesn't fly, I can try something with remark.
    // XXX:
    //  - pre blocks
    //  - LaTeX
    //  - inline embeds
    //  - bunch of others
    str = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\{\{\[\[TODO]]}}/g, '<input type="checkbox" disabled>')
      .replace(/\{\{\[\[DONE]]}}/g, '<input type="checkbox" disabled checked>')
      .replace(/__/g, () => {
        if (inEm) {
          inEm = false;
          return '</em>';
        }
        inEm = true;
        return '<em>';
      })
      .replace(/\*\*/g, () => {
        if (inStrong) {
          inStrong = false;
          return '</strong>';
        }
        inStrong = true;
        return '<strong>';
      })
      .replace(/`/g, () => {
        if (inCode) {
          inCode = false;
          return '</code>';
        }
        inCode = true;
        return '<code>';
      })
      .replace(/\{\{\[\[embed]]:\s*\(\((.+)\)\)}}/g, (_, uid) => {
        let embed = this.nodesByUID[uid];
        if (!embed) throw new Error(`Failed to find embedded node ${uid}`);
        return this.renderChildren({ children: [embed] }, 'inline');
      })
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="roam-link">$1</span>')
    ;
    return unsafeHTML(str);
  }
}

function indexNodes (data) {
  let rootNodesByName = {}
    , nodesByUID = {}
    , uid2root = {}
    , rootMetadata = {}
  ;
  data.forEach(node => {
    rootNodesByName[node.title] = node;
    allChildren(node).forEach(kid => {
      if (kid.uid) {
        nodesByUID[kid.uid] = kid;
        uid2root[kid.uid] = node.title;
      }
    });
    let meta = {};
    if (node['create-time']) meta.created = new Date(node['create-time']);
    if (node['edit-time']) meta.lastModified = new Date(node['edit-time']);
    if (node.children) {
      try {
        node.children.forEach(kid => {
          let match = kid.string && kid.string.match(/^\s*\*\*\s*(author|by|date|lang|publisher|retrieved|url|type)\s*\*\*\s*:\s*(.*)/i);
          if (match) {
            let [, key, value] = match;
            key = key.toLowerCase();
            if (key === 'by') key = 'author';
            meta[key] = value;
          }
          else throw new Error('Hammer Time!');
        });
      }
      catch (e) {}
    }
    rootMetadata[node.title] = meta;
  });
  return {
    rootNodesByName,
    nodesByUID,
    uid2root,
    rootMetadata,
  };
}

function allChildren (node) {
  let kids = [];
  if (node.children) {
    Array.prototype.push.apply(kids, node.children);
    node.children.forEach(kid => Array.prototype.push.apply(kids, allChildren(kid)));
  }
  return kids;
}

function renderChildren (ctx, parent, children) {
  (children || []).forEach(kid => {
    let div = ctx.doc.createElement('div');
    Object.keys(kid).forEach(k => {
      if (k === 'children') return renderChildren(ctx, div, kid.children);
      div.setAttribute(`data-kipple-roam-${k}`, kid[k]);
    });
    parent.appendChild(div);
  });
}

function renameElement (el, name) {
  let newEl = el.ownerDocument.createElement(name);
  while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
  for (let atn of el.getAttributeNames()) newEl.setAttribute(atn, el.getAttribute(atn));
  el.parentNode.replaceChild(newEl, el);
  return newEl;
}

module.exports = {
  RoamRenderer,
  renderChildren,
  renameElement,
};


module.exports = async function style ({ doc }) {
  let css = doc.createElement('style');
  css.textContent = `
    .roam-link {
      color: cornflowerblue;
    }
    body {
      margin: 2rem 4rem;
    }
    article {
      max-width: 100ch;
      font-family: "NYTImperial";
      line-height: 1.4;
    }
    h1 {
      font-size: 2.5rem;
      font-family: "NYTCheltenham";
      font-weight: 100;
    }
  `;
  doc.head.appendChild(css);
};

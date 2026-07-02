import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "p",
  "br",
  "div",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "img",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "style"];

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ALLOWED_ATTR },
    allowedSchemes: ["http", "https", "mailto", "tel", "cid"],
    allowedSchemesByTag: { img: ["http", "https", "cid", "data"] },
    allowProtocolRelative: false,
    transformTags: {
      // data: URIs are only allowed on <img> and only for image payloads
      img: (tagName, attribs) => {
        const src = attribs.src ?? "";
        if (/^data:/i.test(src.trim()) && !/^data:image\//i.test(src.trim())) {
          const { src: _dropped, ...rest } = attribs;
          return { tagName, attribs: rest };
        }
        return { tagName, attribs };
      },
    },
  });
}

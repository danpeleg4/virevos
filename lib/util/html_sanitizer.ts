import DOMPurify from "isomorphic-dompurify";

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
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|cid:|data:image\/)/i,
  });
}

import { sanitizeEmailHtml } from "@/lib/util/html_sanitizer";

describe("sanitizeEmailHtml", () => {
  it("keeps allowed formatting tags and attributes", () => {
    const html =
      '<p>Hello <strong>world</strong>, <a href="https://example.com" target="_blank" rel="noopener">link</a></p>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("keeps tables and images with https sources", () => {
    const html =
      '<table><tbody><tr><td><img src="https://example.com/logo.png" alt="logo" /></td></tr></tbody></table>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("strips script tags and their content", () => {
    expect(sanitizeEmailHtml('<p>hi</p><script>alert("x")</script>')).toBe(
      "<p>hi</p>"
    );
  });

  it("strips disallowed tags but keeps their text content", () => {
    expect(sanitizeEmailHtml("<article><p>text</p></article>")).toBe(
      "<p>text</p>"
    );
  });

  it("strips event handler attributes", () => {
    expect(sanitizeEmailHtml('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips javascript: URLs from links", () => {
    expect(sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      "<a>x</a>"
    );
  });

  it("allows mailto, tel and cid schemes on links", () => {
    const html =
      '<a href="mailto:a@b.com">m</a><a href="tel:+123">t</a><a href="cid:part1">c</a>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("rejects data: URLs on links", () => {
    expect(
      sanitizeEmailHtml('<a href="data:text/html,<script>x</script>">x</a>')
    ).toBe("<a>x</a>");
  });

  it("allows data:image URLs on images", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KGgo=" />';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("rejects non-image data: URLs on images", () => {
    expect(
      sanitizeEmailHtml('<img src="data:text/html,<script>x</script>" />')
    ).toBe("<img />");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeEmailHtml('<a href="//evil.com/x">x</a>')).toBe("<a>x</a>");
  });

  it("keeps the style attribute", () => {
    const html = '<p style="color:red">hi</p>';
    expect(sanitizeEmailHtml(html)).toBe(html);
  });

  it("handles empty input", () => {
    expect(sanitizeEmailHtml("")).toBe("");
  });

  it("strips iframe/object/embed vectors entirely", () => {
    expect(
      sanitizeEmailHtml(
        '<iframe src="https://evil.com"></iframe><object data="x"></object><embed src="x" />'
      )
    ).toBe("");
  });
});

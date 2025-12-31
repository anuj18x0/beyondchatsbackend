const sanitizeHtml = (html) => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
};

const extractText = (html) => {
  return html.replace(/<[^>]*>/g, '').trim();
};

module.exports = {
  sanitizeHtml,
  extractText,
};

const RX_BG_IMAGE = /,|[\w-]+\(|\)|'|"/g;
const RX_WHITESPACE = /^\s+/y;

export function parseBackgroundImage(input) {
  RX_BG_IMAGE.lastIndex = 0;
  const result = [];
  parseCommaList({
    func: {
      "url(": () => {
        eatWhitespace();
        result.push({type: "url", url: parseString()});
        eatRightParen();
      },
      "image-set(": () => {
        result.push(parseImageSet());
      }
    }
  });
  return result;

  function eatRightParen() {
    const match = RX_BG_IMAGE.exec(input);
    if (!match || match[0] !== ")") {
      throw new Error("Expected )");
    }
  }

  function parseCommaList(handlers) {
    let match;
    let lastIndex = RX_BG_IMAGE.lastIndex;
    while ((match = RX_BG_IMAGE.exec(input)) !== null) {
      if (lastIndex !== match.index) {
        const keyword = input.slice(lastIndex, match.index).trim();
        if (keyword) {
          handlers?.keyword?.(keyword);
        }
      }
      const token = match[0].toLowerCase();
      if (token.endsWith("(")) {
        const funcHandler = handlers?.func?.[token];
        if (funcHandler) {
          funcHandler();
        } else {
          parseCommaList();
        }
      } else if (token === ",") {
        handlers?.comma?.();
      } else if (token === ")") {
        return;
      } else if (token === '"' || token === "'") {
        RX_BG_IMAGE.lastIndex -= 1;
        const s = parseString();
        if (handlers?.string) {
          handlers.string(s);
        }
      } else {
        // unknown token
      }
      lastIndex = RX_BG_IMAGE.lastIndex;
    }
  }

  function parseImageSet() {
    const result = {type: "image-set", sources: [{}]};
    let currentSource = result.sources[0];
    parseCommaList({
      string: s => {
        currentSource.url = s;
      },
      keyword: kw => {
        currentSource.resolution = kw;
      },
      comma: () => {
        currentSource = {};
        result.sources.push(currentSource);
      },
      func: {
        "url(": () => {
          eatWhitespace();
          currentSource.url = parseString();
          eatRightParen();
        }
      }
    });
    return result;
  }

  function eatWhitespace() {
    RX_WHITESPACE.lastIndex = RX_BG_IMAGE.lastIndex;
    const match = RX_WHITESPACE.exec(input);
    if (match) {
      RX_BG_IMAGE.lastIndex += match[0].length;
    }
  }

  function parseString() {
    const i = RX_BG_IMAGE.lastIndex;
    if (input[i] === "'" || input[i] === '"') {
      return parseQuotedString(input[i], i);
    }
    let j = input.indexOf(")", i);
    if (j === -1) {
      throw new Error("Unclosed function");
    }
    RX_BG_IMAGE.lastIndex = j;
    return input.slice(i, j).trim();
  }

  function parseQuotedString(quote, i) {
    let j = RX_BG_IMAGE.lastIndex;
    do {
      j = input.indexOf(quote, j + 1);
    } while (j !== -1 && input[j - 1] === "\\");
    if (j === -1) {
      throw new Error("Unclosed string");
    }
    RX_BG_IMAGE.lastIndex = j + 1;
    return unquote(input.slice(i + 1, j));
  }
}

const RX_STRING_ESCAPE = /\\([0-9a-fA-F]{1,6})|\\(.)/g;

/**
 * Unquote a quoted string and unescape escaped characters. excluding the surrounding quotes.
 * @param {string} s 
 * @returns {string}
 */
function unquote(s) {
  return s.replace(RX_STRING_ESCAPE, (match, hex, char) => {
    if (hex) {
      const codePoint = parseInt(hex, 16);
      return String.fromCodePoint(codePoint);
    }
    return char;
  });
}


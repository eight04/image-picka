import {ES6StaticEval, ES6Parser} from "espression";

// import {pref} from "./pref.js";
import {escapeVariable, escapePath} from "./escape.js";

export function compileStringTemplate(template) {
  // const compile = pref.get("useExpression") ? expressionCompiler : simpleCompiler;
  const compile = expressionCompiler;
	const re = /\${(.+?)}/g;
	let match, lastIndex = 0;
	const output = [];
	while ((match = re.exec(template))) {
		if (match.index !== lastIndex) {
			output.push({
        type: "static",
        value: template.slice(lastIndex, match.index)
      });
		}
    output.push({
      type: "variable",
      value: compile(match[1]),
      raw: match[1]
    });
		lastIndex = re.lastIndex;
	}
	if (lastIndex !== template.length) {
		const text = template.slice(lastIndex);
		output.push({
      type: "static",
      value: text
    });
	}
	return context => escapePath(
		output.map(node => {
			if (node.type === "static") {
				return node.value;
			}
      const result = node.value(context);
      if (result === undefined) {
        throw new Error(`The filename expression evaluates to undefined: ${node.raw}`);
      }
			return escapeVariable(String(result));
		}).join("")
	);
}

function expressionCompiler(template) {
  const parser = new ES6Parser;
  const ast = parser.parse(template);
  const staticEval = new ES6StaticEval;
  return context => staticEval.evaluate(ast, {Number, String, Math, ...context});
}

// function simpleCompiler(template) {
  // return context => context[template];
// }

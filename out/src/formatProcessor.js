"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const configProperties_1 = require("./configProperties");
const defs_regex_1 = require("./defs_regex");
class FormatProcessor extends configProperties_1.ConfigPropsProvider {
    format(document, range) {
        var _a, _b;
        const configProps = this.getConfigProps(document);
        const startLineNumber = document.lineAt(range.start).lineNumber;
        const endLineNumber = document.lineAt(range.end).lineNumber;
        const commaAfterArgument = ',' + (configProps.spaceAfterArgument ? ' ' : '');
        const generateIndent = (count, snippet, keepAligned) => {
            const tabsSize = configProps.indentSize * count;
            let prepend = '';
            let fillSpacesAfterSnippet = tabsSize;
            if (snippet) {
                prepend += snippet;
                if (keepAligned && snippet.length >= tabsSize) {
                    prepend += configProps.eol;
                }
                else {
                    while (snippet.length >= fillSpacesAfterSnippet) {
                        fillSpacesAfterSnippet += configProps.indentSize;
                    }
                    fillSpacesAfterSnippet -= snippet.length;
                }
            }
            if (configProps.indentSpaces) {
                return prepend + ' '.repeat(fillSpacesAfterSnippet);
            }
            else {
                return prepend + '\t'.repeat(Math.ceil(fillSpacesAfterSnippet / configProps.indentSize));
            }
        };
        const processFragment = (frag) => {
            var _a;
            const [, keyword = frag, rest] = frag.match(/^(\S+)\s+(.*)$/) || [];
            const args = ((_a = rest) === null || _a === void 0 ? void 0 : _a.split(/\s*,\s*/)) || [];
            return { keyword, args };
        };
        const adjustKeywordCase = (keyword, checkRegsOrConds = false) => {
            if (configProps.uppercaseKeywords !== 'auto' && (defs_regex_1.default.keyword.test(keyword) ||
                (checkRegsOrConds && defs_regex_1.default.regsOrConds.test(keyword)))) {
                if (configProps.uppercaseKeywords) {
                    return keyword.toUpperCase();
                }
                else {
                    return keyword.toLowerCase();
                }
            }
            return keyword;
        };
        let output = [];
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; ++lineNumber) {
            let line = document.lineAt(lineNumber);
            if (line.range.isEmpty) {
                continue;
            }
            else if (line.isEmptyOrWhitespace) {
                // trim whitespace-filled lines
                output.push(new vscode.TextEdit(line.range, ''));
                continue;
            }
            let range = new vscode.Range(line.range.start, line.range.end);
            let text = line.text;
            let indentLevel = -1;
            let lineParts = {};
            const commentLineMatch = defs_regex_1.default.commentLine.exec(text);
            if (commentLineMatch) {
                continue;
            }
            const endCommentMatch = defs_regex_1.default.endComment.exec(text);
            if (endCommentMatch) {
                let idx = endCommentMatch.index;
                while (/\s/.test(text[idx - 1])) {
                    idx--;
                }
                range = new vscode.Range(range.start, range.end.translate(0, idx - text.length));
                text = text.substr(0, idx);
            }
            const evalMatch = defs_regex_1.default.evalExpression.exec(text);
            if (evalMatch) {
                const [fullMatch, label, keyword, argument] = evalMatch;
                indentLevel = configProps.baseIndent;
                lineParts.args = [argument];
                lineParts.label = `${fullMatch[0] === '@' ? '@' : ''}${label}`;
                if (keyword[0] === ':') {
                    lineParts.colonAfterLabel = true;
                    lineParts.keyword = keyword.slice(1).trim();
                }
                else {
                    lineParts.keyword = keyword.trim();
                }
                if (lineParts.keyword === '=') {
                    evalMatch.notIndented = !/(\t| {2,})=/.test(fullMatch);
                }
                text = text.replace(fullMatch, '').trim();
            }
            const labelMatch = defs_regex_1.default.labelDefinition.exec(text);
            if (labelMatch) {
                const [fullMatch, label, , colon] = labelMatch;
                indentLevel = configProps.baseIndent;
                lineParts.label = `${fullMatch[0] === '@' ? '@' : ''}${label}`;
                lineParts.colonAfterLabel = (colon === ':');
                text = text.replace(fullMatch, '').trim();
            }
            const moduleLineMatch = defs_regex_1.default.moduleLine.exec(text);
            const macroLineMatch = defs_regex_1.default.macroLine.exec(text);
            const controlKeywordMatch = defs_regex_1.default.controlKeywordLine.exec(text);
            if (moduleLineMatch) {
                const [fullMatch, keyword] = moduleLineMatch;
                indentLevel = configProps.controlIndent;
                lineParts.keyword = keyword.trim();
                lineParts.args = [text.replace(fullMatch, '').trim()];
                text = '';
            }
            else if (macroLineMatch) {
                const [, keyword, firstParam, rest] = macroLineMatch;
                indentLevel = configProps.controlIndent;
                lineParts.keyword = keyword.trim();
                lineParts.firstParam = firstParam;
                lineParts.args = rest ? rest.split(/\s*,\s*/) : [];
                text = '';
            }
            else if (controlKeywordMatch) {
                indentLevel = configProps.controlIndent;
            }
            if (text.trim()) {
                if (indentLevel < 0) {
                    indentLevel = configProps.baseIndent;
                }
                const splitLine = text.split(/\s*\:\s*/);
                if (configProps.splitInstructionsByColon && splitLine.length > 1) {
                    lineParts.fragments = splitLine.map(frag => processFragment(frag.trim()));
                }
                else {
                    const { keyword, args } = processFragment(text.trim());
                    lineParts.keyword = keyword;
                    lineParts.args = args;
                }
            }
            const newText = [];
            if (lineParts.label) {
                const label = `${lineParts.label}${((configProps.colonAfterLabels === 'no-change' && lineParts.colonAfterLabel) ||
                    configProps.colonAfterLabels === true) ? ':' : ''}`;
                if ((_a = evalMatch) === null || _a === void 0 ? void 0 : _a.notIndented) {
                    newText.push(`${label} `);
                }
                else {
                    newText.push(generateIndent(indentLevel, label, true));
                }
            }
            else {
                if (indentLevel < 0) {
                    indentLevel = ((_b = configProps.indentDetector
                        .exec(line.text)) === null || _b === void 0 ? void 0 : _b.filter(Boolean).slice(1).length) || 0;
                }
                newText.push(generateIndent(indentLevel));
            }
            (lineParts.fragments || [{ ...lineParts }]).forEach(({ keyword, firstParam, args = [] }, index) => {
                var _a;
                if (index) {
                    newText.push(configProps.splitInstructionsByColon ?
                        (configProps.eol + generateIndent(indentLevel)) : ': ');
                }
                if (configProps.whitespaceAfterInstruction === 'single-space' || ((_a = evalMatch) === null || _a === void 0 ? void 0 : _a.notIndented)) {
                    newText.push(`${adjustKeywordCase(keyword)} `);
                }
                else if (configProps.whitespaceAfterInstruction === 'tab') {
                    newText.push(`${adjustKeywordCase(keyword)}\t`);
                }
                else {
                    newText.push(generateIndent(1, adjustKeywordCase(keyword)));
                }
                if (firstParam) {
                    newText.push(`${firstParam} `);
                }
                args.forEach((value, idx) => {
                    const matchBrackets = /^[[(]([^\]\)]+)[\]\)]$/.exec(value);
                    if (matchBrackets) {
                        value = `${configProps.bracketType === 'round' ? '(' : '['}${adjustKeywordCase(matchBrackets[1], true)}${configProps.bracketType === 'round' ? ')' : ']'}`;
                    }
                    else {
                        value = adjustKeywordCase(value, true);
                    }
                    newText.push((idx ? commaAfterArgument : '') + value);
                });
            });
            const result = newText.join('').trimEnd();
            output.push(new vscode.TextEdit(range, result));
        }
        return output;
    }
}
exports.FormatProcessor = FormatProcessor;
class Z80DocumentFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideDocumentFormattingEdits(document) {
        const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length - 1));
        return this.formatter.format(document, range);
    }
}
exports.Z80DocumentFormatter = Z80DocumentFormatter;
class Z80DocumentRangeFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideDocumentRangeFormattingEdits(document, range) {
        return this.formatter.format(document, range);
    }
}
exports.Z80DocumentRangeFormatter = Z80DocumentRangeFormatter;
class Z80TypingFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideOnTypeFormattingEdits(document, position) {
        return this.formatter.format(document, document.lineAt(position.line).range);
    }
}
exports.Z80TypingFormatter = Z80TypingFormatter;
//# sourceMappingURL=formatProcessor.js.map
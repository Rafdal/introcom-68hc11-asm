"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const configProperties_1 = require("./configProperties");
const utils_1 = require("./utils");
const defs_regex_1 = require("./defs_regex");
const defs_list_1 = require("./defs_list");
class Z80CompletionProposer extends configProperties_1.ConfigPropsProvider {
    constructor(symbolProcessor) {
        super(symbolProcessor.settings);
        this.symbolProcessor = symbolProcessor;
    }
    instructionMapper(opt, ucase, z80n, snippet) {
        const delimiter = snippet.substr(-1);
        snippet = utils_1.uppercaseIfNeeded(snippet, ucase).trim();
        const item = new vscode.CompletionItem(snippet, vscode.CompletionItemKind.Keyword);
        const snip = new vscode.SnippetString(snippet);
        if (delimiter === '\t') {
            if (opt.whitespaceAfterInstruction === 'single-space') {
                snip.appendText(' ');
            }
            else if (opt.whitespaceAfterInstruction === 'tab') {
                snip.appendText('\t');
            }
            else if (opt.indentSpaces) {
                let tabSize = opt.indentSize;
                while (snippet.length > tabSize)
                    tabSize += opt.indentSize;
                snip.appendText(' '.repeat(tabSize - snippet.length));
            }
            else {
                snip.appendText('\t');
            }
        }
        else if (delimiter === '\n') {
            snip.appendText(opt.eol);
        }
        else {
            snip.appendText(delimiter);
        }
        snip.appendTabstop(0);
        item.insertText = snip;
        item.commitCharacters = ['\t'];
        if (z80n) {
            item.documentation = new vscode.MarkdownString('(Z80N)');
            item.sortText = `z${snippet}`; // put on bottom...
        }
        return item;
    }
    registerMapper(options, ucase, snippet, idx) {
        snippet = utils_1.uppercaseIfNeeded(snippet, ucase);
        let prefix = '';
        if (options.secondArgument && options.spaceAfterArgument) {
            prefix = ' ';
        }
        if (options.bracketType === 'square' && snippet.indexOf('(') === 0) {
            snippet = snippet.replace('(', '[').replace(')', ']');
        }
        const item = new vscode.CompletionItem(snippet, vscode.CompletionItemKind.Value);
        const snip = new vscode.SnippetString(prefix + snippet.replace('*', '${1:0}'));
        snip.appendText(options.eol);
        snip.appendTabstop(0);
        // put on the top of the list...
        item.sortText = `!${utils_1.pad(idx)}`;
        item.insertText = snip;
        item.commitCharacters = ['\n'];
        return item;
    }
    //---------------------------------------------------------------------------------------
    async provideCompletionItems(document, position, token, context) {
        const configProps = this.getConfigProps(document);
        const line = document.lineAt(position.line).text;
        const shouldSuggestInstructionMatch = defs_regex_1.default.shouldSuggestInstruction.exec(line);
        const shouldKeywordUppercase = (part) => configProps.uppercaseKeywords === 'auto' ? utils_1.isFirstLetterUppercase(part) :
            configProps.uppercaseKeywords;
        let output = [];
        if (shouldSuggestInstructionMatch) {
            const uc = shouldKeywordUppercase(shouldSuggestInstructionMatch[4]);
            output = [
                ...defs_list_1.default.instructions.map(this.instructionMapper.bind(this, configProps, uc, false)),
                ...defs_list_1.default.nextInstructions.map(this.instructionMapper.bind(this, configProps, uc, true))
            ];
        }
        else {
            const shouldSuggest1ArgRegisterMatch = defs_regex_1.default.shouldSuggest1ArgRegister.exec(line);
            const shouldSuggest2ArgRegisterMatch = defs_regex_1.default.shouldSuggest2ArgRegister.exec(line);
            if (shouldSuggest2ArgRegisterMatch) {
                const uc = shouldKeywordUppercase(shouldSuggest2ArgRegisterMatch[1]);
                if (shouldSuggest2ArgRegisterMatch[1].toLowerCase() === 'ex' &&
                    shouldSuggest2ArgRegisterMatch[2].toLowerCase() === 'af') {
                    const text = utils_1.uppercaseIfNeeded("af'", uc);
                    const item = new vscode.CompletionItem(text, vscode.CompletionItemKind.Value);
                    item.insertText = new vscode.SnippetString(text)
                        .appendText(configProps.eol)
                        .appendTabstop(0);
                    item.commitCharacters = ['\n'];
                    return [item];
                }
                else {
                    output = defs_list_1.default.registers.map(this.registerMapper.bind(this, {
                        ...configProps,
                        secondArgument: true
                    }, uc));
                }
            }
            else if (shouldSuggest1ArgRegisterMatch) {
                const uc = shouldKeywordUppercase(shouldSuggest1ArgRegisterMatch[0]);
                let idxStart = 0, idxEnd = undefined;
                if (shouldSuggest1ArgRegisterMatch[1]) {
                    idxStart = defs_list_1.default.regR16Index;
                    idxEnd = defs_list_1.default.regStackIndex;
                }
                else if (shouldSuggest1ArgRegisterMatch[2]) {
                    idxEnd = defs_list_1.default.regR16Index;
                }
                output = defs_list_1.default.registers.slice(idxStart, idxEnd).map(this.registerMapper.bind(this, configProps, uc));
            }
        }
        const symbols = await this.symbolProcessor.symbols(document);
        if (token.isCancellationRequested) {
            return;
        }
        for (const name in symbols) {
            const symbol = symbols[name];
            // mark a suggested item with proper icon
            let kind = vscode.CompletionItemKind.Variable;
            // suggest also macros in place of instructions
            if (symbol.kind === vscode.SymbolKind.Module) {
                kind = vscode.CompletionItemKind.Module;
                if (shouldSuggestInstructionMatch) {
                    continue;
                }
            }
            else if (symbol.kind === vscode.SymbolKind.Function) {
                kind = vscode.CompletionItemKind.Function;
            }
            else if (shouldSuggestInstructionMatch) {
                continue;
            }
            const item = new vscode.CompletionItem(name, kind);
            if (symbol.path.length > 1) {
                item.documentation = new vscode.MarkdownString(symbol.declaration);
            }
            if (symbol.documentation) {
                if (item.documentation instanceof vscode.MarkdownString) {
                    item.documentation.appendMarkdown("\n\n" + symbol.documentation);
                }
                else {
                    item.documentation = new vscode.MarkdownString(symbol.documentation);
                }
            }
            if (symbol.location.uri.fsPath === document.fileName) {
                // sort symbols by proximity to current line of current file
                const delta = Math.abs(symbol.line - position.line);
                item.sortText = `!z${utils_1.pad(delta, 10)}`;
            }
            else {
                item.sortText = symbol.declaration;
            }
            if (name[0] === '.' && line.lastIndexOf('.') > 0) {
                item.range = new vscode.Range(position.line, line.lastIndexOf('.'), position.line, position.character);
            }
            item.commitCharacters = ['\n'];
            output.push(item);
        }
        return output;
    }
}
exports.Z80CompletionProposer = Z80CompletionProposer;
//# sourceMappingURL=completionProposer.js.map
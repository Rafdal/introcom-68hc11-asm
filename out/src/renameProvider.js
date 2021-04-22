"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const defs_regex_1 = require("./defs_regex");
class Z80RenameProvider {
    constructor(symbolProcessor) {
        this.symbolProcessor = symbolProcessor;
    }
    prepareRename(document, position) {
        const lineText = document.lineAt(position.line).text;
        const includeLineMatch = defs_regex_1.default.includeLine.exec(lineText);
        if (includeLineMatch) {
            throw 'You cannot rename a includes.';
        }
        const commentLineMatch = defs_regex_1.default.endComment.exec(lineText);
        if (commentLineMatch && position.character >= commentLineMatch.index) {
            throw 'You cannot rename a comments.';
        }
        let range = document.getWordRangeAtPosition(position, defs_regex_1.default.stringBounds);
        if (range && !range.isEmpty) {
            throw 'You cannot rename a strings.';
        }
        range = document.getWordRangeAtPosition(position, defs_regex_1.default.numerals);
        if (range && !range.isEmpty) {
            throw 'You cannot rename a numerals.';
        }
        range = document.getWordRangeAtPosition(position);
        if (!range) {
            throw null;
        }
        const activeLinePart = lineText.substr(0, range.end.character);
        const keywordMatch = defs_regex_1.default.shouldSuggestInstruction.exec(activeLinePart);
        if (keywordMatch && defs_regex_1.default.keyword.test(keywordMatch[4])) {
            throw 'You cannot rename a keywords.';
        }
        const arg1RegisterMatch = defs_regex_1.default.shouldSuggest1ArgRegister.exec(activeLinePart);
        const arg2RegisterMatch = defs_regex_1.default.shouldSuggest2ArgRegister.exec(activeLinePart);
        const condFlagsMatch = defs_regex_1.default.condFlags.exec(activeLinePart);
        if ((condFlagsMatch && condFlagsMatch[2]) ||
            (arg2RegisterMatch && arg2RegisterMatch[3] &&
                defs_regex_1.default.registers.test(arg2RegisterMatch[3])) ||
            (arg1RegisterMatch && arg1RegisterMatch[4] &&
                defs_regex_1.default.registers.test(arg1RegisterMatch[4]))) {
            throw 'You cannot rename a registers or flags.';
        }
        return range;
    }
    provideRenameEdits(document, position, newName, token) {
        return this.processSymbolAtDocPosition(document, position, newName, token);
    }
    /**
     * Provide defined symbol for 'Go to Definition' or symbol hovering.
     * @param document Text document object.
     * @param position Cursor position.
     * @param newName Target rename string.
     * @param token Cancellation token object.
     * @returns Promise.
     */
    async processSymbolAtDocPosition(document, position, newName, token) {
        const wsEdit = new vscode.WorkspaceEdit();
        const range = document.getWordRangeAtPosition(position, defs_regex_1.default.partialLabel);
        if (!range || (range && (range.isEmpty || !range.isSingleLine))) {
            return wsEdit;
        }
        const partialLabelMatch = defs_regex_1.default.partialLabel.exec(document.getText(range));
        if (!partialLabelMatch) {
            return wsEdit;
        }
        const oldName = partialLabelMatch[1];
        let wasLocalLabel = (partialLabelMatch[0][0] === '.');
        let symbol = null;
        if (wasLocalLabel) {
            symbol = await this.symbolProcessor.getFullSymbolAtDocPosition(document, position, token, 3 /* SYMBOL_FULL */);
            if (token.isCancellationRequested) {
                return wsEdit;
            }
        }
        if (symbol == null) {
            symbol = await this.symbolProcessor.getFullSymbolAtDocPosition(document, position, token, 2 /* SYMBOL */);
            if (token.isCancellationRequested) {
                return wsEdit;
            }
        }
        if (symbol == null && !wasLocalLabel) {
            symbol = await this.symbolProcessor.getFullSymbolAtDocPosition(document, position, token, 3 /* SYMBOL_FULL */);
            if (token.isCancellationRequested) {
                return wsEdit;
            }
        }
        if (symbol != null && symbol.labelFull) {
            wasLocalLabel = symbol.localLabel;
            const files = this.symbolProcessor.filesWithIncludes(document);
            for (const uri in files) {
                const doc = await vscode.workspace.openTextDocument(uri);
                if (token.isCancellationRequested) {
                    return wsEdit;
                }
                let moduleStack = [];
                let lastFullLabel = files[uri].labelPath[0];
                for (let lineNumber = 0; lineNumber < doc.lineCount; lineNumber++) {
                    const line = doc.lineAt(lineNumber);
                    if (!line || line.isEmptyOrWhitespace) {
                        continue;
                    }
                    let lineText = line.text;
                    const commentLineMatch = defs_regex_1.default.endComment.exec(lineText);
                    const includeLineMatch = defs_regex_1.default.includeLine.exec(lineText);
                    const moduleLineMatch = defs_regex_1.default.moduleLine.exec(lineText);
                    const macroLineMatch = defs_regex_1.default.macroLine.exec(lineText);
                    const labelMatch = defs_regex_1.default.labelDefinition.exec(lineText);
                    if (commentLineMatch) {
                        // remove comment from line to prevent false match
                        lineText = lineText.replace(commentLineMatch[0], '');
                    }
                    else if (includeLineMatch) {
                        // remove include from line to prevent false match
                        lineText = lineText.replace(includeLineMatch[0], '');
                    }
                    else if (macroLineMatch) {
                        const macroName = macroLineMatch[2];
                        // test if we renaming specific macro
                        if (symbol.kind === vscode.SymbolKind.Function && macroName === oldName) {
                            const start = macroLineMatch.index + macroLineMatch[1].length;
                            const range = new vscode.Range(symbol.line, start, symbol.line, start + macroName.length);
                            wsEdit.replace(symbol.location.uri, range, newName);
                        }
                        // remove macro definition to prevent false match
                        lineText = lineText.replace(macroLineMatch[0], '');
                    }
                    let labelPath = [];
                    if (labelMatch) {
                        labelPath.push(labelMatch[1]);
                        let declaration = labelMatch[1];
                        if (declaration[0] === '.') {
                            if (lastFullLabel) {
                                labelPath.unshift(lastFullLabel);
                                declaration = lastFullLabel + declaration;
                            }
                        }
                        else if (declaration.indexOf('$$') < 0) {
                            lastFullLabel = declaration;
                        }
                        if (moduleStack.length && labelMatch[0][0] !== '@') {
                            labelPath.unshift(moduleStack[0]);
                            declaration = `${moduleStack[0]}.${declaration}`;
                        }
                    }
                    if (moduleLineMatch) {
                        const declaration = moduleLineMatch[2];
                        if (symbol.kind === vscode.SymbolKind.Module && declaration === oldName) {
                            const start = line.firstNonWhitespaceCharacterIndex + moduleLineMatch[1].length;
                            const range = new vscode.Range(lineNumber, start, lineNumber, start + declaration.length);
                            wsEdit.replace(doc.uri, range, newName);
                        }
                        moduleStack.unshift(declaration);
                        // remove module definition to prevent false match
                        lineText = lineText.replace(moduleLineMatch[0], '');
                    }
                    else if (defs_regex_1.default.endmoduleLine.test(lineText)) {
                        moduleStack.shift();
                        continue;
                    }
                    // remove strings to prevent false match
                    lineText = lineText.replace(defs_regex_1.default.stringBounds, '');
                    // nothing left on the line...
                    if (!lineText.trim()) {
                        continue;
                    }
                    let replacementPhrase = wasLocalLabel ? `(?:(\\b\\w+)\\.|\\.)` : `(?:(\\b\\w+)\\.)?`;
                    replacementPhrase += oldName + '\\b';
                    const matches = lineText.matchAll(RegExp(replacementPhrase, 'g'));
                    for (const match of matches) {
                        const [phrase, prefix] = match;
                        const localLabel = (phrase[0] === '.');
                        if ((localLabel && symbol.labelFull &&
                            !symbol.labelFull.endsWith(lastFullLabel + phrase)) ||
                            (!localLabel && !prefix &&
                                symbol.labelPart && symbol.path.length > 1 &&
                                !(phrase === symbol.labelPart &&
                                    moduleStack[0] == symbol.path[0]))) {
                            continue;
                        }
                        let start = match.index || 0;
                        if (prefix) {
                            if (phrase !== symbol.labelFull && prefix !== symbol.path[0]) {
                                continue;
                            }
                            start += prefix.length + 1;
                        }
                        else if (localLabel) {
                            start++;
                        }
                        const range = new vscode.Range(lineNumber, start, lineNumber, start + oldName.length);
                        wsEdit.replace(doc.uri, range, newName);
                    }
                }
            }
        }
        return wsEdit;
    }
}
exports.Z80RenameProvider = Z80RenameProvider;
//# sourceMappingURL=renameProvider.js.map
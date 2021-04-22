"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class FormatProcessor {
    format(document, range, options) {
        let startLineNumber = document.lineAt(range.start).lineNumber;
        let endLineNumber = document.lineAt(range.end).lineNumber;
        let output = [];
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            let line = document.lineAt(lineNumber);
            let text = line.text;
            let offset = 0;
            let result = null;
        }
        return output;
    }
}
exports.FormatProcessor = FormatProcessor;
class Z80DocumentFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideDocumentFormattingEdits(document, options, token) {
        return this.formatter.format(document, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length - 1)), options);
    }
}
exports.Z80DocumentFormatter = Z80DocumentFormatter;
class Z80DocumentRangeFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideDocumentRangeFormattingEdits(document, range, options, token) {
        return this.formatter.format(document, range, options);
    }
}
exports.Z80DocumentRangeFormatter = Z80DocumentRangeFormatter;
class Z80TypingFormatter {
    constructor(formatter) {
        this.formatter = formatter;
    }
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        return this.formatter.format(document, document.lineAt(position.line).range, options);
    }
}
exports.Z80TypingFormatter = Z80TypingFormatter;
//# sourceMappingURL=formatter.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class ConfigPropsProvider {
    constructor(settings) {
        this.settings = settings;
    }
    getConfigProps(document) {
        var _a;
        const config = vscode.workspace.getConfiguration();
        const result = {
            ...(_a = this.settings) === null || _a === void 0 ? void 0 : _a.format,
            indentSpaces: (config.editor.insertSpaces === 'true'),
            indentSize: parseInt(config.editor.tabSize, 10) || 8,
            eol: (config.files.eol === vscode.EndOfLine.CRLF) ? '\r\n' : '\n'
        };
        result.indentDetector = RegExp('^' +
            `(\t|${' '.repeat(result.indentSize)})?`.repeat(Math.ceil(80 / result.indentSize)));
        // if this document is open, use the settings from that window
        vscode.window.visibleTextEditors.some(editor => {
            if (editor.document && editor.document.fileName === document.fileName) {
                result.indentSpaces = (editor.options.insertSpaces === true);
                result.indentSize = parseInt(editor.options.tabSize, 10) || 8;
                result.eol = (editor.document.eol === vscode.EndOfLine.CRLF) ? '\r\n' : '\n';
                return true;
            }
            return false;
        });
        return result;
    }
}
exports.ConfigPropsProvider = ConfigPropsProvider;
//# sourceMappingURL=configProperties.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Z80DocumentSymbolProvider {
    constructor(symbolProcessor) {
        this.symbolProcessor = symbolProcessor;
    }
    provideDocumentSymbols(document, token) {
        return this.symbolProcessor.provideSymbols(document.fileName, null, token);
    }
}
exports.Z80DocumentSymbolProvider = Z80DocumentSymbolProvider;
class Z80WorkspaceSymbolProvider {
    constructor(symbolProcessor) {
        this.symbolProcessor = symbolProcessor;
    }
    provideWorkspaceSymbols(query, token) {
        return this.symbolProcessor.provideSymbols(null, query, token);
    }
}
exports.Z80WorkspaceSymbolProvider = Z80WorkspaceSymbolProvider;
//# sourceMappingURL=symbolProvider.js.map
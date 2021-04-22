"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Z80DefinitionProvider {
    constructor(symbolProcessor) {
        this.symbolProcessor = symbolProcessor;
    }
    provideDefinition(document, position, token) {
        return this.symbolProcessor.getFullSymbolAtDocPosition(document, position, token);
    }
}
exports.Z80DefinitionProvider = Z80DefinitionProvider;
//# sourceMappingURL=definitionProvider.js.map
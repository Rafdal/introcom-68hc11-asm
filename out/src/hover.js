"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Z80HoverProvider {
    constructor(symbolProcessor) {
        this.symbolProcessor = symbolProcessor;
    }
    provideHover(document, position, token) {
        return this.symbolProcessor.getFullSymbolAtDocPosition(document, position, token, 1 /* HOVER */);
    }
}
exports.Z80HoverProvider = Z80HoverProvider;
//# sourceMappingURL=hover.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const formatProcessor_1 = require("./formatProcessor");
const symbolProcessor_1 = require("./symbolProcessor");
const completionProposer_1 = require("./completionProposer");
const definitionProvider_1 = require("./definitionProvider");
const hover_1 = require("./hover");
const renameProvider_1 = require("./renameProvider");
const symbolProvider_1 = require("./symbolProvider");
let changeConfigSubscription;
let symbolProcessor;
let formatProcessor;
function activate(ctx) {
    configure(ctx);
    // subscribe for every configuration change
    changeConfigSubscription = vscode.workspace.onDidChangeConfiguration(event => {
        configure(ctx, event);
    });
}
exports.activate = activate;
function deactivate() {
    if (symbolProcessor) {
        symbolProcessor.destroy();
        symbolProcessor = undefined;
    }
    if (changeConfigSubscription) {
        changeConfigSubscription.dispose();
        changeConfigSubscription = undefined;
    }
}
exports.deactivate = deactivate;
function configure(ctx, event) {
    const language = 'z80-macroasm';
    const settings = vscode.workspace.getConfiguration(language);
    const languageSelector = { language, scheme: "file" };
    // test if changing specific configuration
    if (event && symbolProcessor && formatProcessor) {
        if (event.affectsConfiguration(language)) {
            symbolProcessor.settings = settings;
            formatProcessor.settings = settings;
        }
        return;
    }
    // dispose previously created providers
    let provider;
    while ((provider = ctx.subscriptions.pop()) != null) {
        provider.dispose();
    }
    // dispose previously created symbol processor
    if (symbolProcessor) {
        symbolProcessor.destroy();
    }
    symbolProcessor = new symbolProcessor_1.SymbolProcessor(settings);
    // dispose previously created format processor
    if (!formatProcessor) {
        formatProcessor = new formatProcessor_1.FormatProcessor(settings);
    }
    // create subscriptions for all providers
    ctx.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(languageSelector, new formatProcessor_1.Z80DocumentFormatter(formatProcessor)), vscode.languages.registerDocumentRangeFormattingEditProvider(languageSelector, new formatProcessor_1.Z80DocumentRangeFormatter(formatProcessor)), vscode.languages.registerOnTypeFormattingEditProvider(languageSelector, new formatProcessor_1.Z80TypingFormatter(formatProcessor), ' ', ',', ';', ':'), vscode.languages.registerCompletionItemProvider(languageSelector, new completionProposer_1.Z80CompletionProposer(symbolProcessor), ',', '.', ' '), vscode.languages.registerDefinitionProvider(languageSelector, new definitionProvider_1.Z80DefinitionProvider(symbolProcessor)), vscode.languages.registerDocumentSymbolProvider(languageSelector, new symbolProvider_1.Z80DocumentSymbolProvider(symbolProcessor)), vscode.languages.registerHoverProvider(languageSelector, new hover_1.Z80HoverProvider(symbolProcessor)), vscode.languages.registerRenameProvider(languageSelector, new renameProvider_1.Z80RenameProvider(symbolProcessor)), vscode.languages.registerWorkspaceSymbolProvider(new symbolProvider_1.Z80WorkspaceSymbolProvider(symbolProcessor)));
}
//# sourceMappingURL=extension.js.map
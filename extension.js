const vscode = require("vscode");
const HTMLParser = require("node-html-parser");

let configuration = vscode.workspace.getConfiguration("IDGuard");

let severity = configuration.get("changeSeverity");
severity = vscode.DiagnosticSeverity[severity];

let timeoutDuration = configuration.get("checkingTimeout", 1000);

let isExtensionEnabled = true;
let duplicatedIds = [];
let timeout;
const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("html");

function monitorHTMLFile(e) {
  if (e.document.languageId === "html") {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      duplicatedIds = [];

      // get the html content as text
      const content = e.document.getText();

      const root = HTMLParser.parse(content);

      const elementsWithId = root.querySelectorAll("[id]");

      const idRegex = /id[ ]?=[ ]?["']([^"']+)["']/gi;

      let diagnostics = [];
      elementsWithId.forEach((el) => {
        const elementId = el.id;
        const elementsWithTheSameId = root.querySelectorAll(
          `[id=${elementId}]`
        );

        if (
          elementsWithTheSameId.length > 1 &&
          !duplicatedIds.includes(elementId)
        ) {
          duplicatedIds.push(elementId);

          elementsWithTheSameId.forEach((element) => {
            const elementRange = element.range;
            idRegex.lastIndex = elementRange[0];
            let match = idRegex.exec(content);

            if (match) {
              // create the range of the position of the id
              const start = match.index + match[0].indexOf(elementId);
              const startPos = e.document.positionAt(start);
              const endPos = e.document.positionAt(start + elementId.length);

              const range = new vscode.Range(startPos, endPos);

              const diagnostic = new vscode.Diagnostic(
                range,
                `Duplicate ID detected: "${elementId}". Consider using unique IDs to avoid conflicts.`,
                severity
              );
              diagnostics.push(diagnostic);
            }
          });
        }
      });

      // Clear existing diagnostics for non-duplicates
      diagnosticCollection.delete(e.document.uri);
      // Set the new diagnostics
      diagnosticCollection.set(e.document.uri, diagnostics);
    }, timeoutDuration);
  }
}

const enableCommandDisposable = vscode.commands.registerCommand(
  "extension.enable",
  () => {
    isExtensionEnabled = true;
    vscode.window.showInformationMessage("Extension enabled!");
  }
);

const disableCommandDisposable = vscode.commands.registerCommand(
  "extension.disable",
  () => {
    diagnosticCollection.clear();
    isExtensionEnabled = false;
    vscode.window.showInformationMessage("Extension disabled!");
  }
);

function activate() {
  vscode.workspace.onDidChangeTextDocument((e) => {
    if (isExtensionEnabled) {
      monitorHTMLFile(e);
    }
  });

  vscode.window.onDidChangeActiveTextEditor((e) => {
    if (isExtensionEnabled) {
      monitorHTMLFile(e);
    }
  });

  vscode.workspace.onDidChangeWorkspaceFolders((e) => {
    if (isExtensionEnabled) {
      monitorHTMLFile(e);
    }
  });
}

// This method is called the extension is deactivated
function deactivate() {
  enableCommandDisposable.dispose();
  disableCommandDisposable.dispose();
}

module.exports = {
  activate,
  deactivate,
};

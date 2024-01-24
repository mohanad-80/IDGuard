const vscode = require("vscode");
const HTMLParser = require("node-html-parser");

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
                `Duplicate id attribute detected: ${elementId}`,
                vscode.DiagnosticSeverity.Information // <=== choose the best severity
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
    }, 1000);
  }
}

function activate() {
  vscode.workspace.onDidChangeTextDocument((e) => {
    monitorHTMLFile(e);
  });

  vscode.window.onDidChangeActiveTextEditor((e) => {
    monitorHTMLFile(e);
  });

  vscode.workspace.onDidChangeWorkspaceFolders((e) => {
    monitorHTMLFile(e);
  });
}

// This method is called the extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

const vscode = require("vscode");
const cheerio = require("cheerio");

let ids = [];
let timeout;
const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("html");

function monitorHTMLFile(e) {
  if (e.document.languageId === "html") {
    clearTimeout(timeout); // Clear previous timeout
    timeout = setTimeout(() => {
      ids = []; // Clear the array of IDs before processing

      // get the html content as text
      const content = e.document.getText();
      //////////////////////// console.log(e);

      // parse the text to html
      const $ = cheerio.load(content);

      // array of all elements with id attribute
      const elementsWithId = $("[id]").get();

      // regular expression for the id attribute
      const idRegex = /id[ ]?=[ ]?["']([^"']+)["']/gi;

      let diagnostics = [];
      elementsWithId.forEach((el) => {
        const id = el.attribs.id;
        if (ids.includes(id)) {
          vscode.window.activeTextEditor.edit((editBuilder) => {
            let match;
            let idsRanges = [];

            // Search the document for id attributes with regex
            while ((match = idRegex.exec(content)) !== null) {
              const idFromRegEx = match[1];
              if (idFromRegEx === id) {
                // create the range of the position of the id
                const start = match.index + match[0].indexOf(id);
                const startPos = e.document.positionAt(start);
                const endPos = e.document.positionAt(start + id.length);

                const range = new vscode.Range(startPos, endPos);
                idsRanges.push(range);
              }
            }
            idRegex.lastIndex = 0; // Reset the lastIndex property

            // loop through the ranges and create a new diagnostic for each one
            idsRanges.forEach((range) => {
              const diagnostic = new vscode.Diagnostic(
                range,
                `Duplicate id attribute detected: ${id}`,
                vscode.DiagnosticSeverity.Information // <=== choose the best severity
              );
              diagnostics.push(diagnostic);
            });
          });
        } else {
          // if the id is not in the ids array then add it
          ids.push(id);
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

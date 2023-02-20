// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ImageDiffViewer } from "./diffViewer";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const {
    registration: imageDiffViewerRegistration,
    provider: imageDiffViewerProvider
  } = ImageDiffViewer.register(context);
  context.subscriptions.push(imageDiffViewerRegistration);
        
  context.subscriptions.push(vscode.commands.registerCommand("image-diff.toggle-diff", (...args) => {
    // args[0] - current file path
    // args[1] - some sort of options
    console.log({args});
  }));
}

// This method is called when your extension is deactivated
export function deactivate() {}

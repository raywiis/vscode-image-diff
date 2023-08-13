# vscode-image-diff

Replaces the built in image viewer for png images. New viewer features a diff view to easily spot differences when viewing image diffs and scroll zooming.

## Features

- Scroll to zoom into images
- Highlight diff
- Synchronized panning in diff view

## Commands

- **Toggle diff mask** - Should toggle the diff mask in the active diff view.

  Note that the extension API doesn't allow to directly get the active webview
  so detection is based on visibility state changes. Therefore it might be
  sketchy.


## Extension Settings

No settings so far

## Known Issues

> This extension is in very early days. And it's subject to change anytime.

- When viewing diffs of images that take longer to load sometimes the source
  panel fails to correctly initialize and becomes inactive.


## Release Notes

### 0.0.5

Attempt to detect diff views when using githubs PR extension.

Implement a command to toggle the active view diff mask


### 0.0.4

Add marketplace icon

### 0.0.3

Added repository url. Made repository public on github

### 0.0.2

Adjust minimum scale to fit vertical images

### 0.0.1

Initial release for testing


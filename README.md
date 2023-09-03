# vscode-image-diff

Replaces the built in image viewer for png images. New viewer features a diff
view to easily spot differences when viewing image diffs and scroll zooming.

## Features

- Scroll to zoom into images
- Highlight differences with mask from [pixelmatch](https://github.com/mapbox/pixelmatch)!
- Synchronized panning in diff view

## Commands

- **Toggle diff mask** - Should toggle the diff mask in the active diff view.

  Note that the extension API doesn't allow to directly get the active webview
  so detection is based on visibility state changes. Therefore it might be
  sketchy.


## Extension Settings

- `image-diff.viewer.minScaleOne` - Will always have 1 or less as the minimum scale
- `image-diff.diff.defaultAlign` - Sets the default diff alignment for images with different dimensions.

## Known Issues

> This extension is in very early days. And it's subject to change anytime.

## Release Notes

Not 'released' yet. Check changelog for changes.

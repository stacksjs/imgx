# @stacksjs/imgx-vscode

A VS Code extension for imgx that provides image optimization and manipulation capabilities directly within your editor.

## Features

- Optimize images from the file explorer context menu
- Preview image optimization results before applying
- Batch optimize images in a folder
- Convert between image formats (JPEG, PNG, WebP, AVIF)
- Generate app icons and favicons from source images
- View image metadata and file size information

## Installation

Search for "imgx" in the VS Code Extensions Marketplace, or install from the command line:

```bash
code --install-extension stacksjs.imgx-vscode
```

## Usage

### Context Menu

Right-click any image file in the VS Code file explorer to access imgx commands:

- **Optimize Image** - Compress the image with smart defaults
- **Convert Image** - Convert to a different format
- **Resize Image** - Resize to specific dimensions
- **Generate App Icons** - Generate all app icon sizes from this image

### Command Palette

Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and search for:

- `imgx: Optimize Image`
- `imgx: Convert Image Format`
- `imgx: Batch Optimize Folder`
- `imgx: Generate App Icons`
- `imgx: Generate Favicons`

## Configuration

Configure the extension via VS Code settings:

```json
{
  "imgx.defaultQuality": 80,
  "imgx.defaultFormat": "webp",
  "imgx.showPreview": true
}
```

## Development

```bash
# Build the extension
bun run build

# Run tests
bun test
```

## License

MIT

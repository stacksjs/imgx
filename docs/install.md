# Install

Installing `imgx` is easy. Simply pull it in via your package manager of choice, or download the binary directly.

## Package Managers

Choose your package manager of choice:

::: code-group

```sh [npm]
npm install --save-dev @stacksjs/imgx
# npm i -d @stacksjs/imgx

# or, install globally via
npm i -g @stacksjs/imgx
```

```sh [bun]
bun install --dev @stacksjs/imgx
# bun add --dev @stacksjs/imgx
# bun i -d @stacksjs/imgx

# or, install globally via
bun add --global @stacksjs/imgx
```

```sh [pnpm]
pnpm add --save-dev @stacksjs/imgx
# pnpm i -d @stacksjs/imgx

# or, install globally via
pnpm add --global @stacksjs/imgx
```

```sh [yarn]
yarn add --dev @stacksjs/imgx
# yarn i -d @stacksjs/imgx

# or, install globally via
yarn global add @stacksjs/imgx
```

```sh [brew]
brew install imgx # coming soon
```

```sh [pkgx]
pkgx imgx # coming soon
```

:::

Read more about how to use it in the Usage section of the documentation.

## Binaries

Choose the binary that matches your platform and architecture:

::: code-group

```sh [macOS (arm64)]
# Download the binary
curl -L https://github.com/stacksjs/imgx/releases/download/v0.9.1/imgx-darwin-arm64 -o imgx

# Make it executable
chmod +x imgx

# Move it to your PATH
mv imgx /usr/local/bin/imgx
```

```sh [macOS (x64)]
# Download the binary
curl -L https://github.com/stacksjs/imgx/releases/download/v0.9.1/imgx-darwin-x64 -o imgx

# Make it executable
chmod +x imgx

# Move it to your PATH
mv imgx /usr/local/bin/imgx
```

```sh [Linux (arm64)]
# Download the binary
curl -L https://github.com/stacksjs/imgx/releases/download/v0.9.1/imgx-linux-arm64 -o imgx

# Make it executable
chmod +x imgx

# Move it to your PATH
mv imgx /usr/local/bin/imgx
```

```sh [Linux (x64)]
# Download the binary
curl -L https://github.com/stacksjs/imgx/releases/download/v0.9.1/imgx-linux-x64 -o imgx

# Make it executable
chmod +x imgx

# Move it to your PATH
mv imgx /usr/local/bin/imgx
```

```sh [Windows (x64)]
# Download the binary
curl -L https://github.com/stacksjs/imgx/releases/download/v0.9.1/imgx-windows-x64.exe -o imgx.exe

# Move it to your PATH (adjust the path as needed)
move imgx.exe C:\Windows\System32\imgx.exe
```

::: tip
You can also find the `imgx` binaries in GitHub [releases](https://github.com/stacksjs/imgx/releases).
:::

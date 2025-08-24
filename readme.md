<div align="center">

# 🤖 WBT WhatsApp Bot

**Indie multi-purpose WhatsApp Bot using WWeb.js**

[![GitHub License](https://img.shields.io/github/license/just-shadyumbrella/wbt?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNOC43NS43NVYyaC45ODVjLjMwNCAwIC42MDMuMDguODY3LjIzMWwxLjI5LjczNnEuMDU4LjAzMy4xMjQuMDMzaDIuMjM0YS43NS43NSAwIDAgMSAwIDEuNWgtLjQyN2wyLjExMSA0LjY5MmEuNzUuNzUgMCAwIDEtLjE1NC44MzhsLS41My0uNTNsLjUyOS41MzFsLS4wMDEuMDAybC0uMDAyLjAwMmwtLjAwNi4wMDZsLS4wMDYuMDA1bC0uMDEuMDFsLS4wNDUuMDRxLS4zMTcuMjY1LS42ODYuNDVDMTQuNTU2IDEwLjc4IDEzLjg4IDExIDEzIDExYTQuNSA0LjUgMCAwIDEtMi4wMjMtLjQ1NGEzLjUgMy41IDAgMCAxLS42ODYtLjQ1bC0uMDQ1LS4wNGwtLjAxNi0uMDE1bC0uMDA2LS4wMDZsLS4wMDQtLjAwNHYtLjAwMWEuNzUuNzUgMCAwIDEtLjE1NC0uODM4TDEyLjE3OCA0LjVoLS4xNjJjLS4zMDUgMC0uNjA0LS4wNzktLjg2OC0uMjMxbC0xLjI5LS43MzZhLjI1LjI1IDAgMCAwLS4xMjQtLjAzM0g4Ljc1VjEzaDIuNWEuNzUuNzUgMCAwIDEgMCAxLjVoLTYuNWEuNzUuNzUgMCAwIDEgMC0xLjVoMi41VjMuNWgtLjk4NGEuMjUuMjUgMCAwIDAtLjEyNC4wMzNsLTEuMjg5LjczN2MtLjI2NS4xNS0uNTY0LjIzLS44NjkuMjNoLS4xNjJsMi4xMTIgNC42OTJhLjc1Ljc1IDAgMCAxLS4xNTQuODM4bC0uNTMtLjUzbC41MjkuNTMxbC0uMDAxLjAwMmwtLjAwMi4wMDJsLS4wMDYuMDA2bC0uMDE2LjAxNWwtLjA0NS4wNHEtLjMxNy4yNjUtLjY4Ni40NUM0LjU1NiAxMC43OCAzLjg4IDExIDMgMTFhNC41IDQuNSAwIDAgMS0yLjAyMy0uNDU0YTMuNSAzLjUgMCAwIDEtLjY4Ni0uNDVsLS4wNDUtLjA0bC0uMDE2LS4wMTVsLS4wMDYtLjAwNmwtLjAwNC0uMDA0di0uMDAxYS43NS43NSAwIDAgMS0uMTU0LS44MzhMMi4xNzggNC41SDEuNzVhLjc1Ljc1IDAgMCAxIDAtMS41aDIuMjM0YS4yNS4yNSAwIDAgMCAuMTI1LS4wMzNsMS4yODgtLjczN2MuMjY1LS4xNS41NjQtLjIzLjg2OS0uMjNoLjk4NFYuNzVhLjc1Ljc1IDAgMCAxIDEuNSAwbTIuOTQ1IDguNDc3Yy4yODUuMTM1LjcxOC4yNzMgMS4zMDUuMjczczEuMDItLjEzOCAxLjMwNS0uMjczTDEzIDYuMzI3Wm0tMTAgMGMuMjg1LjEzNS43MTguMjczIDEuMzA1LjI3M3MxLjAyLS4xMzggMS4zMDUtLjI3M0wzIDYuMzI3WiIvPjwvc3ZnPg%3D%3D)](./LICENSE.md)

<!-- Project Badges -->

![GitHub package.json version](https://img.shields.io/github/package-json/v/just-shadyumbrella/wbt?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNNy43NSAxNEExLjc1IDEuNzUgMCAwIDEgNiAxMi4yNXYtOC41QzYgMi43ODQgNi43ODQgMiA3Ljc1IDJoNi41Yy45NjYgMCAxLjc1Ljc4NCAxLjc1IDEuNzV2OC41QTEuNzUgMS43NSAwIDAgMSAxNC4yNSAxNFptLS4yNS0xLjc1YzAgLjEzOC4xMTIuMjUuMjUuMjVoNi41YS4yNS4yNSAwIDAgMCAuMjUtLjI1di04LjVhLjI1LjI1IDAgMCAwLS4yNS0uMjVoLTYuNWEuMjUuMjUgMCAwIDAtLjI1LjI1Wk00LjkgMy41MDhhLjc1Ljc1IDAgMCAxLS4yNzQgMS4wMjVhLjI1LjI1IDAgMCAwLS4xMjYuMjE3djYuNWMwIC4wOS4wNDguMTczLjEyNi4yMTdhLjc1Ljc1IDAgMCAxLS43NTIgMS4yOThBMS43NSAxLjc1IDAgMCAxIDMgMTEuMjV2LTYuNWMwLS42NDkuMzUzLTEuMjE0Ljg3NC0xLjUxNmEuNzUuNzUgMCAwIDEgMS4wMjUuMjc0Wk0xLjYyNSA1LjUzM2EuMjUuMjUgMCAwIDAtLjEyNi4yMTd2NC41YzAgLjA5LjA0OC4xNzMuMTI2LjIxN2EuNzUuNzUgMCAwIDEtLjc1MiAxLjI5OEExLjc1IDEuNzUgMCAwIDEgMCAxMC4yNXYtNC41YTEuNzUgMS43NSAwIDAgMSAuODczLTEuNTE2YS43NS43NSAwIDEgMSAuNzUyIDEuMjk5Ii8%2BPC9zdmc%2B)
![GitHub release date](https://img.shields.io/github/release-date/just-shadyumbrella/wbt?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMSA3Ljc3NVYyLjc1QzEgMS43ODQgMS43ODQgMSAyLjc1IDFoNS4wMjVjLjQ2NCAwIC45MS4xODQgMS4yMzguNTEzbDYuMjUgNi4yNWExLjc1IDEuNzUgMCAwIDEgMCAyLjQ3NGwtNS4wMjYgNS4wMjZhMS43NSAxLjc1IDAgMCAxLTIuNDc0IDBsLTYuMjUtNi4yNUExLjc1IDEuNzUgMCAwIDEgMSA3Ljc3NW0xLjUgMGMwIC4wNjYuMDI2LjEzLjA3My4xNzdsNi4yNSA2LjI1YS4yNS4yNSAwIDAgMCAuMzU0IDBsNS4wMjUtNS4wMjVhLjI1LjI1IDAgMCAwIDAtLjM1NGwtNi4yNS02LjI1YS4yNS4yNSAwIDAgMC0uMTc3LS4wNzNIMi43NWEuMjUuMjUgMCAwIDAtLjI1LjI1Wk02IDVhMSAxIDAgMSAxIDAgMmExIDEgMCAwIDEgMC0yIi8%2BPC9zdmc%2B)
[![GitHub last commit](https://img.shields.io/github/last-commit/just-shadyumbrella/wbt?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMTEuOTMgOC41YTQuMDAyIDQuMDAyIDAgMCAxLTcuODYgMEguNzVhLjc1Ljc1IDAgMCAxIDAtMS41aDMuMzJhNC4wMDIgNC4wMDIgMCAwIDEgNy44NiAwaDMuMzJhLjc1Ljc1IDAgMCAxIDAgMS41Wm0tMS40My0uNzVhMi41IDIuNSAwIDEgMC01IDBhMi41IDIuNSAwIDAgMCA1IDAiLz48L3N2Zz4%3D)](https://github.com/just-shadyumbrella/wbt/commits)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/just-shadyumbrella/wbt?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNOS41IDMuMjVhMi4yNSAyLjI1IDAgMSAxIDMgMi4xMjJWNkEyLjUgMi41IDAgMCAxIDEwIDguNUg2YTEgMSAwIDAgMC0xIDF2MS4xMjhhMi4yNTEgMi4yNTEgMCAxIDEtMS41IDBWNS4zNzJhMi4yNSAyLjI1IDAgMSAxIDEuNSAwdjEuODM2QTIuNSAyLjUgMCAwIDEgNiA3aDRhMSAxIDAgMCAwIDEtMXYtLjYyOEEyLjI1IDIuMjUgMCAwIDEgOS41IDMuMjVtLTYgMGEuNzUuNzUgMCAxIDAgMS41IDBhLjc1Ljc1IDAgMCAwLTEuNSAwbTguMjUtLjc1YS43NS43NSAwIDEgMCAwIDEuNWEuNzUuNzUgMCAwIDAgMC0xLjVNNC4yNSAxMmEuNzUuNzUgMCAxIDAgMCAxLjVhLjc1Ljc1IDAgMCAwIDAtMS41Ii8%2BPC9zdmc%2B)](https://github.com/just-shadyumbrella/wbt/graphs/commit-activity)
[![GitHub contributors](https://img.shields.io/github/contributors/just-shadyumbrella/wbt?style=flat&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMiA1LjVhMy41IDMuNSAwIDEgMSA1Ljg5OCAyLjU0OWE1LjUxIDUuNTEgMCAwIDEgMy4wMzQgNC4wODRhLjc1Ljc1IDAgMSAxLTEuNDgyLjIzNWE0IDQgMCAwIDAtNy45IDBhLjc1Ljc1IDAgMCAxLTEuNDgyLS4yMzZBNS41IDUuNSAwIDAgMSAzLjEwMiA4LjA1QTMuNSAzLjUgMCAwIDEgMiA1LjVNMTEgNGEzLjAwMSAzLjAwMSAwIDAgMSAyLjIyIDUuMDE4YTUgNSAwIDAgMSAyLjU2IDMuMDEyYS43NDkuNzQ5IDAgMCAxLS44ODUuOTU0YS43NS43NSAwIDAgMS0uNTQ5LS41MTRhMy41MSAzLjUxIDAgMCAwLTIuNTIyLTIuMzcyYS43NS43NSAwIDAgMS0uNTc0LS43M3YtLjM1MmEuNzUuNzUgMCAwIDEgLjQxNi0uNjcyQTEuNSAxLjUgMCAwIDAgMTEgNS41QS43NS43NSAwIDAgMSAxMSA0bS01LjUtLjVhMiAyIDAgMSAwLS4wMDEgMy45OTlBMiAyIDAgMCAwIDUuNSAzLjUiLz48L3N2Zz4%3D)](https://github.com/just-shadyumbrella/wbt/contributors)

<p align="center">
  <img src="./web.whatsapp.com_.png" alt="" title="`/help` menu">
  <img src="./web.whatsapp.com_2.png" alt="" title="`/sticker` menu"/>
</p>
<sup>Example usage of WBT in chat</sup>
</div>

---

<br/>

## 🚩 Getting Started

<details>
<summary>

### ❇️ Prerequisites</summary>

- [NodeJS 20+](https://nodejs.org/en/download) or [Bun](https://bun.sh).

  > ⚠️ Deno is not supported (due to different environment that this project is built for).

  This project uses [WWeb.js](https://github.com/pedroslopez/whatsapp-web.js), which relies on [Puppeteer](https://pptr.dev) under the hood. Some media-related features (e.g., videos and GIFs) require you to provide the path to your **Google Chrome binary** in your shell environment or in [`.env`](./.env). See [this note](https://wwebjs.dev/guide/creating-your-bot/handling-attachments#caveat-for-sending-videos-and-gifs) for details.

> *Other details coming soon as this project isn't yet ready for future use.*

</details>
<details>
<summary>

### 💽 Installation</summary>

1. Clone this repository

```shell
git clone https://github.com/just-shadyumbrella/wbt.git
cd wbt
```

2. Install depedencies

```shell
npm install
# or
yarn install
# or
pnpm install

# with Bun
bun install
```

3. Start the backend

```shell
# Node.js
pnpm start:node

# Bun
bun start:bun
# or simply
bun run .
```

By default, the process shuts down automatically after ~5 hours and 50 minutes.

- [`main`](.) → timeout is measured against **system uptime**. Once uptime ≥ timeout, the process shuts down. This is intended for production-like environments (VMs, containers, or real systems) to ensure full memory cleanup. You will need to configure an external restart scheduler yourself.
- [`dev`](https://github.com/just-shadyumbrella/wbt/tree/dev) → timeout is measured from **process startup**. This mode is primarily for development.

You can adjust or remove this behavior in [`index.ts`](./index.ts).

</details>
<details>
<summary>

### 👤 Usage</summary>

Send `/help` to the client number for a list of available commands.
It works both from the bot itself and by other sender.

</details>

## 💼 Development

This project is still in its early stages and will continue to grow with more improvements and [planned features](./src/upcoming.md). Forks, suggestions, and contributions are always welcome! 🚀

### 🔧 Debugging

You can pass the `debug` argument to show up the browser window for debugging browser-related features.

```shell
# Node.js
pnpm build
node dist debug

# Bun
bun run . debug

```

For easier debugging, it is recommend switching to the [`dev`](https://github.com/just-shadyumbrella/wbt/tree/dev) branch, which provides a different setup environment.

## 🚫 Beware of Bans

Some users have reported WhatsApp bans when using automation tools. See related discussions here:

1. https://github.com/pedroslopez/whatsapp-web.js/issues/532#issuecomment-776235573
2. https://github.com/pedroslopez/whatsapp-web.js/issues/3594#issuecomment-2956618668
3. https://github.com/pedroslopez/whatsapp-web.js/issues/1872
4. More info in the [issue tracker](https://github.com/pedroslopez/whatsapp-web.js/issues?q=is%3Aissue%20ban).

---

<div align="center">

<sub>© 2025 [just-shadyumbrella](https://github.com/just-shadyumbrella). All rights reserved.</sub>

</div>

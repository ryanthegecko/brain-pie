# Brain Pie

A visual organiser for everything on your plate.

## What it is

Brain Pie is a free, privacy-first web app that structures your thoughts, projects, and life areas into an interactive pie chart. It runs entirely in the browser — no account, no server, no setup. You open it and start building.

The hierarchy goes four layers deep: **Categories** sit at the centre, **Slices** radiate outward, each Slice holds **Spokes**, and each Spoke can carry **Actions** beneath it. It sounds abstract until you see it; then it's immediately obvious.

## Features

- **Multiple pies** — separate boards for work, life, health, a team, a product, whatever you need
- **Four spoke types** — Static (standing reminders), Single (one-off tasks), Repeating (recurring tasks), List (containers for actions)
- **Calendar integration** — schedule spokes and actions to Google Calendar or Apple Calendar (.ics export)
- **Priority star system** — star any item; a floating priority window surfaces your top picks across all areas
- **Focus mode** — filter the chart down to prioritised items only
- **Treemap view** — alternative flat-grid layout when you're dealing with dense content
- **Import/export** — full JSON import and export with granular selection and smart merge
- **Fully offline** — works without a connection; your data stays on your device by default

## Storage

Brain Pie gives you three storage modes, so you can choose how much (or how little) leaves your machine.

**Browser localStorage** is the default. No sign-up, no configuration; your data lives in the browser and nowhere else. Good for personal use on a single device.

**Local file** saves to a `.json` file on your computer via the File System Access API. Works in Chrome and Edge. You pick where the file lives and it saves there automatically. Useful if you want a portable file you can back up or version yourself.

**Firebase live sync** connects Brain Pie to your own Firebase Realtime Database. Real-time sync across devices, optional team access, and full control because it's your Firebase project, not ours. There's also a **Firebase backup** option: if you're running on localStorage and just want an occasional off-device backup, you can push a snapshot to Firebase on demand without switching to live sync.

## Getting started

Go to [brainpie.app](https://brainpie.app). No sign-up required. Create your first pie, add a Category, start building Slices. Storage defaults to localStorage, so nothing leaves your browser until you decide otherwise.

## Links

- App: https://brainpie.app
- Source: https://github.com/ryanthegecko/brain-pie

<img src="docs/libastron-js.png" align="right" width="50%"/>

libastron-js
==========

![](https://img.shields.io/github/issues-pr-closed/Max-Rodriguez/libastron-js) ![](https://img.shields.io/github/last-commit/Max-Rodriguez/libastron-js) ![](https://img.shields.io/github/license/Max-Rodriguez/libastron-js)

An open source implementation of the Astron server Distributed Class protocol for Javascript clients running on either Chrome or NodeJS environments. Written in TypeScript.

This project is brand new, and will not be a complete project for a long time.

This is a long jump to create a Javascript client library for the Astron network protocol that can run on both the browser and a Node environment. (Clients on browser running this implementation's future Chrome version, and AI server-side Astron clients running on a NodeJS environment.)

**Note:** There is also the need for creating a fast proxy that bounces data from the client's secure websocket (WSS) connection over to a TCP connection so that clients can communicate with the Astron Client Agent server(s), while keeping the packets as light-weight as possible.

Read the full system / protocol documentation for the Astron server [here](https://github.com/Astron/Astron).

Installation
==========

The libastron-js repository will provide 2 different NPM packages once it reaches it's first release:
- `libastron-node`
- `libastron-chrome`

When the project matures (and a chrome version is written), a github workflow will handle publishing both packages.

The chrome release of the project will most likely have to be installed as a node module using [browserify](https://browserify.org/).

The following steps show how it _**will be**_ to install either package after the first release.
```shell
npm install libastron-node
npm install libastron-chrome
```

Or if you're using the **yarn** (NPM-based) package manager:
```shell
yarn add libastron-node
yarn add libastron-chrome
```

Astron Environment Diagram
==========

This is an abstract diagram; I have not replicated this environment, but it conveys the idea.

![Astron Development Environment Diagram](docs/astron-production-diagram.png)

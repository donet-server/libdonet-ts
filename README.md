<img src="logo/astron.libts.png" align="right" width="50%"/>

astron.libts
==========

![](https://img.shields.io/discord/1066973060357443644?color=blue&label=Discord&logo=discord&logoColor=white) ![](https://img.shields.io/github/last-commit/Max-Rodriguez/astron.libts) ![](https://img.shields.io/github/license/Max-Rodriguez/astron.libts)

An open source implementation of the Astron server Distributed Class protocol for Javascript clients running on either Chrome or NodeJS environments. Written in TypeScript.

This project is brand new, and will not be a complete project for a long time.

This is a long jump to create a Javascript client library for the Astron network protocol that can run on both the browser and a Node environment. (Clients on browser running this implementation's future Chrome version, and AI server-side Astron clients running on a NodeJS environment.)

**Note:** There is also the need for creating a fast proxy that bounces data from the client's secure websocket (WSS) connection over to a TCP connection so that clients can communicate with the Astron Client Agent server(s), while keeping the packets as light-weight as possible.

Read the full system / protocol documentation for the Astron server [here](https://github.com/Astron/Astron).

**MAJOR MISSING FEATURES:**

- Reading/writing multiple datagrams in one packet
- Client Repository (including LegacyHash for CLIENT_HELLO handshake)
- Accept Secure Websocket (WSS) connections from the Astron Client Agent
- Lots of Astron Internal messages
- Packing / Unpacking of REQUIRED & OTHER fields

Getting Started
=============

The major component to an MMO powered by Astron is the Astron daemon itself.

Before starting, compile the latest build of Astron using the instructions [here.](https://github.com/Astron/Astron/blob/master/docs/building/build-readme.md)

**NOTE:** As of April 2023, there is an issue in the Astron client agent where adding
interest to a client results in a timeout and then a segmentation fault occurs due to
a memory access violation. I'm trying to work out this issue, but for now please build
Astron using the `-DCMAKE_BUILD_TYPE=Debug` flag. This lowers the chance of an Interest Operation timeout.

Installation
==========

The libastron-js repository will provide 2 different NPM packages once it reaches it's first release:
- `astron.node`
- `astron.chrome`

When the project matures (and a chrome version is written), a github workflow will handle publishing both packages.

The chrome release of the project will most likely have to be installed as a node module using [browserify](https://browserify.org/).

The following steps show how it _**will be**_ to install either package after the first release.
```shell
npm install astron.node
npm install astron.chrome
```

Or if you're using the **yarn** (NPM-based) package manager:
```shell
yarn add astron.node
yarn add astron.chrome
```

API Documentation
==========

#### To view the astron.libts documentation in rendered HTML, [click here.](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Max-Rodriguez/astron.libts/master/docs/index.html)

Contributing
==========

We encourage the community to submit code contributions by creating pull requests from your own fork of the project!
Before writing your first contribution, please read the project [contributing guidelines](CONTRIBUTING.md).

Feel free to join our community [discord server](https://discord.gg/T6jGjEutfy) for live chat / development help.

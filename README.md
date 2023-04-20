<img src="logo/astron.libts.png" align="right" width="50%"/>

astron.libts
==========

![](https://img.shields.io/discord/1066973060357443644?color=blue&label=Discord&logo=discord&logoColor=white) ![](https://img.shields.io/github/last-commit/Max-Rodriguez/astron.libts) ![](https://img.shields.io/github/license/Max-Rodriguez/astron.libts)

An open source implementation of the Astron server Distributed Class protocol for Javascript clients running on a NodeJS environment. Written in TypeScript.

Read the full system / protocol documentation for the Astron server [here](https://github.com/Astron/Astron).

**MAJOR MISSING FEATURES:**

- Reading/writing multiple datagrams in one packet
- Client Repository (including LegacyHash for CLIENT_HELLO handshake)
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

The astron.libts repository will be released as an NPM package once it reaches it's first release: `astron.libts`

The following steps show how it _**will be**_ to install the npm package after the first release.
```shell
npm install astron.libts
```

Or if you're using the **yarn** (NPM-based) package manager:
```shell
yarn add astron.libts
```

API Documentation
==========

#### To view the astron.libts documentation in rendered HTML, [click here.](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Max-Rodriguez/astron.libts/master/docs/index.html)

Contributing
==========

We encourage the community to submit code contributions by creating pull requests from your own fork of the project!
Before writing your first contribution, please read the project [contributing guidelines](CONTRIBUTING.md).

Feel free to join our community [discord server](https://discord.gg/T6jGjEutfy) for live chat / development help.

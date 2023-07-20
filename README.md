<img src="logo/libdonet-ts.png" align="right" width="50%"/>

libdonet-ts
==========

![](https://img.shields.io/discord/1066973060357443644?color=blue&label=Discord&logo=discord&logoColor=white) ![](https://img.shields.io/github/last-commit/donet-server/libdonet-ts) ![](https://img.shields.io/github/license/donet-server/libdonet-ts)

An open source implementation of the DoNet internal protocol for Javascript applications running on the NodeJS environment. Written in TypeScript.

Read the full system / protocol documentation for the DoNet server [here](https://github.com/donet-server/donet).

**MAJOR MISSING FEATURES:**

- Mapping DClass fields to DistributedObject instance
- Reading/writing multiple datagrams in one packet
- Client Repository (including LegacyHash for CLIENT_HELLO handshake)
- Lots of internal messages
- Packing / Unpacking of REQUIRED & OTHER fields

Getting Started
=============

The major component to an MMO powered by DoNet is the DoNet daemon itself. At this time, DoNet is under development so you can use Astron instead.

Before starting, compile the latest build of Astron using the instructions [here.](https://github.com/Astron/Astron/blob/master/docs/building/build-readme.md)

**NOTE:** As of April 2023, there is an issue in the Astron client agent where adding
interest to a client results in a timeout and then a segmentation fault occurs due to
a memory access violation. I'm trying to work out this issue, but for now please build
Astron using the `-DCMAKE_BUILD_TYPE=Debug` flag. This lowers the chance of an Interest Operation timeout.

Installation
==========

The libdonet-ts repository will be released as an NPM package once it reaches it's first release: `libdonet-ts`

The following steps show how it _**will be**_ to install the npm package after the first release.
```shell
npm install libdonet-ts
```

Or if you're using the **yarn** (NPM-based) package manager:
```shell
yarn add libdonet-ts
```

API Documentation
==========

#### To view the libdonet-ts documentation in rendered HTML, [click here.](https://htmlpreview.github.io/?https://raw.githubusercontent.com/donet-server/libdonet-ts/master/docs/index.html)

Contributing
==========

We encourage the community to submit code contributions by creating pull requests from your own fork of the project!
Before writing your first contribution, please read the project [contributing guidelines](CONTRIBUTING.md).

Feel free to join our community [discord server](https://discord.gg/T6jGjEutfy) for live chat / development help.

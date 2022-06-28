Astron Test Environment
==========

This directory contains an example Python client / AI astron environment for testing.

**Note: This is not part of the package source code!**

Setting up the Astron daemon
==========

For this development environment, you will need to compile a single executable binary that contains the full bundled 
Astron server cluster to use for testing this library. Build instructions for the Astron binary can be found 
[here](https://github.com/Astron/Astron/blob/master/docs/building/build-readme.md).

Place the compiled binary file in the `astrond/` folder, which contains the .yml server configuration.
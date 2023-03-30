astron.libts Tests
==========

This directory holds the typescript files to test different modules of the implementation.

There are two subdirectories, `astrond` and `example`.

The `astrond` directory is where your compiled Astron daemon binary should
be placed to run the Astron cluster for running the example Astron program.

The `example` directory contains the example Astron application, both server and client sides.
There should be client and server (or service) files written in Python. This is
our starting point before beginning to rewrite the example in TS using our implementation.

**Note: This is not part of the package source code!**

Setting up the Astron daemon
==========

For this development environment, you will need to compile a single executable binary that contains the full bundled 
Astron server cluster to use for testing this library. Build instructions for the Astron binary can be found 
[here](https://github.com/Astron/Astron/blob/master/docs/building/build-readme.md).

Place the compiled binary file in the `astrond` folder, which contains the .yml cluster configuration for testing.
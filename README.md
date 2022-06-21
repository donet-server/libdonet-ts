# libastron-js
An open source implementation of the Astron server Distributed Object system for Javascript clients that run on either a browser or on a NodeJS environment. Written in TypeScript.

This project is brand new, and will not be a complete project for a long time.

This is a long jump to create a javascript client for Astron that can run on both the browser and a Node environment. (Clients on browser running the ThreeJS 3D engine, and AI server-side Astron clients running on a NodeJS environment.)

**Note:** There is also the need for creating a fast proxy that bounces data from the client's secure websocket (WSS) connection over to a TCP connection so that clients can communicate with the Astron Client Agent server(s), while keeping the packets as light-weight as possible.

# Development Environment Diagram
This is an abstract diagram; I have not replicated this environment, but it conveys the idea.

![Astron Development Environment Diagram](docs/astron-development-diagram.png)

# Production Environment Diagram
This is an abstract diagram; I have not replicated this environment, but it conveys the idea.

![Astron Development Environment Diagram](docs/astron-production-diagram.png)
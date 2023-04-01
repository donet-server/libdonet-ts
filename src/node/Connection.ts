/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, MD_PORT } from './globals'
import * as error from './Errors'
import * as buffer from 'node:buffer'
import * as net from 'node:net'
import * as os from 'node:os'

export class Connection {
    private __DEBUG__: boolean = MODULE_DEBUG_FLAGS.CONNECTION
    private readonly host: string
    private readonly port: number
    private connected: boolean = false
    private socket: net.Socket

    constructor(host: string = "127.0.0.1", port: number = MD_PORT) {
        this.host = host; this.port = port;
        this.socket = new net.Socket()
        this.socket.on('connect', this.on_connect)
        this.socket.on('data', this.read_data)
        this.socket.on('error', this.socket_error)
        this.socket.connect({port: this.port, host: this.host})
    }

    private notify(msg: string): void {
        if (!this.__DEBUG__) return
        console.log(`${this.constructor.name}: ${msg}`)
    }

    private socket_error(err: Error): void {
        if (err.message.includes('ECONNREFUSED'))
            throw new error.AstronConnectionRefused // throw our own error message
        else
            throw err // not handled, throw it
    }

    private on_connect(): void {
        return
    }

    private read_data(data: buffer.Buffer): void {
        // TODO: handle reading data, use Datagram
    }

    public disconnect(): void {
        this.socket.destroy()
        this.connected = false
        this.notify("TCP socket closed!")
    }
    public is_connected(): boolean {
        return this.connected
    }
}

/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS } from './globals'
import * as error from './Errors'
import { Buffer } from 'node:buffer'

class DatagramBase {
    protected _DEBUG_: boolean = MODULE_DEBUG_FLAGS.DATAGRAM
    protected dg_buffer: Buffer = Buffer.alloc(0)

    public get_dg_size(): number {
        return this.dg_buffer.length
    }
    public get_dg_buffer(): Buffer {
        return this.dg_buffer
    }

    protected notify(msg: string): void {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }
}

export class Datagram extends DatagramBase {
    public add_data(buffers: Array<Buffer>): void {
        let buff_array: Array<Buffer> = [this.dg_buffer]
        for (let i = 0; i < buffers.length; i++)
            buff_array.push(buffers[i])
        this.dg_buffer = Buffer.concat(buff_array)
    }

    public add_datagram(datagram: Datagram): void {
        let datagram_buff: Buffer = datagram.get_dg_buffer()
        this.add_data([datagram_buff])
    }

    public add_bool(data: boolean): void {
        let bool: Buffer = Buffer.alloc(1) // 1 byte = 8 bits
        if (data) bool.writeUInt8(1, 0)
        else bool.writeUInt8(0, 0)
        this.add_data([bool])
    }

    public add_string(data: string): void {
        let string_buff: Buffer = Buffer.from(data, 'ascii')
        let str_byte_len: number = string_buff.length
        // check that the string is not too large!
        if (str_byte_len > (2 ** 16)) throw new error.DatagramStringOutOfRange()
        let size_tag: Buffer = this.create_size_tag(str_byte_len)
        this.add_data([size_tag, string_buff])
    }

    public add_int8(data: number): void {
        // first check that number is in range (both signed/unsigned max range)
        if ((data > (2 ** 8)) || (data < (2 ** 7))) throw new error.DatagramIntOutOfRange()
        let int8: Buffer = Buffer.alloc(1) // 1 byte = 8 bits
        let signed: boolean = (data < 0)
        if (signed) int8.writeInt8(data, 0)
        else int8.writeUint8(data, 0)
        this.add_data([int8])
    }

    public add_int16(data: number): void {
        if ((data > (2 ** 16)) || (data < (2 ** 15))) throw new error.DatagramIntOutOfRange()
        let int16: Buffer = Buffer.alloc(2) // 2 bytes = 16 bits
        let signed: boolean = (data < 0)
        if (signed) int16.writeInt16LE(data, 0)
        else int16.writeUInt16LE(data, 0)
        this.add_data([int16])
    }

    public add_int32(data: number): void {
        if ((data > (2 ** 32)) || (data < (2 ** 31))) throw new error.DatagramIntOutOfRange()
        let int32: Buffer = Buffer.alloc(4) // 4 bytes = 32 bits
        let signed: boolean = (data < 0)
        if (signed) int32.writeInt32LE(data, 0)
        else int32.writeUInt32LE(data, 0)
        this.add_data([int32])
    }

    public add_int64(data: bigint): void {
        if ((data > (2 ** 64)) || (data < (2 ** 63))) throw new error.DatagramIntOutOfRange()
        let int64: Buffer = Buffer.alloc(8) // 8 bytes = 64 bits
        let signed: boolean = (data < 0)
        if (signed) int64.writeBigInt64LE(data, 0)
        else int64.writeBigUint64LE(data, 0)
        this.add_data([int64])
    }

    public add_blob(data: Buffer): void {
        throw new error.NotImplemented()
    }

    private create_size_tag(size: number): Buffer {
        let size_uint16: Buffer = Buffer.alloc(2) // 2 bytes = 16 bits
        size_uint16.writeUint16LE(size_uint16.length, 0) // writing little-endian order
        return size_uint16
    }
}

export class DatagramIterator extends DatagramBase {
    constructor() {
        super()
    }
}
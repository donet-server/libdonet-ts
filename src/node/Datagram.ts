/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import {MODULE_DEBUG_FLAGS} from './globals'
import * as error from './Errors'
import {Buffer} from 'node:buffer'

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
    /*
        Something to note is that there are only `add_int` methods
        and no `add_uint` methods. This is because the `add_int` methods
        automatically check if the given number is signed, and write
        it as a signed or unsigned integer accordingly.
     */
    constructor() {
        super()
    }
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
        if (data) this.add_int8(1)
        else this.add_int8(0)
    }

    public add_char(data: string): void {
        if (data.length > 1) throw new error.DatagramCharOutOfRange()
        let char_buff: Buffer = Buffer.from(data, 'ascii')
        this.add_int8(char_buff.readUInt8(0))
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
        if ((data > (2 ** 8)) || (data < ((2 ** 7) * -1))) throw new error.DatagramIntOutOfRange()
        let int8: Buffer = Buffer.alloc(1) // 1 byte = 8 bits
        let signed: boolean = (data < 0)
        if (signed) int8.writeInt8(data, 0)
        else int8.writeUint8(data, 0)
        this.add_data([int8])
    }

    public add_int16(data: number): void {
        if ((data > (2 ** 16)) || (data < ((2 ** 15) * -1))) throw new error.DatagramIntOutOfRange()
        let int16: Buffer = Buffer.alloc(2) // 2 bytes = 16 bits
        let signed: boolean = (data < 0)
        if (signed) int16.writeInt16LE(data, 0)
        else int16.writeUInt16LE(data, 0)
        this.add_data([int16])
    }

    public add_int32(data: number): void {
        if ((data > (2 ** 32)) || (data < ((2 ** 31) * -1))) throw new error.DatagramIntOutOfRange()
        let int32: Buffer = Buffer.alloc(4) // 4 bytes = 32 bits
        let signed: boolean = (data < 0)
        if (signed) int32.writeInt32LE(data, 0)
        else int32.writeUInt32LE(data, 0)
        this.add_data([int32])
    }

    public add_int64(data: bigint): void {
        if ((data > (2 ** 64)) || (data < ((2 ** 63) * -1))) throw new error.DatagramIntOutOfRange()
        let int64: Buffer = Buffer.alloc(8) // 8 bytes = 64 bits
        let signed: boolean = (data < 0)
        if (signed) int64.writeBigInt64LE(data, 0)
        else int64.writeBigUint64LE(data, 0)
        this.add_data([int64])
    }

    public add_float32(data: number): void {
        // TODO: Check that number is in range
        let float32: Buffer = Buffer.alloc(4) // 4 bytes = 32 bits
        float32.writeFloatLE(data, 0)
        this.add_data([float32])
    }

    public add_float64(data: number): void {
        // TODO: Check that number is in range
        let float64: Buffer = Buffer.alloc(8) // 8 bytes = 64 bits
        float64.writeDoubleLE(data, 0)
        this.add_data([float64])
    }

    public add_blob(data: Buffer): void {
        // check that the blob is not too large!
        if (data.length > (2 ** 16)) throw new error.DatagramBlobOutOfRange()
        let size_tag: Buffer = this.create_size_tag(data.length)
        this.add_data([size_tag, data])
    }

    private create_size_tag(size: number): Buffer {
        let size_uint16: Buffer = Buffer.alloc(2) // 2 bytes = 16 bits
        size_uint16.writeUint16LE(size, 0) // writing little-endian order
        return size_uint16
    }
}

export class DatagramIterator extends DatagramBase {
    private dg_offset: number = 0 // bytes; incremented every read

    constructor(dg: Datagram) {
        super()
        this.dg_buffer = dg.get_dg_buffer()
    }

    private check_read_length(bytes: number): void {
        if ((this.dg_offset + bytes) > this.dg_buffer.length)
            throw new error.DatagramIteratorReadOutOfRange()
    }

    public read_data(bytes: number): Buffer {
        this.check_read_length(bytes)
        let data_buff: Buffer = this.dg_buffer.subarray(this.dg_offset, this.dg_offset + bytes)
        this.dg_offset += bytes
        return data_buff
    }

    public read_remaining(): Buffer {
        return this.read_data(this.remaining())
    }
    public remaining(): number {
        return this.get_dg_size() - this.dg_offset
    }
    public tell(): number {
        return this.dg_offset
    }
    public seek(offset: number): void {
        this.dg_offset = offset
    }

    public read_bool(): boolean {
        let data: number = this.read_uint8()
        return !!data
    }

    public read_char(): string {
        let data: Buffer = this.read_data(1)
        return data.toString('ascii', 0, data.length)
    }

    public read_string(): string {
        let size: number = this.read_uint16() // read size tag
        let data: Buffer = this.read_data(size)
        return data.toString('ascii', 0, data.length)
    }

    public read_int8(): number {
        let data: Buffer = this.read_data(1) // 1 byte = 8 bits
        return data.readInt8(0)
    }

    public read_int16(): number {
        let data: Buffer = this.read_data(2) // 2 bytes = 16 bits
        return data.readInt16LE(0) // read bytes in little-endian order
    }

    public read_int32(): number {
        let data: Buffer = this.read_data(4) // 4 bytes = 32 bits
        return data.readInt32LE(0)
    }

    public read_int64(): bigint {
        let data: Buffer = this.read_data(8) // 8 bytes = 64 bits
        return data.readBigInt64LE(0)
    }

    public read_uint8(): number {
        let data: Buffer = this.read_data(1) // 1 byte = 8 bits
        return data.readUInt8(0)
    }

    public read_uint16(): number {
        let data: Buffer = this.read_data(2) // 2 bytes = 16 bits
        return data.readUInt16LE(0)
    }

    public read_uint32(): number {
        let data: Buffer = this.read_data(4) // 4 bytes = 32 bits
        return data.readUInt32LE(0)
    }

    public read_uint64(): bigint {
        let data: Buffer = this.read_data(8) // 8 bytes = 64 bits
        return data.readBigUInt64LE(0)
    }

    public read_float32(): number {
        let data: Buffer = this.read_data(4) // 4 bytes = 32 bits
        return data.readFloatLE()
    }

    public read_float64(): number {
        let data: Buffer = this.read_data(8) // 8 bytes = 64 bits
        return data.readDoubleLE()
    }

    public read_blob(): Buffer {
        let size: number = this.read_uint16() // read size tag
        return this.read_data(size)
    }
}
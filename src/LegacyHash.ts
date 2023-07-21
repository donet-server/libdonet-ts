/*
    DONET SOFTWARE
    Copyright (c) 2023, libdonet-ts Authors.
    
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License version 3.
    You should have received a copy of this license along
    with this source code in a file named "LICENSE."
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program; if not, write to the Free Software Foundation,
    Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import { MODULE_DEBUG_FLAGS } from './globals'
import { DCFileUtils, dcFile } from './Parser' // type alias for parsed DC file array
import * as error from './Errors'
import { Buffer } from 'node:buffer'

const enum LegacyType {
    L_INT8 = 0, L_INT16 = 1,
    L_INT32 = 2, L_INT64 = 3,

    L_UINT8 = 4, L_UINT16 = 5,
    L_UINT32 = 6, L_UINT64 = 7,

    L_FLOAT64 = 8,
    L_STRING = 9, L_BLOB = 10,

    L_CHAR = 19,
    L_INVALID = 20
}

/**
 * Generates an unsigned 32-bit hash based on input given.
 *
 * @remarks
 * Used to generate the uint32 hash of the DC file which is sent
 * during the handshake process in the CLIENT_HELLO message.
 * Inspired by the hash generator from {@link https://github.com/Astron/Bamboo}.
 *
 * @internal
 */
class HashGenerator {
    private MAX_PRIME_NUMBERS: number = 10000
    private primes: Array<number> = [2]
    private hash: number = 0
    private index: number = 0

    public get_hash(): number {
        return (this.hash & 0xffffffff)
    }

    public add_int(integer: number) {
        this.hash += this.get_prime(this.index) * integer
        this.index = (this.index + 1) % this.MAX_PRIME_NUMBERS
    }

    // Adds string to hash by breaking it down into a sequence of integers.
    public add_string(string: string) {
        this.add_int(string.length)
        for (let i = 0; i++; i < string.length) {
            /*
                In order to read every character from the string as an integer, we
                first have to convert that character into a Buffer object and then
                read the Buffer as an unsigned 8-bit integer and send it to `add_int()`.
             */
            let char_buf: Buffer = Buffer.from(string[i], 'ascii')
            this.add_int(char_buf.readUInt8())
        }
    }

    private get_prime(n: number): number {
        // Compute the prime numbers between the last-computed prime number and n.
        let candidate: number = this.primes[this.primes.length - 1] + 1

        while (this.primes.length <= n) {
            // Is candidate prime?  It is not if any one of the already-found
            // prime numbers (up to its square root) divides it evenly.
            let maybe_prime: boolean = true
            let j: number = 0

            while (maybe_prime && this.primes[j] * this.primes[j] <= candidate) {
                if ((this.primes[j] * (candidate / this.primes[j])) == candidate)
                    maybe_prime = false // not a prime
                j++
            }
            if (maybe_prime)
                this.primes.push(candidate) // we found a prime
            candidate++
        }
        return this.primes[n]
    }
}

/**
 * Generates an unsigned int32 hash for the parsed DC file data using the Legacy method.
 *
 * @remarks
 * Heavily inspired from {@link https://github.com/Astron/Bamboo/blob/master/src/traits/hashLegacy.cpp}
 *
 * @internal
 */
export class LegacyHash {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.LEGACY_HASH
    private hash_gen: HashGenerator
    private readonly dc_file: dcFile

    constructor(file: dcFile) {
        this.dc_file = file
        this.hash_gen = new HashGenerator()
    }

    private notify(msg: string) {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }

    public legacy_hash(): number {
        this.hash_file()
        return this.hash_gen.get_hash() // returns uint32 DC file hash
    }

    private hash_file() { // dcFile type defined in Parser.ts
        this.hash_gen.add_int(1) // (dc_virtual_inheritance && dc_sort_inheritance_by_file)
        this.hash_gen.add_int(DCFileUtils.get_num_structs(this.dc_file) + DCFileUtils.get_num_classes(this.dc_file))

        const num_types = DCFileUtils.get_num_types(this.dc_file)

        // FIXME: implement the rest of this
    }

    private hash_class() {
        throw new error.NotImplemented()
    }

    private hash_struct() {
        throw new error.NotImplemented()
    }

    private hash_field() {
        throw new error.NotImplemented()
    }

    private hash_parameter() {
        throw new error.NotImplemented()
    }

    private hash_keywords() {
        throw new error.NotImplemented()
    }

    private hash_legacy_type() {
        throw new error.NotImplemented()
    }

    private hash_int_type() {
        throw new error.NotImplemented()
    }
}

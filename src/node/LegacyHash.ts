/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import {MODULE_DEBUG_FLAGS} from './globals'
import * as buffer from 'node:buffer'

// Generates a 32-bit hash based on input given; Inspired by Bamboo's hash gen.
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
            let char_buf: buffer.Buffer = Buffer.from(string[i], 'ascii')
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

export class LegacyHash {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.LEGACY_HASH

    private notify(msg: string) {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }
}
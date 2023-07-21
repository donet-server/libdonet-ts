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

import { ESC_COLOR } from './globals'

export function sleep_milliseconds(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function color_string(str: string, color: ESC_COLOR): string {
    return `${color}${str}${ESC_COLOR.RESET}`
}

export function unique_uint64(): bigint {
    // you're dead by the time Date().valueOf() surpasses 2^64 :)
    return BigInt(new Date().valueOf())
}

export function unique_uint32(): number {
    /*
        100% unique if not called within the same millisecond!
        But it's not a huge issue if that happens, since we can just generate again.

        Every 7.1015 weeks, 4294967296 milliseconds go by (which is MAX of uint32).
        So every ~7 weeks, allocated ID's start from 0 again. This means that every
        ~7 weeks, the chance of this function returning the same ID as an existing
        DO ID (if a DO has been existing for 7 weeks) increases VERY slightly.
        So for the first ~7 weeks, all IDs are 100% unique if not generated
        in the same millisecond. We cannot use an ID over 2^32 because IDs
        have to be unsigned 32-bit integers, as defined in the specification.
     */
    return new Date().valueOf() % (2 ** 32)
}

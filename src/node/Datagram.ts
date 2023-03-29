/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import {MODULE_DEBUG_FLAGS} from "./globals";
import * as net from 'node:net'

export class Datagram {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.DATAGRAM

    private notify(msg: string) {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }
}

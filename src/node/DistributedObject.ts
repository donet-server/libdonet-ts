/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS } from './globals'

export class DistributedObject {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.DIST_OBJECT

    constructor() {
        return // FIXME: Implement
    }

    private notify(msg: string): void {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }

    protected generate(): void {
        this.notify(`The generate() method for ${this.constructor.name}` +
                    `was not over-ridden by the developer.`)
        return // this function is intended to be over-ridden by the user
    }
}
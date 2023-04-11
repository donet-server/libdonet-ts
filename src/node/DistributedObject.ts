/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, channel, doID } from './globals'
import { Repository } from './ObjectRepository'
import { DatagramIterator } from './Datagram'
import * as error from './Errors'

/**
 * Represents a view of a Distributed Object present in the StateServer.
 *
 * @param repository - The `ClientRepository`/`InternalRepository` that created this view.
 * @param dclass_id - The DClass ID of the Distributed Class this Distributed Object represents.
 * @param do_id - The doID of the Distributed Object instance.
 * @param parent - The parent ID of the object.
 * @param zone - The zone ID of the object.
 *
 * @public
 */
export class DistributedObject {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.DISTRIBUTED_OBJECT
    public readonly repo: Repository
    public readonly dclass_id: number
    public readonly do_id: doID
    private parent: doID
    private zone: number

    constructor(repository: Repository, dclass_id: number, do_id: doID, parent: doID, zone: number) {
        this.repo = repository; this.dclass_id = dclass_id;
        this.do_id = do_id; this.parent = parent; this.zone = zone;
        this.generate()
    }

    private notify(msg: string): void {
        if (!this._DEBUG_) return
        console.log(`${this.constructor.name}: ${msg}`)
    }

    /**
     * Called on creation of the Distributed Object view. Intended to be over-ridden.
     * @virtual
     */
    protected generate(): void {
        this.notify(`The generate() method for ${this.constructor.name} ` +
                    `was called, but not over-ridden by the developer.`)
    }

    /**
     * Called on deletion of the Distributed Object view. Intended to be over-ridden.
     * @virtual
     */
    protected delete(): void {
        this.notify(`The delete() method for ${this.constructor.name} ` +
                    `was called, but not over-ridden by the developer.`)
    }

    protected update_field(sender: channel, field_id: number, dgi: DatagramIterator): void {
        throw new error.NotImplemented()
    }
}
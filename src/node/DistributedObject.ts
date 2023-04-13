/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, INTERNAL_MSG, AstronProtocol } from './globals'
import { Datagram, DatagramIterator } from './Datagram'
import { Repository } from './ObjectRepository'
import { channel, doID } from './globals'
import { dcFile } from './Parser'
import * as error from './Errors'

type DClassMethodMapEntry = Array<string | Array<string>> // field_name, keywords[], values[]

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
    private dclass_method_map: Array<DClassMethodMapEntry> = []
    public readonly repo: Repository
    public readonly dclass_id: number
    public readonly do_id: doID
    private parent: doID
    private zone: number

    constructor(repository: Repository, dclass_id: number, do_id: doID, parent: doID, zone: number) {
        this.repo = repository; this.dclass_id = dclass_id;
        this.do_id = do_id; this.parent = parent; this.zone = zone;
        // @ts-ignore  All repositories have this method.
        let dc_file_data: dcFile = this.repo.get_parsed_dc_file()
        // @ts-ignore  All repositories have this method.
        let dclass_name: string = this.repo.dclass_id_to_name(dclass_id)

        // Get the dclass properties from the DC file
        let dclass_properties: Array<Array<string | Array<any>>> = []
        for (let i = 0; i < dc_file_data.length; i++) {
            let dc_object: Array<string | Array<any>> = dc_file_data[i]
            if (dc_object[0] !== 'dclass') continue
            if (dc_object[1] === dclass_name) {
                dclass_properties[2] = dc_object; break;
            }
            if (i === (dc_file_data.length - 1)) throw new error.DistributedClassNotFound()
        }

        for (let i = 0; i < dclass_properties.length; i++) {
            let dc_object: Array<string | Array<any>> = dclass_properties[i]
            if (dc_object[0] !== 'function') continue
            dc_object = dc_object.slice(1) // cut 'function' token
            this.dclass_method_map.push(dc_object)
        }
        // console.dir(this.dclass_method_map, {depth: null})
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
    public generate(): void {
        this.notify(`The generate() method for ${this.constructor.name} ` +
                    `was called, but not over-ridden by the developer.`)
    }

    /**
     * Called on deletion of the Distributed Object view. Intended to be over-ridden.
     * @virtual
     */
    public delete(): void {
        this.notify(`The delete() method for ${this.constructor.name} ` +
                    `was called, but not over-ridden by the developer.`)
    }

    /**
     * Updates the specified field of the Distributed Object.
     * This method is used internally by the Repository instance's handlers.
     *
     * @param sender - The channel ID (uint64) of the sender who issued this field update.
     * @param field_id - The field ID (uint16) of the Distributed Class.
     * @param dgi - The `DatagramIterator` instance to read the values from.
     *
     * @internal
     */
    public update_field(sender: channel, field_id: number, dgi: DatagramIterator): void {
        throw new error.NotImplemented()
    }

    /**
     * Sends a field update for this Distributed Object to the Astron cluster.
     *
     * @param field_name - The name of the Distributed Object's field you wish to update.
     * @param values - The value(s) of the field. If multiple values, use an array.
     *
     * @public
     */
    public send_update(field_name: string, values: any | Array<any>): void {
        throw new error.NotImplemented()
    }

    /**
     * Ejects the client from the Astron virtual world with a reason.
     *
     * @remarks
     * You may be confused why this is accessible to a `ClientRepository` on the NodeJS implementation.
     * The reason I did this was to keep a single `DistributedObject` class for all repositories to use.
     * This method will perform a check to make sure it's repository is of `InternalRepository` before continuing.
     * If not, it throws the `SuspiciousClientBehavior` error. (Either way, the Astron CA will eject the
     * client if it tries to send this message) This method will be removed in the chrome implementation,
     * since no Internal repositories will run on the browser.
     *
     * @param client - The channel ID (uint64) of the client to eject.
     * @param disconnect_code - The disconnect code to send to the Astron Client Agent.
     * @param reason - A string message describing the reason for the client eject.
     *
     * @public
     */
    public eject_client(client: channel, disconnect_code: number, reason: string): void {
        // @ts-ignore  All repository classes have this; Not sure why it freaks out.
        if (this.repo.protocol === AstronProtocol.Client)
            throw new error.SuspiciousClientBehavior()
        // @ts-ignore  We've checked the repo instance type.
        let dg: Datagram = this.repo.create_message_stub([client], this.do_id)
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_EJECT)
        dg.add_int16(disconnect_code)
        dg.add_string(reason)
        // @ts-ignore  We've checked the repo instance type.
        this.repo.send_datagram(dg)
    }

    /**
     * Drops the client connection from the Astron Client Agent without reason.
     *
     * @remarks
     * Please read the remarks section of the `eject_client` method for more details.
     *
     * @param client - The channel ID (uint64) of the client to drop.
     *
     * @public
     */
    public drop_client(client: channel): void {
        // @ts-ignore  All repository classes have this; Not sure why it freaks out.
        if (this.repo.protocol === AstronProtocol.Client)
            throw new error.SuspiciousClientBehavior()
        // @ts-ignore  We've checked the repo instance type.
        let dg: Datagram = this.repo.create_message_stub([client], this.do_id)
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_DROP)
        // @ts-ignore  We've checked the repo instance type.
        this.repo.send_datagram(dg)
    }

    // ------------ Getters ------------ //

    public get_parent(): doID {
        return this.parent
    }
    public get_zone(): doID {
        return this.zone
    }
}
/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { CA_PORT, INTERNAL_MSG, MD_PORT, MODULE_DEBUG_FLAGS, channel } from './globals'
import { dcFile, Parser } from './Parser'
import { Connection } from './Connection'
import { DistributedObject } from './DistributedObject'
import { Datagram, DatagramIterator } from './Datagram'
import * as error from './Errors'

export type Repository = ObjectRepository | InternalRepository | ClientRepository
type InternalHandler = (dgi: DatagramIterator, sender: channel, recipients: Array<channel>)=>void

export class ObjectRepository extends Connection {
    protected _DEBUG_: boolean = MODULE_DEBUG_FLAGS.OBJECT_REPO
    protected dc_file: dcFile
    protected distributed_objects: Array<DistributedObject> = []
    protected owner_views: Array<DistributedObject> = []
    protected handlers: Array<Array<INTERNAL_MSG | InternalHandler>> = []
    protected msg_to_response_map: Array<Array<INTERNAL_MSG>>
    protected context_counters: Array<Array<INTERNAL_MSG | number>>
    protected callbacks: Array<(void)> = []

    protected dg_poll_rate: number = 30.0 // polls per second
    protected tasks: Array<()=>void> = [] // called per poll

    constructor(dc_file: string, success: (repo: Repository)=>void,
                failure: (err: Error)=>void, host: string, port: number) {

        super(host, port, success, failure) // open the TCP socket connection
        this.dc_file = new Parser().parse_file(dc_file)

        this.msg_to_response_map = [
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELD        , INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELD_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELDS       , INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELDS_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ALL          , INTERNAL_MSG.STATESERVER_OBJECT_GET_ALL_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_LOCATION     , INTERNAL_MSG.STATESERVER_OBJECT_GET_LOCATION_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_AI           , INTERNAL_MSG.STATESERVER_OBJECT_GET_AI_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_OWNER        , INTERNAL_MSG.STATESERVER_OBJECT_GET_OWNER_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONE_COUNT   , INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONE_COUNT_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONES_COUNT  , INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONES_COUNT_RESP],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_CHILD_COUNT  , INTERNAL_MSG.STATESERVER_OBJECT_GET_CHILD_COUNT_RESP],
            [INTERNAL_MSG.DBSS_OBJECT_GET_ACTIVATED           , INTERNAL_MSG.DBSS_OBJECT_GET_ACTIVATED_RESP],
            [INTERNAL_MSG.DBSERVER_CREATE_OBJECT              , INTERNAL_MSG.DBSERVER_CREATE_OBJECT_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELD           , INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELD_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELDS          , INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELDS_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_ALL             , INTERNAL_MSG.DBSERVER_OBJECT_GET_ALL_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EQUALS , INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EQUALS_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELDS_IF_EQUALS, INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELDS_IF_EQUALS_RESP],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EMPTY  , INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EMPTY_RESP],
        ]

        this.context_counters = [
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELD_RESP        , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_FIELDS_RESP       , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ALL_RESP          , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_LOCATION_RESP     , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_AI_RESP           , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_OWNER_RESP        , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONE_COUNT_RESP   , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONES_COUNT_RESP  , 0],
            [INTERNAL_MSG.STATESERVER_OBJECT_GET_CHILD_COUNT_RESP  , 0],
            [INTERNAL_MSG.DBSS_OBJECT_GET_ACTIVATED_RESP           , 0],
            [INTERNAL_MSG.DBSERVER_CREATE_OBJECT_RESP              , 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELD_RESP           , 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_FIELDS_RESP          , 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_GET_ALL_RESP             , 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EQUALS_RESP , 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELDS_IF_EQUALS_RESP, 0],
            [INTERNAL_MSG.DBSERVER_OBJECT_SET_FIELD_IF_EMPTY_RESP  , 0],
        ]
    }

    public poll_until_empty(): boolean {
        try {
            while (true) {
                const dg: Datagram | null = this.poll_datagram()
                if (dg !== null)
                    this.handle_datagram(dg)
                else break
            }
        } catch (err) {
            if (err == error.AstronConnectionRefused)
                return false // connection is closed, just return false
            throw err // we don't know this error, throw it
        }
        return true
    }

    public poll_forever(): void {
        /*  NOTE: This method is asynchronous.
            poll_forever() will keep polling datagrams `dg_poll_rate` / second.
            It also handles calling the repo's tasks every poll. */
        (async () => {
            try {
                while (true) {
                    const dg: Datagram | null = this.poll_datagram()
                    if (dg !== null)
                        this.handle_datagram(dg)
                    this.repo_poll_tasks()
                    // FIXME: calculate accurate delay time including poll time
                    await delay((1 / this.dg_poll_rate) * 1000)
                }
            } catch (err) {
                throw err // not handled, just throw it :)
            }
        })()
    }

    public set_poll_rate(rate: number): void {
        this.dg_poll_rate = rate // rate in Hz
    }
    public add_task(callback: () => void): void {
        this.tasks.push(callback)
    }
    protected repo_poll_tasks(): void {
        for (let i = 0; i < this.tasks.length; i++)
            this.tasks[i]()
    }
    protected handle_datagram(dg: Datagram) {
        this.notify('ObjectRepository.handle_datagram() was called, but was not overloaded.')
    }
}

export class InternalRepository extends ObjectRepository {
    protected ai_channel: channel
    protected ss_channel: channel = BigInt(400000)
    protected dbss_channel: channel = BigInt(400001)

    constructor(args: {dc_file: string, channel: number, success_callback: (repo: Repository)=>void,
                        failure_callback: (err: Error)=>void, stateserver?: number, dbss?: number},
                        host: string = "127.0.0.1", port: number = MD_PORT) {

        super(args.dc_file, args.success_callback, args.failure_callback, host, port)
        this.ai_channel = BigInt(args.channel)
        if (args.stateserver) this.ss_channel = BigInt(args.stateserver)
        if (args.dbss) this.dbss_channel = BigInt(args.dbss)

        this.handlers = [
            [INTERNAL_MSG.STATESERVER_OBJECT_SET_FIELD, this.handle_STATESERVER_OBJECT_SET_FIELD]
        ]
        // Declare our AI channel to the Astron cluster
        this.send_CONTROL_ADD_CHANNEL(this.ai_channel)
    }

    protected handle_datagram(dg: Datagram) {
        let dgi: DatagramIterator = new DatagramIterator(dg)
        let recipient_count: number = dgi.read_uint8()
        let recipients: Array<channel> = []
        for (let i = 0; i < recipient_count; i++) recipients.push(dgi.read_uint64())
        let sender: bigint = dgi.read_uint64()
        let msg_type: INTERNAL_MSG = dgi.read_uint16()

        for (let i = 0; i < this.handlers.length; i++) {
            if (this.handlers[i][0] === msg_type) {
                // @ts-ignore  We know that index '1' will always be of type `InternalHandler`
                this.handlers[i][1](dgi, sender, recipients); return;
            }
        }
        this.notify(`Received unhandled message type: ${msg_type}`)
    }

    protected create_message_stub(sender: channel, recipients: Array<channel>): Datagram {
        let dg: Datagram = new Datagram()
        dg.add_int8(recipients.length) // dg.add_int8() will write as unsigned integer
        for (let i = 0; i < recipients.length; i++)
            dg.add_int64(recipients[i])
        dg.add_int64(sender)
        return dg
    }

    // -------- Astron Internal Messages --------- //

    public send_CONTROL_ADD_CHANNEL(channel: channel): void {
        // Note: control messages don't have sender fields
        let dg: Datagram = new Datagram()
        dg.add_int8(1) // recipient count
        dg.add_int64(BigInt(1)) // control channel
        dg.add_int16(INTERNAL_MSG.CONTROL_ADD_CHANNEL)
        dg.add_int64(channel)
        this.send_datagram(dg)
    }

    public send_STATESERVER_OBJECT_SET_AI(do_id: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(do_id)])
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_SET_AI)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public send_STATESERVER_DELETE_AI_OBJECTS(): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.ss_channel])
        dg.add_int16(INTERNAL_MSG.STATESERVER_DELETE_AI_OBJECTS)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public send_STATESERVER_CREATE_OBJECT_WITH_REQUIRED(
        dclass_id: number, do_id: number, parent: number, zone: number): void {

        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.ss_channel])
        dg.add_int16(INTERNAL_MSG.STATESERVER_CREATE_OBJECT_WITH_REQUIRED)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        dg.add_int16(dclass_id)
        // FIXME: Add required fields
        this.send_datagram(dg)
    }

    public send_DBSERVER_CREATE_OBJECT(dclass_id: number, context: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.dbss_channel])
        dg.add_int16(INTERNAL_MSG.DBSERVER_CREATE_OBJECT)
        dg.add_int32(context)
        dg.add_int16(dclass_id)
        dg.add_int16(0)
        // FIXME: This is actually `uint16 field_count`, `[uint16 field_id, <VALUE>]*field_count`
        // and should be accessible via `create_distobj_db`
        this.send_datagram(dg)
    }

    public send_DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS(do_id: number, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(do_id)])
        dg.add_int16(INTERNAL_MSG.DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    public send_CLIENTAGENT_SET_STATE(ca: channel, state: number, sender: channel): void {
        if (sender === BigInt(0)) sender = this.ai_channel
        let dg: Datagram = this.create_message_stub(sender, [ca])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_SET_STATE)
        dg.add_int16(state)
        this.send_datagram(dg)
    }

    public send_CLIENTAGENT_ADD_SESSION_OBJECT(do_id: number, client: channel): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [client])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_SESSION_OBJECT)
        dg.add_int32(do_id)
        this.send_datagram(dg)
    }

    public send_CLIENTAGENT_ADD_INTEREST(
        client: channel, interest_id: number, parent: number, zone: number): void {

        let dg: Datagram = this.create_message_stub(this.ai_channel, [client])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_INTEREST)
        dg.add_int16(interest_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    public send_STATESERVER_OBJECT_SET_OWNER(do_id: number, owner: channel): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(do_id)])
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_SET_OWNER)
        dg.add_int64(owner)
        this.send_datagram(dg)
    }

    public send_STATESERVER_OBJECT_GET_ZONE_OBJECTS(context: number, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(parent)])
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONE_OBJECTS)
        dg.add_int32(context)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    // -------- Internal Message Handlers --------- //

    private handle_STATESERVER_OBJECT_SET_FIELD(dgi: DatagramIterator, sender: channel, recipients: Array<channel>) {
        return // FIXME: Implement
    }
}

export class ClientRepository extends ObjectRepository {
    constructor(dc_file: string, host: string = "127.0.0.1", port: number = CA_PORT) {
        super(dc_file, (repo: Repository)=>{}, (err: Error)=>{}, host, port) // FIXME: Callbacks
    }

    protected handle_datagram(dg: Datagram) {
        let dgi: DatagramIterator = new DatagramIterator(dg)
        throw new error.NotImplemented()
    }
}

function delay(ms: number): Promise<void> { // util function
    return new Promise( resolve => setTimeout(resolve, ms) );
}
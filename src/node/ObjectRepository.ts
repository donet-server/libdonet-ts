/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { CA_PORT, INTERNAL_MSG, MD_PORT, MODULE_DEBUG_FLAGS } from './globals'
import { dcFile, Parser } from './Parser'
import { Connection } from './Connection'
import { DistributedObject } from './DistributedObject'
import { Datagram, DatagramIterator } from './Datagram'
import * as error from './Errors'

export type channel = bigint
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

    constructor(dc_file: string, host: string, port: number) {
        super(host, port) // open the TCP socket connection
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
            return false // connection must be closed, just return false
        }
        return true
    }

    public poll_forever(): void {
        try {
            while (true) {
                const dg: Datagram | null = this.poll_datagram()
                if (dg !== null)
                    this.handle_datagram(dg)
            }
        } catch (err) {
            throw err // not handled, just throw it :)
        }
    }

    protected handle_datagram(dg: Datagram) {
        this.notify('ObjectRepository.handle_datagram() was called, but was not overloaded.')
    }
}

export class InternalRepository extends ObjectRepository {
    protected ai_channel: channel
    protected ss_channel: channel = BigInt(400000)
    protected dbss_channel: channel = BigInt(400001)

    constructor(args: {dc_file: string, channel: number, stateserver?: number, dbss?: number},
                host: string = "127.0.0.1", port: number = MD_PORT) {
        super(args.dc_file, host, port)
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

    // Send Internal Messages
    private send_CONTROL_ADD_CHANNEL(channel: channel): void {
        // Note: control messages don't have sender fields
        let dg: Datagram = new Datagram()
        dg.add_int8(1) // recipient count
        dg.add_int64(BigInt(1)) // control channel
        dg.add_int16(INTERNAL_MSG.CONTROL_ADD_CHANNEL)
        dg.add_int64(channel)
        this.send_datagram(dg)
    }

    // Internal message handlers
    private handle_STATESERVER_OBJECT_SET_FIELD(dgi: DatagramIterator, sender: channel, recipients: Array<channel>) {
        return // FIXME: Implement
    }
}

export class ClientRepository extends ObjectRepository {
    constructor(dc_file: string, host: string = "127.0.0.1", port: number = CA_PORT) {
        super(dc_file, host, port)
    }

    protected handle_datagram(dg: Datagram) {
        let dgi: DatagramIterator = new DatagramIterator(dg)
        throw new error.NotImplemented()
    }
}
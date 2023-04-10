/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, CA_PORT, MD_PORT, channel, doID } from './globals'
import { AstronProtocol, INTERNAL_MSG, CLIENT_MSG, RESERVED_CHANNELS, VIEW_TYPES } from './globals'
import { SS_DEFAULT, DBSS_DEFAULT } from './globals'
import { dcFile, Parser } from './Parser'
import { Connection } from './Connection'
import { DistributedObject } from './DistributedObject'
import { Datagram, DatagramIterator } from './Datagram'
import { unique_uint32, unique_uint64, sleep_milliseconds } from './Utils'
import * as process from 'node:process'
import * as error from './Errors'

export type Repository = ObjectRepository | InternalRepository | ClientRepository
type DClassViewMapEntry = Array<string | number | DistributedObject> // [class_name, dclass_id, class]
type InternalHandler = (dgi: DatagramIterator, sender: channel, recipients: Array<channel>)=>void

export class ObjectRepository extends Connection {
    protected _DEBUG_: boolean = MODULE_DEBUG_FLAGS.OBJECT_REPOSITORY
    protected protocol: AstronProtocol = AstronProtocol.default
    protected dc_file: dcFile
    protected dclass_id_map: Array<Array<string | number>> = []
    protected dclass_view_map: Array<DClassViewMapEntry> = []
    protected distributed_objects: Array<DistributedObject> = []
    protected owner_views: Array<DistributedObject> = []
    protected callbacks: Array<(void)> = []
    protected dg_poll_rate: number = 30.0 // polls per second
    protected tasks: Array<()=>void> = [] // called per poll

    constructor(dc_file: string, success: (repo: Repository)=>void,
                failure: (err: Error)=>void, host: string, port: number) {

        super(host, port, success, failure) // open the TCP socket connection
        this.dc_file = new Parser().parse_file(dc_file)
        this.import_dclass_views()
        //console.dir(this.dclass_id_map, {depth: null})
        //console.dir(this.dclass_view_map, {depth: null})
    }

    private import_dclass_views(): void {
        /*
            Run `ParserTest.js` under the tests folder to visualize
            the output of the parser, which explains the code below.
         */
        const dclass_imports: dcFile = []
        for (let i = 0; i < this.dc_file.length; i++)
            if (this.dc_file[i][0] === 'import') dclass_imports.push(this.dc_file[i])

        let dclass_id: number = 0
        for (let i = 0; i < this.dc_file.length; i++) {
            let dc_object: Array<string | Array<any>> = this.dc_file[i]
            if (dc_object[0] !== 'dclass') continue
            // @ts-ignore  Index '1' of a dcFile object is always a string.
            let class_name: string = dc_object[1]

            for (let i = 0; i < dclass_imports.length; i++) {
                // @ts-ignore  Index '2' of an import object is always a string array.
                let views: Array<string> = dclass_imports[i][2]
                let import_class_name: string = views[0]
                if (!(class_name === import_class_name)) continue
                // @ts-ignore  Index '1' of a dcFile object is always a string.
                let import_file: string = dclass_imports[i][1];

                // import file (check OS platform for correct path format)
                let dir_slash: string = '/' // default: linux
                if (process.platform === 'win32') dir_slash = '\\'
                const dynamic_import = require(`${process.cwd()}${dir_slash}${import_file}`)

                for (let i = 0; i < views.length; i++) {
                    const dclass_view = dynamic_import[views[i]]
                    if (dclass_view === undefined) throw new error.DClassViewNotFound()
                    // @ts-ignore  It's assured that index '1' of `dc_object` is a string.
                    this.dclass_view_map.push([views[i], dclass_id, dclass_view])
                }
            }
            this.dclass_id_map.push([class_name, dclass_id])
            dclass_id++
        }
    }

    protected dclass_name_to_id(dclass_name: string): number {
        for (let i = 0; i < this.dclass_id_map.length; i++) {
            let dclass_entry: Array<string | number> = this.dclass_id_map[i]
            if (dclass_entry[0] !== dclass_name) continue
            // @ts-ignore  index '1' of `dclass_entry` will *always* be a number.
            return dclass_entry[1]
        }
        throw new error.DistributedClassNotFound() // we ran through the whole list ;-;
    }

    protected dclass_name_to_class(dclass_name: string, view_type: string): void {
        // verify that `view_type` is valid ('AI', 'OV', 'UD', etc.)
        if (VIEW_TYPES.indexOf(view_type) === -1)
            throw new error.InvalidDistributedObjectViewType()
        let class_name: string = dclass_name.concat(view_type)

        for (let i = 0; i < this.dclass_view_map.length; i++) {
            let map_entry: DClassViewMapEntry = this.dclass_view_map[i]
            // @ts-ignore  `map_entry` index of '2' is always a class that inherits `DistributedObject`
            if (map_entry[0] === class_name) return map_entry[2]
        }
        throw new error.DClassViewNotFound()
    }

    protected dclass_id_to_name(dclass_id: number): void {
        for (let i = 0; i < this.dclass_id_map.length; i++) {
            let dclass_entry: Array<string | number> = this.dclass_id_map[i]
            if (dclass_entry[1] !== dclass_id) continue
            // @ts-ignore  index '0' of `dclass_entry` is guaranteed to be a number.
            return dclass_entry[0]
        }
        throw new error.DistributedClassNotFound()
    }

    protected dclass_id_to_class(dclass_id: number, view_type: string): void {
        // verify that `view_type` is valid ('AI', 'OV', 'UD', etc.)
        if (VIEW_TYPES.indexOf(view_type) === -1)
            throw new error.InvalidDistributedObjectViewType()

        // @ts-ignore  `dclass_id_map` entry first element is always a string. (class name)
        let class_name: string = this.dclass_id_map[dclass_id][0].concat(view_type)

        for (let i = 0; i < this.dclass_view_map.length; i++) {
            let map_entry: DClassViewMapEntry = this.dclass_view_map[i]
            // @ts-ignore  `map_entry` index of '2' is always a class that inherits `DistributedObject`
            if (map_entry[0] === class_name) return map_entry[2]
        }
        throw new error.DClassViewNotFound()
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
                    await sleep_milliseconds((1 / this.dg_poll_rate) * 1000)
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
        this.notify('ObjectRepository.handle_datagram() was called, but was not over-ridden.')
    }
}

export class InternalRepository extends ObjectRepository {
    protected protocol: AstronProtocol = AstronProtocol.Internal
    protected ai_channel: channel = BigInt(0) // initialized after socket is connected
    protected ss_channel: channel = SS_DEFAULT
    protected dbss_channel: channel = DBSS_DEFAULT
    protected handlers: Array<Array<INTERNAL_MSG | InternalHandler>> = []
    protected msg_to_response_map: Array<Array<INTERNAL_MSG>>
    protected context_counters: Array<Array<INTERNAL_MSG | number>>

    constructor(args: {dc_file: string, success_callback: (repo: InternalRepository) => void,
                        failure_callback: (err: Error) => void,
                        ai_channel?: number, stateserver?: number, dbss?: number},
                        host: string = "127.0.0.1", port: number = MD_PORT) {

        super(args.dc_file, (repo: Repository) => {
            // @ts-ignore   It is assured that `repo` will be of type `InternalRepository`.
            let repo_cast: InternalRepository = repo
            args.success_callback(repo_cast) // send 'repo' arg as type `InternalRepository`
        }, args.failure_callback, host, port)

        if (args.ai_channel) {
            this.ai_channel = BigInt(args.ai_channel)
            // we don't have to wait until the socket is connected, because
            // writing to a socket will automatically queue it if we're still connecting.
            this.add_channel(this.ai_channel)
        }
        else this.ai_channel = this.allocate_channel() // allocate our own unique uint64 ID
        // Set state server / DBSS channels if given
        if (args.stateserver) this.ss_channel = BigInt(args.stateserver)
        if (args.dbss) this.dbss_channel = BigInt(args.dbss)

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
        this.handlers = [
            [INTERNAL_MSG.STATESERVER_OBJECT_SET_FIELD, this.handle_STATESERVER_OBJECT_SET_FIELD]
        ]
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

    protected allocate_channel(): channel {
        let channel_id: channel = unique_uint64() // from Utils.ts
        this.add_channel(channel_id)
        return channel_id
    }

    // -------- Creating Distributed Objects --------- //

    public create_object(cls_name: string, parent: number, zone: number, set_ai: boolean = false) {
        let do_id: doID = unique_uint32()
        let dclass_id: number = this.dclass_name_to_id(cls_name)
        this.create_object_with_required(dclass_id, do_id, parent, zone)
        if (set_ai) this.set_object_AI(do_id)
    }

    // -------- Astron Internal Messages --------- //

    protected add_channel(channel_id: channel): void {
        // Note: control messages don't have sender fields
        let dg: Datagram = new Datagram()
        dg.add_int8(1) // recipient count
        dg.add_int64(BigInt(RESERVED_CHANNELS.CONTROL))
        dg.add_int16(INTERNAL_MSG.CONTROL_ADD_CHANNEL)
        dg.add_int64(channel_id)
        this.send_datagram(dg)
    }

    public set_object_AI(do_id: doID): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(do_id)])
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_SET_AI)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public delete_AI_objects(): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.ss_channel])
        dg.add_int16(INTERNAL_MSG.STATESERVER_DELETE_AI_OBJECTS)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public create_object_with_required(dclass_id: number, do_id: doID, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.ss_channel])
        dg.add_int16(INTERNAL_MSG.STATESERVER_CREATE_OBJECT_WITH_REQUIRED)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        dg.add_int16(dclass_id)
        // FIXME: Add required fields if any
        this.send_datagram(dg)
    }

    public create_DB_object(dclass_id: number, context: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [this.dbss_channel])
        dg.add_int16(INTERNAL_MSG.DBSERVER_CREATE_OBJECT)
        dg.add_int32(context)
        dg.add_int16(dclass_id)
        dg.add_int16(0)
        // FIXME: This is actually `uint16 field_count`, `[uint16 field_id, <VALUE>]*field_count`
        // and should be accessible via `create_distobj_db`
        this.send_datagram(dg)
    }

    public activate_DBSS_object(do_id: doID, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [BigInt(do_id)])
        dg.add_int16(INTERNAL_MSG.DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    public set_client_state(ca: channel, state: number, sender: channel): void {
        if (sender === BigInt(0)) sender = this.ai_channel
        let dg: Datagram = this.create_message_stub(sender, [ca])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_SET_STATE)
        dg.add_int16(state)
        this.send_datagram(dg)
    }

    public add_session_object(do_id: doID, client: channel): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [client])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_SESSION_OBJECT)
        dg.add_int32(do_id)
        this.send_datagram(dg)
    }

    public add_interest(client: channel, interest_id: number, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub(this.ai_channel, [client])
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_INTEREST)
        dg.add_int16(interest_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    public set_object_owner(do_id: doID, owner: channel): void {
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
    protected protocol: AstronProtocol = AstronProtocol.Client

    constructor(dc_file: string, host: string = "127.0.0.1", port: number = CA_PORT) {
        super(dc_file, (repo: Repository)=>{}, (err: Error)=>{}, host, port) // FIXME: Callbacks
    }

    protected handle_datagram(dg: Datagram) {
        let dgi: DatagramIterator = new DatagramIterator(dg)
        throw new error.NotImplemented()
    }
}
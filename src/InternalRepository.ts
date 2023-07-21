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

import { ObjectRepository, Repository, InternalHandler } from './ObjectRepository'
import { AstronProtocol, INTERNAL_MSG, RESERVED_CHANNELS } from './globals'
import { MD_PORT, SS_DEFAULT, DBSS_DEFAULT, channel, doID } from './globals'
import { Datagram, DatagramIterator } from './Datagram'
import { unique_uint32, unique_uint64 } from './Utils'

/**
 * Represents an internal connection to the Astron cluster for AI / UberDOG processes.
 *
 * @param args - Specify the DC filename, callbacks, AI channel, and other roles' channels.
 * @param host - The IPv4 address of the Astron server. Defaulted to loopback address.
 * @param port - The port to use in the connection. Defaulted to 7199.
 *
 * @public
 */
export class InternalRepository extends ObjectRepository {
    public readonly protocol: AstronProtocol = AstronProtocol.Internal
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

    public create_message_stub(recipients: Array<channel>, sender?: channel): Datagram {
        let dg: Datagram = new Datagram()
        dg.add_int8(recipients.length) // dg.add_int8() will write as unsigned integer
        for (let i = 0; i < recipients.length; i++)
            dg.add_int64(recipients[i])
        if (sender) dg.add_int64(sender)
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

    /* ==================================================
         The following methods implement
         all Astron Internal messages.
       ==================================================
    */

    // -------- Client Agent Messages --------- //

    public set_client_state(ca: channel, state: number, sender: channel): void {
        if (sender === BigInt(0)) sender = this.ai_channel
        let dg: Datagram = this.create_message_stub([ca], sender)
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_SET_STATE)
        dg.add_int16(state)
        this.send_datagram(dg)
    }

    public add_session_object(do_id: doID, client: channel): void {
        let dg: Datagram = this.create_message_stub([client], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_SESSION_OBJECT)
        dg.add_int32(do_id)
        this.send_datagram(dg)
    }

    public client_add_interest(client: channel, interest_id: number, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub([client], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.CLIENTAGENT_ADD_INTEREST)
        dg.add_int16(interest_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    // -------- State Server / DBSS Messages --------- //

    public set_object_AI(do_id: doID): void {
        let dg: Datagram = this.create_message_stub([BigInt(do_id)], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_SET_AI)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public delete_AI_objects(): void {
        let dg: Datagram = this.create_message_stub([this.ss_channel], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.STATESERVER_DELETE_AI_OBJECTS)
        dg.add_int64(this.ai_channel)
        this.send_datagram(dg)
    }

    public create_object_with_required(dclass_id: number, do_id: doID, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub([this.ss_channel], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.STATESERVER_CREATE_OBJECT_WITH_REQUIRED)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        dg.add_int16(dclass_id)
        // FIXME: Add required fields if any
        this.send_datagram(dg)
    }

    public set_object_owner(do_id: doID, owner: channel): void {
        let dg: Datagram = this.create_message_stub([BigInt(do_id)], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_SET_OWNER)
        dg.add_int64(owner)
        this.send_datagram(dg)
    }

    // I don't know what to name this method yet lol
    public send_STATESERVER_OBJECT_GET_ZONE_OBJECTS(context: number, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub([BigInt(parent)], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.STATESERVER_OBJECT_GET_ZONE_OBJECTS)
        dg.add_int32(context)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    public activate_DBSS_object(do_id: doID, parent: number, zone: number): void {
        let dg: Datagram = this.create_message_stub([BigInt(do_id)], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS)
        dg.add_int32(do_id)
        dg.add_int32(parent)
        dg.add_int32(zone)
        this.send_datagram(dg)
    }

    // -------- Database Server Messages --------- //

    public create_DB_object(dclass_id: number, context: number): void {
        let dg: Datagram = this.create_message_stub([this.dbss_channel], this.ai_channel)
        dg.add_int16(INTERNAL_MSG.DBSERVER_CREATE_OBJECT)
        dg.add_int32(context)
        dg.add_int16(dclass_id)
        dg.add_int16(0)
        // FIXME: This is actually `uint16 field_count`, `[uint16 field_id, <VALUE>]*field_count`
        // and should be accessible via `create_distobj_db`
        this.send_datagram(dg)
    }

    // -------- Control Messages --------- //

    public add_channel(channel_id: channel): void {
        // Note: control messages don't have sender fields
        let dg: Datagram = this.create_message_stub([BigInt(RESERVED_CHANNELS.CONTROL)])
        dg.add_int16(INTERNAL_MSG.CONTROL_ADD_CHANNEL)
        dg.add_int64(channel_id)
        this.send_datagram(dg)
    }

    public remove_channel(channel_id: channel): void {
        let dg: Datagram = this.create_message_stub([BigInt(RESERVED_CHANNELS.CONTROL)])
        dg.add_int16(INTERNAL_MSG.CONTROL_REMOVE_CHANNEL)
        dg.add_int64(channel_id)
        this.send_datagram(dg)
    }

    public add_channels(min_channel: channel, max_channel: channel): void {
        let dg: Datagram = this.create_message_stub([BigInt(RESERVED_CHANNELS.CONTROL)])
        dg.add_int16(INTERNAL_MSG.CONTROL_ADD_RANGE)
        dg.add_int64(min_channel)
        dg.add_int64(max_channel)
        this.send_datagram(dg)
    }

    public remove_channels(min_channel: channel, max_channel: channel): void {
        let dg: Datagram = this.create_message_stub([BigInt(RESERVED_CHANNELS.CONTROL)])
        dg.add_int16(INTERNAL_MSG.CONTROL_REMOVE_RANGE)
        dg.add_int64(min_channel)
        dg.add_int64(max_channel)
        this.send_datagram(dg)
    }

    public write_event_log(message: Object): void {
        let data_blob: Buffer = Buffer.from(JSON.stringify(message))
        let dg: Datagram = this.create_message_stub([BigInt(RESERVED_CHANNELS.CONTROL)])
        dg.add_int16(INTERNAL_MSG.CONTROL_LOG_MESSAGE)
        dg.add_blob(data_blob)
        this.send_datagram(dg)
    }

    // -------- Internal Message Handlers --------- //

    private handle_STATESERVER_OBJECT_SET_FIELD(dgi: DatagramIterator, sender: channel, recipients: Array<channel>) {
        return // FIXME: Implement
    }

    // -------- Getters --------- //

    public get_AI_channel(): channel {
        return this.ai_channel
    }
}

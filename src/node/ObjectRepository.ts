/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MODULE_DEBUG_FLAGS, AstronProtocol, VIEW_TYPES, channel, doID } from './globals'
import { dcFile, Parser } from './Parser'
import { Connection } from './Connection'
import { DistributedObject } from './DistributedObject'
import { Datagram, DatagramIterator } from './Datagram'
import { sleep_milliseconds } from './Utils'
import * as process from 'node:process'
import * as error from './Errors'

declare class InternalRepository {} // forward declarations
declare class ClientRepository {}

export type Repository = ObjectRepository | InternalRepository | ClientRepository
type DClassViewMapEntry = Array<string | number | DistributedObject> // [class_name, dclass_id, class]
type DistributedObjectEntry = Array<number | DistributedObject> // [do_id, DistributedObject]
export type InternalHandler = (dgi: DatagramIterator, sender: channel, recipients: Array<channel>)=>void

/**
 * The parent class for `ClientRepository` and `InternalRepository` classes.
 *
 * @param dc_file - The path/filename of the DC file to parse.
 * @param success - Callback function for a successful connection to the Astron server.
 * @param failure - Callback function. Called when the socket emits an error event.
 * @param host - The IPv4 address of the Astron server. (ClientAgent/MessageDirector)
 * @param port - The port to use in the connection.
 *
 * @public
 */
export class ObjectRepository extends Connection {
    protected _DEBUG_: boolean = MODULE_DEBUG_FLAGS.OBJECT_REPOSITORY
    public readonly protocol: AstronProtocol = AstronProtocol.default
    protected dc_file: dcFile
    protected dclass_id_map: Array<Array<string | number>> = []
    protected dclass_view_map: Array<DClassViewMapEntry> = []
    protected distributed_objects: Array<DistributedObjectEntry> = []
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

    public dclass_name_to_id(dclass_name: string): number {
        for (let i = 0; i < this.dclass_id_map.length; i++) {
            let dclass_entry: Array<string | number> = this.dclass_id_map[i]
            if (dclass_entry[0] !== dclass_name) continue
            // @ts-ignore  index '1' of `dclass_entry` will *always* be a number.
            return dclass_entry[1]
        }
        throw new error.DistributedClassNotFound() // we ran through the whole list ;-;
    }

    public dclass_name_to_class(dclass_name: string, view_type: string): DistributedObject {
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

    public dclass_id_to_name(dclass_id: number): string {
        for (let i = 0; i < this.dclass_id_map.length; i++) {
            let dclass_entry: Array<string | number> = this.dclass_id_map[i]
            if (dclass_entry[1] !== dclass_id) continue
            // @ts-ignore  index '0' of `dclass_entry` is guaranteed to be a string.
            return dclass_entry[0]
        }
        throw new error.DistributedClassNotFound()
    }

    public dclass_id_to_class(dclass_id: number, view_type: string): DistributedObject {
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

    public dist_object_by_id(do_id: doID): DistributedObject {
        for (let i = 0; i < this.distributed_objects.length; i++) {
            let do_entry: DistributedObjectEntry = this.distributed_objects[i]
            // @ts-ignore  `do_entry` arrays are always formatted first ID then object.
            if (do_entry[0] === do_id) return do_entry[1]
        }
        throw new error.DistributedObjectNotFound()
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

    protected repo_poll_tasks(): void {
        for (let i = 0; i < this.tasks.length; i++)
            this.tasks[i]()
    }
    protected handle_datagram(dg: Datagram) {
        this.notify('ObjectRepository.handle_datagram() was called, but was not over-ridden.')
    }

    // ----------- Getters / Setters ------------ //

    public set_poll_rate(rate: number): void {
        this.dg_poll_rate = rate // rate in Hz
    }
    public add_task(callback: () => void): void {
        this.tasks.push(callback)
    }
    public get_dclass_id_map(): Array<Array<string | number>> {
        return this.dclass_id_map
    }
    public get_dclass_view_map(): Array<DClassViewMapEntry> {
        return this.dclass_view_map
    }
    public get_parsed_dc_file(): dcFile {
        return this.dc_file
    }
}
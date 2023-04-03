/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { MD_PORT, CA_PORT, MODULE_DEBUG_FLAGS } from './globals'
import { Connection } from './Connection'
import { Parser, dcFile } from './Parser'

export class ObjectRepository extends Connection {
    private _DEBUG_: boolean = MODULE_DEBUG_FLAGS.OBJECT_REPO
    private dc_file: dcFile

    constructor(dc_file: string, host: string, port: number) {
        super(host, port) // call Connection class constructor
        this.dc_file = new Parser().parse_file(dc_file)
    }
}

export class InternalRepository extends ObjectRepository {
    constructor(dc_file: string, host: string = "127.0.0.1", port: number = MD_PORT) {
        super(dc_file, host, port)
    }
}

export class ClientRepository extends ObjectRepository {
    constructor(dc_file: string, host: string = "127.0.0.1", port: number = CA_PORT) {
        super(dc_file, host, port)
    }
}
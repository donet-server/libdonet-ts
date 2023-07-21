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

import { AstronProtocol, CA_PORT } from './globals'
import { Datagram, DatagramIterator } from './Datagram'
import { ObjectRepository, Repository } from './ObjectRepository'
import * as error from './Errors'

/**
 * Represents a client connection to a Client Agent of the Astron cluster.
 *
 * @param dc_file - The path/filename of the DC file to parse.
 * @param host - The IPv4 address of the Astron server. Defaulted to loopback address.
 * @param port - The port to use in the connection. Defaulted to 6667.
 *
 * @public
 */
export class ClientRepository extends ObjectRepository {
    public readonly protocol: AstronProtocol = AstronProtocol.Client

    constructor(dc_file: string, host: string = "127.0.0.1", port: number = CA_PORT) {
        super(dc_file, (repo: Repository)=>{}, (err: Error)=>{}, host, port) // FIXME: Callbacks
    }

    protected handle_datagram(dg: Datagram) {
        let dgi: DatagramIterator = new DatagramIterator(dg)
        throw new error.NotImplemented()
    }
}

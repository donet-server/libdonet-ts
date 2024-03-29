/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import { InternalRepository } from './../../'

class AI {
    private repo: InternalRepository

    constructor() {
        this.repo = new InternalRepository({
            dc_file: 'example.dc', stateserver: 402000,
            success_callback: this.connection_success, failure_callback: this.connection_failure
        })
        this.repo.set_poll_rate(30.0) // 30 'frames' per second
    }

    private connection_success(repo: InternalRepository): void {
        console.log("Internal Repository connected!")
        repo.write_event_log({"type": "ai_connect", "sender": "test", "data": "test"})
        repo.poll_forever() // note: this method is asynchronous
    }

    private connection_failure(err: Error): void {
        throw err // not handled for this example :)
    }
}

const ai = new AI()
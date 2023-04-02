/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import * as astron from './../../'

class Services {
    private repo: astron.InternalRepository

    constructor() {
        this.repo = new astron.InternalRepository('example.dc')
    }
}

const app = new Services()
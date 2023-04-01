import * as astron from './../../'

class Services {
    private repo: astron.InternalRepository

    constructor() {
        this.repo = new astron.InternalRepository('example.dc')
    }
}

const app = new Services()
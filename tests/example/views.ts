/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

import * as astron from './../../'
const DistributedObject = astron.DistributedObject

/*
------------------------------------------------
    Root
    The root object that serves as a
    container for our virtual world.
------------------------------------------------
 */

export class Root extends DistributedObject {
    private generate(): void {
        return
    }
}

export class RootAI extends DistributedObject {
    private generate(): void {
        return
    }
}

export class RootAE extends DistributedObject {
    private generate(): void {
        return
    }
}

/*
------------------------------------------------
    Anonymous Contact DOG
    First point of contact for unauthorized
    anonymous clients in the UNKNOWN state.
------------------------------------------------
 */

export class AnonymousContact extends DistributedObject {
    private generate(): void {
        return
    }
}

export class AnonymousContactUD extends DistributedObject {
    private generate(): void {
        return
    }
}

/*
------------------------------------------------
    Login Manager
    The AI object that manages the
    authentication service. Contacted
    directly by the AnonymousContactUD.
------------------------------------------------
 */

export class LoginManager extends DistributedObject {
    private generate(): void {
        return
    }
}

export class LoginManagerAI extends DistributedObject {
    private generate(): void {
        return
    }
}

export class LoginManagerAE extends DistributedObject {
    private generate(): void {
        return
    }
}

/*
------------------------------------------------
    Distributed World
    A container for DistributedAvatars.
------------------------------------------------
 */

export class DistributedWorld extends DistributedObject {
    private generate(): void {
        return
    }
}

export class DistributedWorldAI extends DistributedObject {
    private generate(): void {
        return
    }
}

export class DistributedWorldAE extends DistributedObject {
    private generate(): void {
        return
    }
}

/*
------------------------------------------------
    Distributed Avatar
    The distributed object that represents
    the players in our virtual world.
    Created by the DistributedWorld AI.
------------------------------------------------
 */

export class DistributedAvatar extends DistributedObject {
    private generate(): void {
        return
    }
}

export class DistributedAvatarAI extends DistributedObject {
    private generate(): void {
        return
    }
}

export class DistributedAvatarAE extends DistributedObject {
    private generate(): void {
        return
    }
}

export class DistributedAvatarOV extends DistributedObject {
    private generate(): void {
        return
    }
}
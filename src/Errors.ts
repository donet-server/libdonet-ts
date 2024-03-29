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

export class NotImplemented extends Error {
    constructor() {
        super("An error was thrown due to a missing implementation of a feature.");
    }
}

export class DCFileNotFound extends Error {
    constructor() {
        super("The parser tried to open the DC file, but failed. Check file name & permissions?");
    }
}

export class DCFileInvalidIdentifier extends Error {
    constructor() {
        super("The parser found an invalid identifier in the DC file." +
            "Make sure your classes/methods aren't named after reserved DC keywords!");
    }
}

export class DCFileInvalidToken extends Error {
    constructor() {
        super("An invalid token was found while parsing the DC file.");
    }
}

export class DCFileMissingDelimiter extends Error {
    constructor() {
        super("A line in the DC file is missing a delimiter (';') token.");
    }
}

export class DCFileInvalidTabSpacing extends Error {
    constructor() {
        super("The DC file contains inconsistent tab spacing." +
            "Check if you're using spaces or tab characters!");
    }
}

export class DCFileInvalidComponent extends Error {
    constructor(component: string) {
        super(`The '${component}' component in the DC file doesn't exist.`);
    }
}

export class DCFileInvalidField extends Error {
    constructor() {
        super("The DC file contains a Distributed Class with an invalid field.");
    }
}

export class AstronConnectionRefused extends Error {
    constructor() {
        super("The Connection instance failed to connect to the Astron cluster. " +
            "Check if the Message Director is up, or if the Client Agent is up and exposed.");
    }
}

export class DatagramIntOutOfRange extends Error {
    constructor() {
        super("The Datagram object tried to write a number as a data type that was too small for its range.")
    }
}

export class DatagramStringOutOfRange extends Error {
    constructor() {
        super("The Datagram object tried to write a string that was too large for a uint16 size tag.")
    }
}

export class DatagramBlobOutOfRange extends Error {
    constructor() {
        super("The Datagram object tried to write a blob that was too large for a uint16 size tag.")
    }
}

export class DatagramCharOutOfRange extends Error {
    constructor() {
        super("The Datagram object tried to write a char that was longer than one character.")
    }
}

export class DatagramIteratorReadOutOfRange extends Error {
    constructor() {
        super("The DatagramIterator object tried to read past the end of its buffer.")
    }
}

export class DistributedClassNotFound extends Error {
    constructor() {
        super("The ObjectRepository tried to look up a Distributed Class that does not exist in the DC file.")
    }
}

export class DistributedObjectNotFound extends Error {
    constructor() {
        super("The ObjectRepository tried to look up a Distributed Object that does not exist.")
    }
}

export class DClassViewNotFound extends Error {
    constructor() {
        super("The ObjectRepository tried to import or find a Distributed Object view that does not exist.")
    }
}

export class InvalidDistributedObjectViewType extends Error {
    constructor() {
        super("An invalid Distributed Object view type (e.g. 'AI', 'OV') was given" +
            "as an argument to an ObjectRepository method.")
    }
}

export class SuspiciousClientBehavior extends Error {
    constructor() {
        super("The client tried to perform an action that should be done by Internal Repositories. " +
              "If this error is bypassed, the Astron client agent will eject the client if this action is attempted.")
    }
}

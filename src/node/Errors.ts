/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/

export class NotImplemented extends Error {
    constructor() {
        super("An error was thrown due to a missing implementation of a feature.");
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
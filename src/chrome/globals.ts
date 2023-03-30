/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/
export const DIST_TYPE: string = "chrome"
export const CA_PORT: number = 6667

export enum ESC_COLOR {
    RESET = "\u001b[0m",
    RED = "\u001b[31;1m",
    YELLOW = "\u001b[33;1m",
    GREEN = "\u001b[32;1m",
    CYAN = "\u001b[36;1m",
    MAGENTA = "\u001b[35;1m"
}
export function color_string(str: string, color: ESC_COLOR): string {
    return `${color}${str}${ESC_COLOR.RESET}`
}
export enum STATUS { SUCCESS = 41094, FAILURE = 52081 }

export const DC_SYNTAX = {
    KEYWORDS: [
        "dclass", "struct", "typedef", "keyword", "from"
    ],
    DATA_TYPES: [
        "charType", "intType", "floatType", "sizedType",    // dataType
        "char",                                             // charType
        "int8", "int16", "int32", "int64",                  // intType
        "uint8", "uint16", "uint32", "uint64",              // unsigned intType
        "float64",                                          // floatType
        "string", "blob"                                    // sizedType
    ],
    FIELD_KEYWORDS: [
        "clsend", "ownsend", "clrecv", "ownrecv",
        "airecv", "required", "ram", "broadcast", "db"
    ],
    OPERATORS: [
        "%", "*", "+", "-", "/"
    ]
}

export enum ASTRON_CLIENT_MESSAGES {
    // Client Messages
    CLIENT_HELLO                                = 1,
    CLIENT_HELLO_RESP                           = 2,
    CLIENT_DISCONNECT                           = 3,
    CLIENT_EJECT                                = 4,
    CLIENT_HEARTBEAT                            = 5,
    CLIENT_OBJECT_SET_FIELD                     = 120,
    CLIENT_OBJECT_SET_FIELDS                    = 121,
    CLIENT_OBJECT_LEAVING                       = 132,
    CLIENT_OBJECT_LEAVING_OWNER                 = 161,
    CLIENT_OBJECT_LOCATION                      = 140,
    CLIENT_ENTER_OBJECT_REQUIRED                = 142,
    CLIENT_ENTER_OBJECT_REQUIRED_OTHER          = 143,
    CLIENT_ENTER_OBJECT_REQUIRED_OWNER          = 172,
    CLIENT_ENTER_OBJECT_REQUIRED_OTHER_OWNER    = 173,
    CLIENT_DONE_INTEREST_RESP                   = 204,
    CLIENT_ADD_INTEREST                         = 200,
    CLIENT_ADD_INTEREST_MULTIPLE                = 201,
    CLIENT_REMOVE_INTEREST                      = 203,

    // Client Disconnect Messages
    CLIENT_DISCONNECT_OVERSIZED_DATAGRAM        = 106,
    CLIENT_DISCONNECT_NO_HELLO                  = 107,
    CLIENT_DISCONNECT_INVALID_MSGTYPE           = 108,
    CLIENT_DISCONNECT_TRUNCATED_DATAGRAM        = 109,
    CLIENT_DISCONNECT_ANONYMOUS_VIOLATION       = 113,
    CLIENT_DISCONNECT_FORBIDDEN_INTEREST        = 115,
    CLIENT_DISCONNECT_MISSING_OBJECT            = 117,
    CLIENT_DISCONNECT_FORBIDDEN_FIELD           = 118,
    CLIENT_DISCONNECT_FORBIDDEN_RELOCATE        = 119,
    CLIENT_DISCONNECT_BAD_VERSION               = 124,
    CLIENT_DISCONNECT_BAD_DCHASH                = 125,
    CLIENT_DISCONNECT_SESSION_OBJECT_DELETED    = 153,
}

export const MODULE_DEBUG_FLAGS = {
    PARSER: false,
    CONNECTION: false,
    DATAGRAM: false,
    LEGACY_HASH: false
}
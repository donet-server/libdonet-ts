/*
    astron.libts
    Copyright (c) 2023, Max Rodriguez. All rights reserved.

    All use of this software is subject to the terms of the revised BSD
    license. You should have received a copy of this license along
    with this source code in a file named "LICENSE."
*/
export const DIST_TYPE: string = "node"

// Message Director / Client Agent default ports
export const MD_PORT: number = 7199
export const CA_PORT: number = 6667

// Type definitions
export type channel = bigint // uint64
export type doID = number // uint32

// Default Astron role channels
export const SS_DEFAULT: channel = BigInt(400000)
export const DBSS_DEFAULT: channel = BigInt(400001)

// Astron Protocol Types
/* `default` defined just as a placeholder so that we can define an
    ObjectRepository's protocol type property before it is actually
    initialized by the child class InternalRepository / ClientRepository. */
export enum AstronProtocol { Internal = 0, Client = 1, default = 2 }

export const enum ESC_COLOR {
    RESET = "\u001b[0m",
    RED = "\u001b[31;1m",
    YELLOW = "\u001b[33;1m",
    GREEN = "\u001b[32;1m",
    CYAN = "\u001b[36;1m",
    MAGENTA = "\u001b[35;1m"
}
export const enum STATUS { SUCCESS = 41094, FAILURE = 52081 }

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

export const enum CLIENT_MSG {
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

export const enum INTERNAL_MSG {
    // ClientAgent Messages
    CLIENTAGENT_SET_STATE             = 1000,
    CLIENTAGENT_SET_CLIENT_ID         = 1001,
    CLIENTAGENT_SEND_DATAGRAM         = 1002,
    CLIENTAGENT_EJECT                 = 1004,
    CLIENTAGENT_DROP                  = 1005,
    CLIENTAGENT_DECLARE_OBJECT        = 1010,
    CLIENTAGENT_UNDECLARE_OBJECT      = 1011,
    CLIENTAGENT_ADD_SESSION_OBJECT    = 1012,
    CLIENTAGENT_REMOVE_SESSION_OBJECT = 1013,
    CLIENTAGENT_SET_FIELDS_SENDABLE   = 1014,
    CLIENTAGENT_OPEN_CHANNEL          = 1100,
    CLIENTAGENT_CLOSE_CHANNEL         = 1101,
    CLIENTAGENT_ADD_POST_REMOVE       = 1110,
    CLIENTAGENT_CLEAR_POST_REMOVES    = 1111,
    CLIENTAGENT_ADD_INTEREST          = 1200,
    CLIENTAGENT_ADD_INTEREST_MULTIPLE = 1201,
    CLIENTAGENT_REMOVE_INTEREST       = 1203,
    CLIENTAGENT_DONE_INTEREST_RESP    = 1204,

    // StateServer control Messages
    STATESERVER_CREATE_OBJECT_WITH_REQUIRED       = 2000,
    STATESERVER_CREATE_OBJECT_WITH_REQUIRED_OTHER = 2001,
    STATESERVER_DELETE_AI_OBJECTS                 = 2009,

    // StateServer object Messages
    STATESERVER_OBJECT_GET_FIELD         = 2010,
    STATESERVER_OBJECT_GET_FIELD_RESP    = 2011,
    STATESERVER_OBJECT_GET_FIELDS        = 2012,
    STATESERVER_OBJECT_GET_FIELDS_RESP   = 2013,
    STATESERVER_OBJECT_GET_ALL           = 2014,
    STATESERVER_OBJECT_GET_ALL_RESP      = 2015,
    STATESERVER_OBJECT_SET_FIELD         = 2020,
    STATESERVER_OBJECT_SET_FIELDS        = 2021,
    STATESERVER_OBJECT_DELETE_FIELD_RAM  = 2030,
    STATESERVER_OBJECT_DELETE_FIELDS_RAM = 2031,
    STATESERVER_OBJECT_DELETE_RAM        = 2032,

    // StateServer Messages
    STATESERVER_OBJECT_SET_LOCATION                       = 2040,
    STATESERVER_OBJECT_CHANGING_LOCATION                  = 2041,
    STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED       = 2042,
    STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED_OTHER = 2043,
    STATESERVER_OBJECT_GET_LOCATION                       = 2044,
    STATESERVER_OBJECT_GET_LOCATION_RESP                  = 2045,
    STATESERVER_OBJECT_SET_AI                             = 2050,
    STATESERVER_OBJECT_CHANGING_AI                        = 2051,
    STATESERVER_OBJECT_ENTER_AI_WITH_REQUIRED             = 2052,
    STATESERVER_OBJECT_ENTER_AI_WITH_REQUIRED_OTHER       = 2053,
    STATESERVER_OBJECT_GET_AI                             = 2054,
    STATESERVER_OBJECT_GET_AI_RESP                        = 2055,
    STATESERVER_OBJECT_SET_OWNER                          = 2060,
    STATESERVER_OBJECT_CHANGING_OWNER                     = 2061,
    STATESERVER_OBJECT_ENTER_OWNER_WITH_REQUIRED          = 2062,
    STATESERVER_OBJECT_ENTER_OWNER_WITH_REQUIRED_OTHER    = 2063,
    STATESERVER_OBJECT_GET_OWNER                          = 2064,
    STATESERVER_OBJECT_GET_OWNER_RESP                     = 2065,
    STATESERVER_OBJECT_ENTER_INTEREST_WITH_REQUIRED       = 2066,
    STATESERVER_OBJECT_ENTER_INTEREST_WITH_REQUIRED_OTHER = 2067,
    STATESERVER_OBJECT_GET_ZONE_OBJECTS                   = 2100,
    STATESERVER_OBJECT_GET_ZONES_OBJECTS                  = 2102,
    STATESERVER_OBJECT_GET_CHILDREN                       = 2104,
    STATESERVER_OBJECT_GET_ZONE_COUNT                     = 2110,
    STATESERVER_OBJECT_GET_ZONE_COUNT_RESP                = 2111,
    STATESERVER_OBJECT_GET_ZONES_COUNT                    = 2112,
    STATESERVER_OBJECT_GET_ZONES_COUNT_RESP               = 2113,
    STATESERVER_OBJECT_GET_CHILD_COUNT                    = 2114,
    STATESERVER_OBJECT_GET_CHILD_COUNT_RESP               = 2115,
    STATESERVER_OBJECT_DELETE_ZONE                        = 2120,
    STATESERVER_OBJECT_DELETE_ZONES                       = 2122,
    STATESERVER_OBJECT_DELETE_CHILDREN                    = 2124,
    STATESERVER_GET_ACTIVE_ZONES                          = 2125,
    STATESERVER_GET_ACTIVE_ZONES_RESP                     = 2126,

    // Database StateServer Messages
    DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS       = 2200,
    DBSS_OBJECT_ACTIVATE_WITH_DEFAULTS_OTHER = 2201,
    DBSS_OBJECT_GET_ACTIVATED                = 2207,
    DBSS_OBJECT_GET_ACTIVATED_RESP           = 2208,
    DBSS_OBJECT_DELETE_FIELD_RAM             = 2230,
    DBSS_OBJECT_DELETE_FIELDS_RAM            = 2231,
    DBSS_OBJECT_DELETE_DISK                  = 2232,

    // Database Server Messages
    DBSERVER_CREATE_OBJECT                    = 3000,
    DBSERVER_CREATE_OBJECT_RESP               = 3001,
    DBSERVER_OBJECT_GET_FIELD                 = 3010,
    DBSERVER_OBJECT_GET_FIELD_RESP            = 3011,
    DBSERVER_OBJECT_GET_FIELDS                = 3012,
    DBSERVER_OBJECT_GET_FIELDS_RESP           = 3013,
    DBSERVER_OBJECT_GET_ALL                   = 3014,
    DBSERVER_OBJECT_GET_ALL_RESP              = 3015,
    DBSERVER_OBJECT_SET_FIELD                 = 3020,
    DBSERVER_OBJECT_SET_FIELDS                = 3021,
    DBSERVER_OBJECT_SET_FIELD_IF_EQUALS       = 3022,
    DBSERVER_OBJECT_SET_FIELD_IF_EQUALS_RESP  = 3023,
    DBSERVER_OBJECT_SET_FIELDS_IF_EQUALS      = 3024,
    DBSERVER_OBJECT_SET_FIELDS_IF_EQUALS_RESP = 3025,
    DBSERVER_OBJECT_SET_FIELD_IF_EMPTY        = 3026,
    DBSERVER_OBJECT_SET_FIELD_IF_EMPTY_RESP   = 3027,
    DBSERVER_OBJECT_DELETE_FIELD              = 3030,
    DBSERVER_OBJECT_DELETE_FIELDS             = 3031,
    DBSERVER_OBJECT_DELETE                    = 3032,

    // Control Messages
    CONTROL_ADD_CHANNEL        = 9000,
    CONTROL_REMOVE_CHANNEL     = 9001,
    CONTROL_ADD_RANGE          = 9002,
    CONTROL_REMOVE_RANGE       = 9003,
    CONTROL_ADD_POST_REMOVE    = 9010,
    CONTROL_CLEAR_POST_REMOVES = 9011,
    CONTROL_SET_CON_NAME       = 9012,
    CONTROL_SET_CON_URL        = 9013,
    CONTROL_LOG_MESSAGE        = 9014
}

export const MODULE_DEBUG_FLAGS = {
    PARSER: false,
    LEGACY_HASH: false,
    CONNECTION: false,
    DATAGRAM: false,
    OBJECT_REPOSITORY: false,
    DISTRIBUTED_OBJECT: false
}
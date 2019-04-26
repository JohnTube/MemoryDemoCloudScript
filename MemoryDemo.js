/*global handlers */
/*global server */
/*global http */
/*global log */
/*global script */
/*global currentPlayerId */

var GAMES_LIST_SUFFIX = '_GamesList';

function getGamesListId(playerId) {
    'use strict';
    return String(playerId) + GAMES_LIST_SUFFIX;
}

// http://stackoverflow.com/a/21273362/1449056
function undefinedOrNull(variable) {	'use strict'; return variable === undefined || variable === null; } //return variable == null;

// checks to see if an object has any properties
// Returns true for empty objects and false for non-empty objects
function isEmpty(obj) {
    'use strict';
	// Object.getOwnPropertyNames(obj).length vs. Object.keys(obj).length 
	// http://stackoverflow.com/a/22658584/1449056
	return (undefinedOrNull(obj) || Object.getOwnPropertyNames(obj).length === 0);
}

function createSharedGroup(id) {
    'use strict';
	try {
		server.CreateSharedGroup({SharedGroupId : id});
	} catch (e) { throw e; }
}

function isString(obj) {
    'use strict';
    return (typeof obj === 'string' || obj instanceof String);
}

function updateSharedGroupData(id, data) {
    'use strict';
    var key;
	try {
        for (key in data) {
			if (data.hasOwnProperty(key) && !undefinedOrNull(data[key]) && !isString(data[key])) {
                data[key] = JSON.stringify(data[key]);
            }
        }
		server.UpdateSharedGroupData({ SharedGroupId: id, Data: data });
	} catch (e) { throw e; }
}

function getSharedGroupData(id, keys) {
    'use strict';
	try {
        var data = {}, key;
		if (undefinedOrNull(keys)) {
			data = server.GetSharedGroupData({ SharedGroupId: id }).Data;
		} else {
			data = server.GetSharedGroupData({ SharedGroupId: id, Keys: keys }).Data;
		}
        for (key in data) {
			if (data.hasOwnProperty(key)) {
                data[key] = JSON.parse(data[key].Value); // 'LastUpdated' and 'Permission' properties are overwritten
            }
        }
        return data;
	} catch (e) { throw e; }
}

function deleteSharedGroup(id) {
    'use strict';
    try {
        server.DeleteSharedGroup({SharedGroupId : id});
    } catch (e) { throw e; }
}

function getSharedGroupEntry(id, key) {
    'use strict';
    try {
        return getSharedGroupData(id, [key]);
    } catch (e) { throw e; }
}

function updateSharedGroupEntry(id, key, value) {
    'use strict';
    try {
        var data = {};
        data[key] = value;
        updateSharedGroupData(id, data);
    } catch (e) { throw e; }
}

function deleteSharedGroupEntry(id, key) {
    'use strict';
    try {
        updateSharedGroupEntry(id, key, null);
    } catch (e) { throw e; }
}

function getISOTimestamp() {
    'use strict';
    try {
        return (new Date()).toISOString();
    } catch (e) { throw e; }
}

function logException(timestamp, data, message) {
    'use strict';
    //TEMPORARY solution until log functions' output is available from GameManager
    server.SetTitleData({
        Key: timestamp + Math.random(),
        Value: JSON.stringify({Message: message, Data: data})
    });
}

function PhotonException(code, msg, timestamp, data) {
    'use strict';
	this.ResultCode = code;
	this.Message = msg;
    this.Timestamp = timestamp;
    this.Data = data;
    logException(timestamp, data, msg);
    //this.Stack = (new Error()).stack;
}

PhotonException.prototype = Object.create(Error.prototype);
PhotonException.prototype.constructor = PhotonException;

var LeaveReason = { ClientDisconnect: '0', ClientTimeoutDisconnect: '1', ManagedDisconnect: '2', ServerDisconnect: '3', TimeoutDisconnect: '4', ConnectTimeout: '5',
                    SwitchRoom: '100', LeaveRequest: '101', PlayerTtlTimedOut: '102', PeerLastTouchTimedout: '103', PluginRequest: '104', PluginFailedJoin: '105' };

function checkWebhookArgs(args, timestamp) {
    'use strict';
	var msg = 'Missing argument: ';
	if (undefinedOrNull(args.AppId)) {
		throw new PhotonException(1, msg + 'AppId', timestamp, args);
	}
	if (undefinedOrNull(args.AppVersion)) {
		throw new PhotonException(1, msg + 'AppVersion', timestamp, args);
	}
	if (undefinedOrNull(args.Region)) {
		throw new PhotonException(1, msg + 'Region', timestamp, args);
	}
	if (undefinedOrNull(args.GameId)) {
		throw new PhotonException(1, msg + 'GameId', timestamp, args);
	}
	if (undefinedOrNull(args.Type)) {
		throw new PhotonException(1, msg + 'Type', timestamp, args);
	}
	if ((args.Type !== 'Close' && args.Type !== 'Save')) {
		if (undefinedOrNull(args.ActorNr)) {
			throw new PhotonException(1, msg + 'ActorNr', timestamp, args);
		}
		if (undefinedOrNull(args.UserId)) {
			throw new PhotonException(1, msg + 'UserId', timestamp, args);
		}
        if (args.UserId !== currentPlayerId) {
            throw new PhotonException(3, 'currentPlayerId=' + currentPlayerId + ' does not match UserId', timestamp, args);
        }
		if (undefinedOrNull(args.Username) && undefinedOrNull(args.Nickname)) {
			throw new PhotonException(1, msg + 'Username/Nickname', timestamp, args);
		}
	} else {
		if (undefinedOrNull(args.ActorCount)) {
            throw new PhotonException(1, msg + 'ActorCount', timestamp, args);
		}
        if (!undefinedOrNull(args.State2) && !undefinedOrNull(args.State2.ActorList)) {
            if (args.State2.ActorList.length !== args.ActorCount) {
                throw new PhotonException(2, 'ActorCount does not match ActorList.count', timestamp, args);
            }
        }
	}
	switch (args.Type) {
    case 'Load':
        if (undefinedOrNull(args.CreateIfNotExists)) {
            throw new PhotonException(1, msg + 'CreateIfNotExists', timestamp, args);
        }
        break;
    case 'Create':
        if (undefinedOrNull(args.CreateOptions)) {
            throw new PhotonException(1, msg + 'CreateOptions', timestamp, args);
        }
        if (args.ActorNr !== 1) {
            throw new PhotonException(2, 'ActorNr != 1 and Type == Create', timestamp, args);
        }
        break;
    case 'Join':
        break;
    case 'Player':
        if (undefinedOrNull(args.TargetActor)) {
            throw new PhotonException(1, msg + 'TargetActor', timestamp, args);
        }
        if (undefinedOrNull(args.Properties)) {
            throw new PhotonException(1, msg + 'Properties', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Game':
        if (undefinedOrNull(args.Properties)) {
            throw new PhotonException(1, msg + 'Properties', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Event':
        if (undefinedOrNull(args.Data)) {
            throw new PhotonException(1, msg + 'Data', timestamp, args);
        }
        if (!undefinedOrNull(args.Username) && undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        break;
    case 'Save':
        if (undefinedOrNull(args.State)) {
            throw new PhotonException(1, msg + 'State', timestamp, args);
        }
        if (args.ActorCount <= 0) {
            throw new PhotonException(2, 'ActorCount <= 0 and Type == Save', timestamp, args);
        }
        break;
    case 'Close':
        if (args.ActorCount !== 0) {
            throw new PhotonException(2, 'ActorCount != 0 and Type == Close', timestamp, args);
        }
        break;
    case 'Leave':
        throw new PhotonException(2, 'Deprecated forward plugin webhook!', timestamp, args);
    default:
        if (LeaveReason.hasOwnProperty(args.Type)) {
            if (undefinedOrNull(args.IsInactive)) {
                throw new PhotonException(1, msg + 'IsInactive', timestamp, args);
            }
            if (undefinedOrNull(args.Reason)) {
                throw new PhotonException(1, msg + 'Reason', timestamp, args);
            }
            if (LeaveReason[args.Type] !== args.Reason) { // For some reason Type string does not match Reason code
                throw new PhotonException(2, 'Reason code does not match Leave Type string', timestamp, args);
            }
            if (['1', '100', '103', '105'].indexOf(args.Reason) > -1) { // Unexpected leave reasons
                throw new PhotonException(2, 'Unexpected LeaveReason', timestamp, args);
            }
        } else {
            throw new PhotonException(2, 'Unexpected Type:' + args.Type);
        }
        break;
	}
}

function onGameCreated(args, timestamp) {
    'use strict';
    var data = {};
    createSharedGroup(args.GameId);
    data.Env = {Region: args.Region, AppVersion: args.AppVersion, AppId: args.AppId, TitleId: script.titleId,
                CloudScriptVersion: script.version, CloudScriptRevision: script.revision, PlayFabServerVersion: server.version,
               WebhooksVersion: undefinedOrNull(args.Nickname) ? '1.0' : '1.2'};
    data.RoomOptions = args.CreateOptions;
    data.Creation = {Timestamp: timestamp, UserId: args.UserId, Type: args.Type};
    data.Actors = {1: {UserId: args.UserId, Inactive: false}};
    data.NextActorNr = 2;
    updateSharedGroupData(args.GameId, data);
    updateSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId, data);
}


handlers.RoomCreated = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        if (args.Type === 'Create') {
            onGameCreated(args, timestamp);
            return {ResultCode: 0, Message: 'OK'};
        } else if (args.Type === 'Load') {
            data = getSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId);
            if (data.Creation.UserId !== currentPlayerId) {
                data = getSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId);
            }
            if (undefinedOrNull(data.State)) {
                if (args.CreateIfNotExists === false) {
                    throw new PhotonException(5, 'Room=' + args.GameId + ' not found', timestamp, args);
                } else {
                    onGameCreated(args, timestamp);
                    return {ResultCode: 0, Message: 'OK', State: ''}; // TBD: test if State property is required or what can be returned
                }
            }
            if (undefinedOrNull(data.LoadEvents)) {
                data.LoadEvents = {};
            }
            data.LoadEvents[timestamp] = {ActorNr: args.ActorNr, UserId: args.UserId};
            createSharedGroup(args.GameId);
            updateSharedGroupData(args.GameId, data);
            return {ResultCode: 0, Message: 'OK', State: data.State};
        } else {
            throw new PhotonException(2, 'Wrong PathCreate Type=' + args.Type, timestamp, {Webhook: args});
        }
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomClosed = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        data = getSharedGroupData(args.GameId);
        if (Object.keys(data.Actors).length !== args.ActorCount) {
            throw new PhotonException(6, 'Actors count does not match', timestamp, {Webhook: args, CustomState: data});
        }
        // TODO: compare data.Env with current env
        if (args.Type === 'Close') {
            deleteSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId);
        } else if (args.Type === 'Save') {
            if (undefinedOrNull(data.SaveEvents)) {
                data.SaveEvents = {};
            }
            data.SaveEvents[timestamp] = {ActorCount: args.ActorCount};
            data.State = args.State;
            updateSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId, data);
        } else {
            throw new PhotonException(2, 'Wrong PathClose Type=' + args.Type, timestamp, {Webhook: args, CustomState: data});
        }
        deleteSharedGroup(args.GameId);
        return {ResultCode: 0, Message: 'OK'};
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomJoined = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        data = getSharedGroupData(args.GameId);
        if (args.Type !== 'Join') {
            throw new PhotonException(2, 'Wrong PathJoin Type=' + args.Type, timestamp, {Webhook: args, CustomState: data});
        }
        // TODO: compare data.Env with current env
        if (data.RoomOptions.PlayerTTL !== 0 && data.NextActorNr > args.ActorNr) { // ActorNr is already claimed, should be a rejoin
            if (data.ActiveActors[args.ActorNr].Inactive === false) {
                throw new PhotonException(2, 'Actor is already joined', timestamp, {Webhook: args, CustomState: data});
            } else if (data.RoomOptions.CheckUserOnJoin === true && args.UserId !== data.Actors[args.ActorNr].UserId) {
                throw new PhotonException(2, 'Illegal rejoin with different UserId', timestamp, {Webhook: args, CustomState: data});
            } else if (args.UserId !== data.Actors[args.ActorNr].UserId) {
                data.Actors[args.ActorNr].UserId = args.UserId;
            }
            data.Actors[args.ActorNr].Inactive = false;
        } else if (data.NextActorNr === args.ActorNr) { // first join
            if (Object.keys(data.Actors).length === args.RoomOptions.MaxPlayers) {
                throw new PhotonException(2, 'Actors overflow', timestamp, {Webhook: args, CustomState: data});
            }
            data.Actors[args.ActorNr] = {UserId: args.UserId, Inactive: false};
            data.NextActorNr = data.NextActorNr + 1;
        } else {
            throw new PhotonException(2, 'Unexpected ActorNr', timestamp, {Webhook: args, CustomState: data});
        }
        if (undefinedOrNull(data.JoinEvents)) {
            data.JoinEvents = {};
        }
        data.JoinEvents[timestamp] = {ActorNr: args.ActorNr, UserId: args.UserId};
        updateSharedGroupData(args.GameId, data);
        updateSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId, {Env: data.Env, Creation: data.Creation, ActorNr: args.ActorNr});
        return {ResultCode: 0, Message: 'OK'};
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomLeft = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        data = getSharedGroupData(args.GameId);
        if (!LeaveReason.hasOwnProperty(args.Type)) {
            throw new PhotonException(2, 'Wrong PathLeave Type=' + args.Type, timestamp, {Webhook: args, CustomState: data});
        }
        // TODO: compare data.Env with current env
        if (!data.Actors.hasOwnProperty(args.ActorNr)) {
            throw new PhotonException(2, 'No ActorNr inside the room', timestamp, {Webhook: args, CustomState: data});
        }
        if (args.Type !== LeaveReason.PlayerTtlTimedOut && data.Actors[args.ActorNr].Inactive === true) {
            throw new PhotonException(2, 'Inactive actors cant leave', timestamp, {Webhook: args, CustomState: data});
        }
        if (data.Actors[args.ActorNr].UserId !== args.UserId) {
            throw new PhotonException(2, 'Leaving UserId is different from joined', timestamp, {Webhook: args, CustomState: data});
        }
        if (args.Inactive) {
            data.Actors[args.ActorNr].Inactive = true;
        } else {
            delete data.Actors[args.ActorNr];
            deleteSharedGroupEntry(getGamesListId(currentPlayerId), args.GameId);
        }
        if (undefinedOrNull(data.LeaveEvents)) {
            data.LeaveEvents = {};
        }
        data.LeaveEvents[timestamp] = {ActorNr: args.ActorNr, UserId: args.UserId, CanRejoin: args.Inactive};
        updateSharedGroupData(args.GameId, data);
        return {ResultCode: 0, Message: 'OK'};
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomPropertyUpdated = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        data = getSharedGroupData(args.GameId);
        if (args.Type !== 'Player' && args.Type !== 'Game') {
            throw new PhotonException(2, 'Wrong PathGameProperties Type=' + args.Type, timestamp, {Webhook: args, CustomState: data});
        }
        if (!undefinedOrNull(args.State)) {
            data.State = args.State;
            updateSharedGroupData(args.GameId, data);
            updateSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId, data);
        }
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

handlers.RoomEventRaised = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            data = {};
        checkWebhookArgs(args, timestamp);
        data = getSharedGroupData(args.GameId);
        if (args.Type !== 'Event') {
            throw new PhotonException(2, 'Wrong PathEvent Type=' + args.Type, timestamp, {Webhook: args, CustomState: data});
        }
        if (!undefinedOrNull(args.State)) {
            data.State = args.State;
            updateSharedGroupData(args.GameId, data);
            updateSharedGroupEntry(getGamesListId(data.Creation.UserId), args.GameId, data);
        }
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

function checkWebRpcArgs(args, timestamp) {
    'use strict';
    var msg = 'Missing argument: ';
	if (undefinedOrNull(args.AppId)) {
		throw new PhotonException(1, msg + 'AppId', timestamp, args);
	}
	if (undefinedOrNull(args.AppVersion)) {
		throw new PhotonException(1, msg + 'AppVersion', timestamp, args);
	}
	if (undefinedOrNull(args.Region)) {
		throw new PhotonException(1, msg + 'Region', timestamp, args);
	}
    if (undefinedOrNull(args.UserId)) {
        throw new PhotonException(1, msg + 'UserId', timestamp, args);
    }
}

handlers.GetGameList = function (args) {
    'use strict';
    try {
        var timestamp = getISOTimestamp(),
            gameList = {},
            listToLoad = {},
            gameKey = '',
            userKey = '',
            data = {};
        checkWebRpcArgs(args);
        gameList = getSharedGroupData(getGamesListId(currentPlayerId));
        for (gameKey in gameList) {
            if (gameList.hasOwnProperty(gameKey)) {
                if (gameList[gameKey].Creation.UserId === currentPlayerId) {
                    data[gameKey] = {ActorNr: 1, Properties: gameList[gameKey].State.CustomProperties};
                } else {
                    data[gameKey] = {ActorNr: gameList[gameKey].ActorNr};
                    if (undefinedOrNull(listToLoad[gameList[gameKey].Creation.UserId])) {
                        listToLoad[gameList[gameKey].Creation.UserId] = [];
                    }
                    listToLoad[gameList[gameKey].Creation.UserId].push(data[gameKey]);
                }
            }
        }
        for (userKey in listToLoad) {
            if (listToLoad.hasOwnProperty(userKey)) {
                gameList = getSharedGroupData(getGamesListId(userKey), listToLoad[userKey]);
                for (gameKey in gameList) {
                    if (gameList.hasOwnProperty(gameKey)) {
                        data[gameKey].Properties = gameList[gameKey].State.CustomProperties;
                    }
                }
            }
        }
        return {ResultCode: 0, Data: data};
    } catch (e) {
        if (e instanceof PhotonException) {
            return {ResultCode: e.ResultCode, Message: e.Message};
        }
        return {ResultCode: -1, Message: e.name + ': ' + e.message};
    }
};

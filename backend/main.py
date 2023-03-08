#!/usr/bin/env python

import asyncio
import json
import uuid
from asyncio import CancelledError
from typing import Union

import websockets
from websockets.legacy.protocol import WebSocketCommonProtocol

ROOM = {}


class RecvMessageType:
    type: str
    data: Union[str, int, float, bool, dict]

    def __init__(self, data: str):
        _d = json.loads(data)
        self.type = _d['type']
        self.data = _d['data']

    def json(self):
        return json.dumps({"type": self.type, "data": self.data})


class MessageType:
    type: str
    data: Union[str, int, float, bool, dict]

    def __init__(self, type: str, data: Union[str, int, float, bool, dict]):
        self.type = type
        self.data = data

        if not isinstance(self.type, str) or not isinstance(self.data, (str, int, float, bool, dict)):
            raise TypeError("type and data must be strings")

    def json(self):
        return json.dumps({"type": self.type, "data": self.data})


def get_uuid() -> str:
    return str(uuid.uuid4())


async def handler(websocket: WebSocketCommonProtocol):
    _uuid = get_uuid()
    print(f"新用户进入: {_uuid}")
    _data = json.dumps({
        'uuid': _uuid,
        'other': list(ROOM.keys()),
    })
    await websocket.send(MessageType('init', _data).json())
    try:
        async for message in websocket:
            try:
                message = RecvMessageType(message)
            except json.decoder.JSONDecodeError:
                continue
            if message.type == 'init':
                ROOM[_uuid] = websocket
                for uid, user in ROOM.items():
                    _data = json.dumps({
                        'user': _uuid,
                    })
                    await user.send(MessageType('joined', _data).json())

            elif message.type == 'send':
                user = ROOM.get(message.data['to'])
                if not user:
                    print(f"用户 {message.data['to']} 不在线")
                    continue
                await user.send(MessageType(message.data['event'], message.data).json())
            # elif message.type == 'offer':
            #     ...
            # elif message.type == 'candidate':
            #     ...

    finally:
        if ROOM.get(_uuid):
            del ROOM[_uuid]
        for _, user in ROOM.items():
            await user.send(MessageType('left', _uuid).json())

        print(f"用户 {_uuid} 离开房间")


async def main():
    async with websockets.serve(handler, "localhost", 8765):
        try:
            await asyncio.Future()  # run forever
        except CancelledError:
            pass


asyncio.run(main())

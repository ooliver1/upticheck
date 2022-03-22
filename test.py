from asyncio import run, sleep
from os import getenv

from aiohttp import ClientSession
from dotenv import load_dotenv

load_dotenv()
key = getenv("KEY")
assert key is not None


async def main():
    async with ClientSession().ws_connect(
        "ws://localhost:8787/ws", headers={"Authorization": key}
    ) as sesh:
        print("pls")
        await sleep(1)
        await sesh.send_str("h")
        async for _ in sesh:
            pass


run(main())

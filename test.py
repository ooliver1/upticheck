from asyncio import run, sleep
from os import getenv

from aiohttp import ClientSession
from dotenv import load_dotenv

load_dotenv()
key = getenv("KEY")
assert key is not None


async def main():
    async with ClientSession().ws_connect(
        "ws://localhost:8787/ws", headers={"Authorization": key, "X-Name": "h"}
    ) as sesh:
        await sleep(100)


run(main())

"""
Teltonika FMC920 GPS tracker integration.

TCP server that handles Codec 8/8E AVL data and sends Codec 12 GPRS commands.
Used to control the DOUT relay (immobilizer) from GestMat CHECK_OUT/CHECK_IN flow.
"""
import asyncio
import logging
import struct
from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models.gps_device import GpsDevice

logger = logging.getLogger("teltonika")

# ---------------------------------------------------------------------------
#  CRC-16/IBM (used by Teltonika protocol)
# ---------------------------------------------------------------------------

def _crc16_ibm(data: bytes) -> int:
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return crc & 0xFFFF


# ---------------------------------------------------------------------------
#  Codec 12 — build command packet (outbound)
# ---------------------------------------------------------------------------

def build_codec12_command(command: str) -> bytes:
    """Build a Codec 12 GPRS command packet to send to the device."""
    cmd_bytes = command.encode("ascii")
    cmd_len = len(cmd_bytes)

    # Data field: codec_id(1) + qty1(1) + type(1) + cmd_size(4) + cmd(N) + qty2(1)
    data = bytearray()
    data.append(0x0C)           # Codec ID = 12
    data.append(0x01)           # Command Quantity 1
    data.append(0x05)           # Type = Command
    data.extend(struct.pack(">I", cmd_len))  # Command size (4 bytes big-endian)
    data.extend(cmd_bytes)      # Command content
    data.append(0x01)           # Command Quantity 2

    data_size = len(data)
    crc = _crc16_ibm(bytes(data))

    packet = bytearray()
    packet.extend(b"\x00\x00\x00\x00")          # Preamble
    packet.extend(struct.pack(">I", data_size))  # Data field length
    packet.extend(data)                           # Data field
    packet.extend(struct.pack(">I", crc))        # CRC-16 (in 4-byte field)

    return bytes(packet)


def parse_codec12_response(data: bytes) -> str | None:
    """Parse a Codec 12 response from the device and extract the response text."""
    try:
        if len(data) < 10:
            return None
        # Skip preamble(4) + data_size(4)
        codec_id = data[8]
        if codec_id != 0x0C:
            return None
        # qty1(1) + type(1) = data[9], data[10]
        resp_type = data[10]
        resp_size = struct.unpack(">I", data[11:15])[0]
        resp_text = data[15:15 + resp_size].decode("ascii", errors="replace")
        return resp_text
    except Exception as e:
        logger.error(f"Failed to parse Codec 12 response: {e}")
        return None


# ---------------------------------------------------------------------------
#  Codec 8/8E — parse AVL data (inbound, minimal)
# ---------------------------------------------------------------------------

def parse_avl_packet(payload: bytes) -> dict:
    """
    Minimal parse of Codec 8/8E AVL data payload.
    Extracts: record_count, and first record's GPS (lat, lng, speed).
    payload = everything between data_size and CRC (the 'data field').
    """
    result = {"record_count": 0, "lat": None, "lng": None, "speed": None}

    try:
        codec_id = payload[0]
        record_count = payload[1]
        result["record_count"] = record_count

        if record_count == 0:
            return result

        # Parse first AVL record (starts at offset 2)
        offset = 2

        # Timestamp: 8 bytes (ms since epoch)
        if offset + 8 > len(payload):
            return result
        # timestamp_ms = struct.unpack(">Q", payload[offset:offset+8])[0]
        offset += 8

        # Priority: 1 byte
        offset += 1

        # GPS Element: lng(4) + lat(4) + alt(2) + angle(2) + satellites(1) + speed(2)
        if offset + 15 > len(payload):
            return result

        lng_raw = struct.unpack(">i", payload[offset:offset + 4])[0]
        lat_raw = struct.unpack(">i", payload[offset + 4:offset + 8])[0]
        # alt = struct.unpack(">H", payload[offset+8:offset+10])[0]
        # angle = struct.unpack(">H", payload[offset+10:offset+12])[0]
        # satellites = payload[offset+12]
        speed = struct.unpack(">H", payload[offset + 13:offset + 15])[0]

        result["lat"] = lat_raw / 10_000_000.0
        result["lng"] = lng_raw / 10_000_000.0
        result["speed"] = speed

    except Exception as e:
        logger.error(f"AVL parse error: {e}")

    return result


# ---------------------------------------------------------------------------
#  Connection Manager — keeps track of active device TCP connections
# ---------------------------------------------------------------------------

class TeltonikaConnectionManager:
    """Manages active TCP connections from Teltonika devices, keyed by IMEI."""

    def __init__(self):
        self._connections: dict[str, asyncio.StreamWriter] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def register(self, imei: str, writer: asyncio.StreamWriter):
        self._connections[imei] = writer
        if imei not in self._locks:
            self._locks[imei] = asyncio.Lock()
        logger.info(f"Device {imei} connected")

    def unregister(self, imei: str):
        self._connections.pop(imei, None)
        logger.info(f"Device {imei} disconnected")

    def is_online(self, imei: str) -> bool:
        return imei in self._connections

    def get_writer(self, imei: str) -> asyncio.StreamWriter | None:
        return self._connections.get(imei)

    async def send_command(self, imei: str, command: str, timeout: float = 10.0) -> str | None:
        """Send a Codec 12 command to a device and return the response text."""
        writer = self._connections.get(imei)
        if not writer:
            logger.warning(f"Cannot send command to {imei}: not connected")
            return None

        lock = self._locks.get(imei)
        if not lock:
            lock = asyncio.Lock()
            self._locks[imei] = lock

        async with lock:
            try:
                packet = build_codec12_command(command)
                writer.write(packet)
                await writer.drain()

                # Read response — wait for preamble + data
                resp_data = await asyncio.wait_for(
                    writer._transport._protocol._stream_reader.read(1024),  # noqa
                    timeout=timeout,
                )
                if resp_data:
                    return parse_codec12_response(resp_data)
                return None
            except asyncio.TimeoutError:
                logger.warning(f"Command timeout for {imei}: {command}")
                return None
            except Exception as e:
                logger.error(f"Command error for {imei}: {e}")
                return None


# Singleton
connection_manager = TeltonikaConnectionManager()


# ---------------------------------------------------------------------------
#  Relay control helpers
# ---------------------------------------------------------------------------

async def immobilize(imei: str) -> bool:
    """Activate relay (DOUT1 ON) — block vehicle starter."""
    result = await connection_manager.send_command(imei, "setdigout 1")
    return result is not None


async def de_immobilize(imei: str) -> bool:
    """Deactivate relay (DOUT1 OFF) — allow vehicle to start."""
    result = await connection_manager.send_command(imei, "setdigout 0")
    return result is not None


# ---------------------------------------------------------------------------
#  TCP client handler
# ---------------------------------------------------------------------------

async def _handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Handle a single Teltonika device TCP connection."""
    addr = writer.get_extra_info("peername")
    imei = None

    try:
        # Step 1: IMEI handshake
        # First 2 bytes = IMEI length, then IMEI as ASCII
        imei_header = await asyncio.wait_for(reader.read(2), timeout=30)
        if len(imei_header) < 2:
            writer.close()
            return

        imei_len = struct.unpack(">H", imei_header)[0]
        imei_bytes = await asyncio.wait_for(reader.read(imei_len), timeout=10)
        imei = imei_bytes.decode("ascii").strip()

        logger.info(f"IMEI handshake from {addr}: {imei}")

        # Validate IMEI exists in DB
        db = SessionLocal()
        try:
            device = db.query(GpsDevice).filter(GpsDevice.imei == imei).first()
            if not device:
                logger.warning(f"Unknown IMEI {imei} from {addr}, rejecting")
                writer.write(b"\x00")
                await writer.drain()
                writer.close()
                return

            # Accept
            writer.write(b"\x01")
            await writer.drain()

            # Register connection
            connection_manager.register(imei, writer)

            # Update DB
            device.is_online = True
            device.last_connected_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()

        # Step 2: Main loop — receive AVL data packets
        while True:
            # Read preamble (4 bytes, should be 0x00000000)
            preamble = await asyncio.wait_for(reader.readexactly(4), timeout=300)
            if preamble != b"\x00\x00\x00\x00":
                logger.warning(f"Bad preamble from {imei}: {preamble.hex()}")
                break

            # Read data field length (4 bytes)
            data_len_bytes = await reader.readexactly(4)
            data_len = struct.unpack(">I", data_len_bytes)[0]

            if data_len == 0 or data_len > 65535:
                logger.warning(f"Invalid data length from {imei}: {data_len}")
                break

            # Read data field
            data_field = await asyncio.wait_for(reader.readexactly(data_len), timeout=30)

            # Read CRC (4 bytes)
            crc_bytes = await reader.readexactly(4)
            # CRC validation (optional — skip for now, Teltonika docs say it's in last 2 bytes)

            # Parse AVL data
            parsed = parse_avl_packet(data_field)
            record_count = parsed["record_count"]

            # Send ACK: 4-byte integer = number of records received
            writer.write(struct.pack(">I", record_count))
            await writer.drain()

            logger.debug(f"Device {imei}: {record_count} records, "
                         f"lat={parsed['lat']}, lng={parsed['lng']}, speed={parsed['speed']}")

            # Update GPS data in DB
            if parsed["lat"] is not None:
                db = SessionLocal()
                try:
                    device = db.query(GpsDevice).filter(GpsDevice.imei == imei).first()
                    if device:
                        device.last_lat = parsed["lat"]
                        device.last_lng = parsed["lng"]
                        device.last_speed = parsed["speed"]
                        device.last_connected_at = datetime.now(timezone.utc)
                        device.is_online = True
                        db.commit()
                finally:
                    db.close()

    except asyncio.TimeoutError:
        logger.info(f"Device {imei or addr} timed out")
    except asyncio.IncompleteReadError:
        logger.info(f"Device {imei or addr} disconnected")
    except ConnectionResetError:
        logger.info(f"Device {imei or addr} connection reset")
    except Exception as e:
        logger.error(f"Error handling device {imei or addr}: {e}")
    finally:
        # Cleanup
        if imei:
            connection_manager.unregister(imei)
            db = SessionLocal()
            try:
                device = db.query(GpsDevice).filter(GpsDevice.imei == imei).first()
                if device:
                    device.is_online = False
                    db.commit()
            finally:
                db.close()
        writer.close()


# ---------------------------------------------------------------------------
#  TCP Server start/stop
# ---------------------------------------------------------------------------

_server: asyncio.Server | None = None


async def start_tcp_server(host: str, port: int) -> asyncio.Server:
    """Start the Teltonika TCP server."""
    global _server
    _server = await asyncio.start_server(_handle_client, host, port)
    logger.info(f"Teltonika TCP server listening on {host}:{port}")
    return _server


async def stop_tcp_server(server: asyncio.Server | None = None):
    """Stop the Teltonika TCP server."""
    global _server
    srv = server or _server
    if srv:
        srv.close()
        await srv.wait_closed()
        logger.info("Teltonika TCP server stopped")
        _server = None

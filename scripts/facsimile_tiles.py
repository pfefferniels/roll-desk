#!/usr/bin/env python3
"""Cut a roll scan into a static IIIF tile pyramid.

A scan that no IIIF server hosts can still be shown on the roll desk if
its tiles are cut in advance. The region of every tile is aligned to the
tile size at one of the declared scale factors and its width is the
region's divided by that factor, which is all the Image API's level 0
promises and all the desk asks for. Any web server can serve the result.

    facsimile_tiles.py scan.tif public/facsimiles/WR0225_02 --id /facsimiles/WR0225_02

Tiles are written to <out>/<x>,<y>,<w>,<h>/<tw>,/0/default.jpg with
<out>/info.json beside them, the canonical URI form of Image API 2.1.
The full image at the coarsest scale goes to <out>/full/<w>,/0/default.jpg.

Requires numpy, tifffile and Pillow.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Iterator

import numpy as np
import tifffile
from PIL import Image

TILE = 1024
JPEG_QUALITY = 80
DEFAULT_FACTORS = (2, 4, 8, 16, 32)


@dataclass(frozen=True)
class Region:
    """A rectangle of the scan, in pixels of the full-size image."""

    x: int
    y: int
    width: int
    height: int

    @property
    def name(self) -> str:
        return f"{self.x},{self.y},{self.width},{self.height}"


@dataclass(frozen=True)
class Level:
    """The scan reduced by one scale factor."""

    factor: int
    pixels: np.ndarray

    @property
    def size(self) -> tuple[int, int]:
        rows, cols = self.pixels.shape[:2]
        return cols, rows


def read_scan(path: Path, grey: bool) -> np.ndarray:
    scan = tifffile.memmap(path, mode="r")
    return scan[..., 0] if grey and scan.ndim == 3 else scan


def reduced(pixels: np.ndarray, factor: int) -> np.ndarray:
    """Box-filtered by `factor`, rounding a ragged edge up to a full pixel."""
    return np.asarray(Image.fromarray(np.ascontiguousarray(pixels)).reduce(factor))


def base_level(scan: np.ndarray, factor: int) -> Level:
    """The finest level, reduced one band of tiles at a time so the scan
    never has to be in memory whole."""
    band = TILE * factor
    bands = (reduced(scan[top : top + band], factor) for top in range(0, scan.shape[0], band))
    return Level(factor, np.concatenate(list(bands)))


def levels(scan: np.ndarray, factors: tuple[int, ...]) -> Iterator[Level]:
    """Each coarser level halved (or so) from the one before it."""
    level = base_level(scan, factors[0])
    yield level
    for factor in factors[1:]:
        level = Level(factor, reduced(level.pixels, factor // level.factor))
        yield level


def tiles_of(level: Level, full: tuple[int, int]) -> Iterator[tuple[Region, np.ndarray]]:
    """Every tile of a level with the region of the full image it shows."""
    full_width, full_height = full
    cols, rows = level.size
    span = TILE * level.factor
    grid = product(range(math.ceil(rows / TILE)), range(math.ceil(cols / TILE)))
    for ty, tx in grid:
        region = Region(
            tx * span,
            ty * span,
            min(span, full_width - tx * span),
            min(span, full_height - ty * span),
        )
        yield region, level.pixels[ty * TILE : (ty + 1) * TILE, tx * TILE : (tx + 1) * TILE]


def write_jpeg(path: Path, pixels: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(pixels).save(path, quality=JPEG_QUALITY, optimize=True)


def write_tile(out: Path, region: Region, pixels: np.ndarray) -> None:
    write_jpeg(out / region.name / f"{pixels.shape[1]}," / "0" / "default.jpg", pixels)


def write_full(out: Path, level: Level) -> None:
    write_jpeg(out / "full" / f"{level.size[0]}," / "0" / "default.jpg", level.pixels)


def info(identifier: str, full: tuple[int, int], factors: tuple[int, ...], coarsest: Level) -> dict:
    width, height = full
    return {
        "@context": "http://iiif.io/api/image/2/context.json",
        "@id": identifier,
        "protocol": "http://iiif.io/api/image",
        "profile": ["http://iiif.io/api/image/2/level0.json"],
        "width": width,
        "height": height,
        "sizes": [dict(zip(("width", "height"), coarsest.size))],
        "tiles": [{"width": TILE, "scaleFactors": list(factors)}],
    }


def check_factors(factors: tuple[int, ...]) -> tuple[int, ...]:
    steps = zip(factors, factors[1:])
    if any(coarse % fine or coarse <= fine for fine, coarse in steps):
        raise SystemExit("scale factors must increase, each a multiple of the one before")
    return factors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("scan", type=Path, help="uncompressed TIFF, the roll running down the image")
    parser.add_argument("out", type=Path, help="directory to write the tiles into")
    parser.add_argument("--id", help="the @id of the image service (default: the output directory)")
    parser.add_argument("--factors", type=int, nargs="+", default=DEFAULT_FACTORS,
                        help="scale factors to cut, finest first")
    parser.add_argument("--grey", action="store_true",
                        help="keep one channel of a scan whose channels are copies of each other")
    args = parser.parse_args(argv)

    factors = check_factors(tuple(args.factors))
    scan = read_scan(args.scan, args.grey)
    full = (scan.shape[1], scan.shape[0])

    count = 0
    for level in levels(scan, factors):
        for region, pixels in tiles_of(level, full):
            write_tile(args.out, region, pixels)
            count += 1
        print(f"scale {level.factor}: {level.size[0]} x {level.size[1]} px, {count} tiles so far")

    write_full(args.out, level)
    service = info(args.id or str(args.out), full, factors, level)
    (args.out / "info.json").write_text(json.dumps(service, indent=2) + "\n")
    print(f"wrote {args.out / 'info.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
